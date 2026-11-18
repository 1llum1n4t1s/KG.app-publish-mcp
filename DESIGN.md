# System Design

## Purpose

`@kagayoi/app-publish-mcp` exposes App Store Connect and Google Play Console
operations through a single Model Context Protocol server. It runs over stdio,
is distributed through the npm registry as a Bun executable (`#!/usr/bin/env bun`), and lets an MCP client use either platform
independently according to the credentials available at process startup.

## Components and boundaries

| Component | Responsibility | Boundary |
| --- | --- | --- |
| `src/cli.ts` | Selects MCP server startup or `auth google` | Contains no platform API logic |
| `src/index.ts` | Builds the MCP server; registers tools, two prompts, and two resources; adapts results and errors to MCP content | Owns stdio and common MCP behavior |
| `src/tool-def.ts` | Declares the `ToolDef<C>` shape shared by both platform registries | Type only; no runtime code |
| `src/apple/tools.ts` / `src/google/tools.ts` | Define Zod input schemas, tool names/descriptions, and operation handlers | Handlers depend on their platform client rather than transport or credentials |
| `src/apple/client.ts` | Creates short-lived ES256 App Store Connect JWTs and performs Apple API requests/uploads | Reads the configured `.p8` file locally; does not own MCP formatting |
| `src/apple/compact.ts` | Shapes Apple results before serialization: drops unusable JSON:API `links` and masks `demoAccountPassword` in results and error text | Pure functions; handlers still see raw responses, and Google results never pass through it |
| `src/google/client.ts` | Configures the Android Publisher v3 client and implements Google API operations | Accepts a service account or OAuth refresh credentials |
| `src/google/errors.ts` | Provides the not-configured message and formats Google API failures (HTTP status plus a selected subset of the response payload) | Pure helpers; no API calls |
| `src/auth.ts` | Runs interactive Google OAuth through a localhost callback and stores the refresh credentials | Writes only to the per-user `~/.app-publish-mcp/google.json` store |
| `src/i18n.ts` + `src/locales/<tag>.json` | Resolves the display language and returns human-readable messages in nine languages (CLI output, startup diagnostics, the OAuth browser page) | Excludes MCP tool names, descriptions, schemas and errors returned to the AI assistant, which stay English; store-listing `locale`/`languageCode` arguments are API data, not UI language |
| Package and registry metadata | Defines npm execution and discovery through MCP registries/marketplaces | The npm tarball contains compiled `dist` (including `dist/locales`), `package.json`, `LICENSE`, `README.md` and the translated `README.<lang>.md` files |

The tool registries currently provide 77 Apple tools and 47 Google tools. The
server also exposes `app_release_checklist` and `app_store_optimization` prompts,
plus `app-publish://config` and `app-publish://supported-platforms` resources.

## Runtime data flow

1. An MCP host starts `app-publish-mcp` (through `bun x --bun @kagayoi/app-publish-mcp@latest`; `bunx` is an alias of `bun x`) and communicates
   with it over stdin/stdout.
2. Module initialization reads package metadata and credential-related environment
   variables, then creates the available platform clients.
3. Every declared tool is registered. The MCP SDK validates its arguments from
   the tool's Zod schema before the handler calls the platform client.
4. The client reads any referenced local upload or key file and calls the official
   Apple or Google API over HTTPS.
5. Successful values are serialized as indented JSON text in MCP content. Apple
   results first pass through `compactJsonApi` (`src/apple/compact.ts`); Google
   results are serialized as returned. Thrown
   errors are converted to text content with `isError: true`; startup diagnostics
   go to stderr so stdout remains valid MCP traffic.

Google Play edit-scoped operations pass an `editId` through tool calls: callers
create an edit, perform mutations, optionally validate it, and explicitly commit
or delete it. Review and monetization operations use their corresponding direct
Android Publisher endpoints.

### Apple review submission

`apple_submit_for_review` has two ownership paths. Without `submissionId`, it
creates a review submission and attaches the requested app version. If attachment
fails, it attempts to cancel only that newly created incomplete submission and
reports the submission ID and cleanup result.

With `submissionId`, it checks the existing submission's app, platform, state,
and membership of the requested version before any mutation. Item pagination
accepts only the same submission's items endpoint on Apple's API origin and
rejects cycles. A `READY_FOR_REVIEW` draft is submitted with all existing items
intact; a matching `WAITING_FOR_REVIEW` or `IN_REVIEW` submission is returned
without resubmitting. Other states or mismatches fail without changing the draft.

New submissions and validated ready drafts use a `submitted: true` PATCH.
Failure at this boundary leaves
the submission intact and reports its ID for inspection and reuse: a lost response
does not prove Apple rejected the request. This deliberately limits automatic
cleanup to attachment failure and avoids canceling an accepted review. User
recovery instructions are in [README.md](README.md#submit-an-ios-app-update).

### Display language

Human-readable text is resolved per call so tests can switch languages. The CLI
and startup diagnostics use `APP_PUBLISH_MCP_LANGUAGE`, then `LC_ALL`,
`LC_MESSAGES`, `LANG` (empty, `C` and `POSIX` are skipped), the OS locale, then
English. The OAuth callback page uses the browser's `Accept-Language`, then
English. A missing key falls back to English and then to the key itself. Every
dictionary must have the same keys and placeholders; `test/localization.test.ts`
enforces this. User-facing language selection is documented in
[README.md](README.md#3-google-credentials).

## Authentication model

- Apple is connected only when `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, and
  `APPLE_P8_PATH` are all present. JWTs live for 19 minutes (App Store Connect
  rejects exactly 20) and are reused until one minute before expiration.
  `APPLE_VENDOR_NUMBER` is optional.
- Google chooses credentials in this order: `GOOGLE_SERVICE_ACCOUNT_PATH`; the
  complete `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` +
  `GOOGLE_REFRESH_TOKEN` set; then the saved per-user OAuth token file. A partial
  OAuth environment configuration still permits saved-token fallback. Missing,
  unreadable, malformed, or incomplete saved tokens are treated as unavailable.
- Missing credentials do not remove tools from discovery. Invoking an
  unconfigured platform tool returns an MCP error, allowing one installation to
  advertise both platforms while configuring only one.
- The configuration resource reports connection state, authentication method,
  masked Apple identifiers, and tool counts; it does not return private keys or
  token values. Connection state means a client was configured, not that an
  upstream authentication check succeeded.

## Package publication boundary

`.github/workflows/npm-publish.yml` runs on pushes of a lightweight tag `vX.Y.Z` on a `main` commit, or on manual
dispatch with an existing tag as `--ref` (re-run only). It unconditionally requires a tag ref, the strict
`vX.Y.Z` form, a lightweight tag that points at the run's commit, a commit that is an
ancestor of the default branch, and a tag equal to `v<package.json version>`; then it installs
the `bun.lock` dependencies and builds before packaging. The native publisher repeats the
tag/version check (`GITHUB_REF_TYPE == tag` and `GITHUB_REF_NAME == v<version>`).

The workflow runs `bun pm pack` and passes the tarball to
`scripts/verify-bun-package.ps1`. The verifier checks archived entry types,
names, duplicates, expected file bytes, the CLI executable mode and bun shebang, manifest
fields, version consistency and the archive SHA-512. Publication uses that same
verified tarball rather than repacking the working tree.

The workflow checks out the exact release commit with native git and a temporary
HTTP authorization header. The workflow downloads the official Bun 1.4.4 Linux
archive and checks its pinned SHA-256 before installation. Checkout and
toolchain setup do not use Node-based Actions. `bun.lock` (text lockfile) is the
dependency source; `package-lock.json` is no longer maintained.

Publication keeps npm Trusted Publishing (GitHub OIDC). The npm-publish.yml
workflow runs install, build, pack, verification and publication on GitHub-hosted
ubuntu-latest to meet the cloud-hosted build requirement for npm provenance.
Normal dependency validation also runs on GitHub-hosted ubuntu-latest with the same
pinned Bun: it runs lint, tests, the stdio test, `bun pm pack` with
`scripts/verify-bun-package.ps1`, and `scripts/verify-packaged-bun.mjs`, which installs
the tarball with `bun add` and starts the `.bin` shim as a user would, compares the
discovered tools with the README, and runs the Apple review fixture with outbound
network blocked by `test/fixtures/network-guard.mjs`. The guard cannot block `Bun.fetch`,
UDP, WebSocket or `node-fetch` (Bun replaces it with its built-in fetch); the product's own
paths (Apple `fetch`, Google's authenticated gaxios 8.x) are blocked, but the
unauthenticated gaxios 7.x branch under googleapis-common would bypass it. That install resolves ranges from the registry,
so its dependency versions can differ from `bun.lock`. The verified
SHA-512 and manifest are checked before publishing the same archive without
repacking. No saved npm publication token is used.
The native C# publisher exchanges GitHub OIDC for a package-specific short-lived
token and signs SLSA v1 provenance with cosign 3.1.4. Its fixed binary hash,
upstream signature, signed subject, workflow identity, issuer and archive digest
are checked before upload. Existing versions require identical integrity and
valid npm registry provenance metadata. A successful PUT header means npm
acceptance without parsing its body or waiting for public propagation. Unknown
outcomes fail without retrying PUT. Source-hash-specific namespaces preserve
the PowerShell source reload boundary. The workflow filename and manual (re-run) condition remains unchanged and the release trigger is the version tag,
so the existing npm Trusted Publisher registration stays applicable.

Release validation commands and version synchronization requirements are defined
in [`AGENTS.md`](AGENTS.md); the publish workflow itself runs dependency
installation, compilation, and artifact verification, not the full local
validation suite.

## Invariants

- Tool names are stable public API. Each tool belongs to exactly one exported
  platform registry, and common registration behavior remains centralized.
- MCP stdout contains protocol messages only.
- Text returned to the AI assistant (tool metadata and errors) is English;
  localization applies only to text shown to a person.
- Secrets and generated output stay outside Git: `dist/`, `.env`, `.p8` files,
  service-account key files, and the per-user OAuth token store are not source.
- The npm package version is the runtime server version.
- Local file uploads are caller-authorized inputs. Apple screenshot reservations
  return upload-operation URLs, methods, headers, and byte ranges; the client
  sends those ranges to the returned URLs without adding the App Store Connect
  JWT. The handler reads the screenshot once and reuses those bytes for the
  reservation size, every upload operation, and the committed checksum and upload
  status through the API.
  Google uploads use the Android Publisher client.

## Adopted design decisions

- **stdio plus npm registry / `bun x` distribution (Bun only):** works with MCP hosts without running a
  persistent web service. Each host owns process lifetime and credentials.
- **Declarative Zod-backed tool registries:** keeps discovery metadata, validation,
  and handlers together while sharing registration/error handling. The trade-off
  is that the two large registry files require deliberate category organization.
- **Thin platform clients over official APIs:** preserves platform semantics and
  avoids browser automation. Platform differences, including Google's edit
  lifecycle and Apple's upload operations, remain visible to callers.
  Google imports the Android Publisher API factory directly so stdio startup
  does not load unrelated Google API families. Authentication remains configured
  on the API client rather than through global Google SDK options.
- **Multiple Google authentication modes:** service accounts support automation,
  while OAuth supports user-scoped access. The saved-token convenience introduces
  local credential state, so it is stored outside the repository with owner-only
  permissions where supported.
- **Textual JSON tool results:** gives MCP clients a uniform representation across
  heterogeneous upstream responses. Clients must parse text when they need
  structured post-processing.
- **Compacted Apple (JSON:API) results:** App Store Connect attaches `links.self`
  to every resource and `links.{self,related}` to every relationship, which no
  tool accepts as input; they made list responses several times larger and only
  consumed the assistant's context. Common registration drops those per-resource
  and per-relationship `links` (in `data` and `included`) and relationships left
  empty. It keeps resource `type`/`id`/`attributes`, relationship linkage
  (`data`) and `meta`, and the top-level `links` and `meta` (paging such as
  `links.next`). Results that are not recognizably JSON:API, and all Google
  results, are not touched. The same shaping step masks `demoAccountPassword`
  (any non-empty value becomes `<redacted>`, empty/null stay visible, in every
  response path and in echoed error text) so the reviewer demo password never
  enters the assistant's conversation. Handlers see the raw response, so internal paging
  (for example following `links.next`) is unaffected.

Operational commands and contribution constraints live in [`AGENTS.md`](AGENTS.md);
user installation and usage remain in [`README.md`](README.md).
