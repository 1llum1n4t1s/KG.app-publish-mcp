# System Design

## Purpose

`@kagayoi/app-publish-mcp` exposes App Store Connect and Google Play Console
operations through a single Model Context Protocol server. It runs over stdio,
is distributed as an npm executable, and lets an MCP client use either platform
independently according to the credentials available at process startup.

## Components and boundaries

| Component | Responsibility | Boundary |
| --- | --- | --- |
| `src/cli.ts` | Selects MCP server startup or `auth google` | Contains no platform API logic |
| `src/index.ts` | Builds the MCP server; registers tools, two prompts, and two resources; adapts results and errors to MCP content | Owns stdio and common MCP behavior |
| `src/apple/tools.ts` / `src/google/tools.ts` | Define Zod input schemas, tool names/descriptions, and operation handlers | Handlers depend on their platform client rather than transport or credentials |
| `src/apple/client.ts` | Creates short-lived ES256 App Store Connect JWTs and performs Apple API requests/uploads | Reads the configured `.p8` file locally; does not own MCP formatting |
| `src/google/client.ts` | Configures the Android Publisher v3 client and implements Google API operations | Accepts a service account or OAuth refresh credentials |
| `src/auth.ts` | Runs interactive Google OAuth through a localhost callback and stores the refresh credentials | Writes only to the per-user `~/.app-publish-mcp/google.json` store |
| Package and registry metadata | Defines npm execution and discovery through MCP registries/marketplaces | Published artifacts contain compiled `dist`, package metadata, the license, and README documents |

The tool registries currently provide 71 Apple tools and 47 Google tools. The
server also exposes `app_release_checklist` and `app_store_optimization` prompts,
plus `app-publish://config` and `app-publish://supported-platforms` resources.

## Runtime data flow

1. An MCP host starts `app-publish-mcp` (normally through `npx`) and communicates
   with it over stdin/stdout.
2. Module initialization reads package metadata and credential-related environment
   variables, then creates the available platform clients.
3. Every declared tool is registered. The MCP SDK validates its arguments from
   the tool's Zod schema before the handler calls the platform client.
4. The client reads any referenced local upload or key file and calls the official
   Apple or Google API over HTTPS.
5. Successful values are serialized as indented JSON text in MCP content. Thrown
   errors are converted to text content with `isError: true`; startup diagnostics
   go to stderr so stdout remains valid MCP traffic.

Google Play edit-scoped operations pass an `editId` through tool calls: callers
create an edit, perform mutations, optionally validate it, and explicitly commit
or delete it. Review and monetization operations use their corresponding direct
Android Publisher endpoints.

## Authentication model

- Apple is connected only when `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, and
  `APPLE_P8_PATH` are all present. JWTs live for 20 minutes and are reused until
  one minute before expiration. `APPLE_VENDOR_NUMBER` is optional.
- Google chooses credentials in this order: `GOOGLE_SERVICE_ACCOUNT_PATH`; the
  complete `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` +
  `GOOGLE_REFRESH_TOKEN` set; then the saved per-user OAuth token file.
- Missing credentials do not remove tools from discovery. Invoking an
  unconfigured platform tool returns an MCP error, allowing one installation to
  advertise both platforms while configuring only one.
- The configuration resource reports connection state, authentication method,
  masked Apple identifiers, and tool counts; it does not return private keys or
  token values.

## Invariants

- Tool names are stable public API. Each tool belongs to exactly one exported
  platform registry, and common registration behavior remains centralized.
- MCP stdout contains protocol messages only.
- Secrets and generated output stay outside Git: `dist/`, `.env`, `.p8` files,
  service-account key files, and the per-user OAuth token store are not source.
- The npm package version is the runtime server version. Release branches must be
  named `release/<package.json version>`; CI builds before publishing.
- Local file uploads are caller-authorized inputs and are sent only to the chosen
  platform API endpoint.

## Adopted design decisions

- **stdio plus npm/npx distribution:** works with MCP hosts without running a
  persistent web service. Each host owns process lifetime and credentials.
- **Declarative Zod-backed tool registries:** keeps discovery metadata, validation,
  and handlers together while sharing registration/error handling. The trade-off
  is that the two large registry files require deliberate category organization.
- **Thin platform clients over official APIs:** preserves platform semantics and
  avoids browser automation. Platform differences, including Google's edit
  lifecycle and Apple's upload operations, remain visible to callers.
- **Multiple Google authentication modes:** service accounts support automation,
  while OAuth supports user-scoped access. The saved-token convenience introduces
  local credential state, so it is stored outside the repository with owner-only
  permissions where supported.
- **Textual JSON tool results:** gives MCP clients a uniform representation across
  heterogeneous upstream responses. Clients must parse text when they need
  structured post-processing.

Operational commands and contribution constraints live in [`AGENTS.md`](AGENTS.md);
user installation and usage remain in [`README.md`](README.md).
