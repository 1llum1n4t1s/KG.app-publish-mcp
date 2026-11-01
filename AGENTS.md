# Repository Working Agreement

This repository provides the `@kagayoi/app-publish-mcp` stdio MCP server. Read
[`DESIGN.md`](DESIGN.md) before changing runtime boundaries or authentication.

## Structure

- `src/index.ts` composes the MCP server, registers tools, prompts, and resources,
  and owns the stdio transport.
- `src/cli.ts` selects normal server startup or the Google OAuth command.
- `src/apple/` and `src/google/` contain platform clients and declarative tool
  registries. Keep API transport details in `client.ts` and MCP schemas/handlers
  in `tools.ts`.
- `test/` contains the automated Node test-runner coverage for tool contracts,
  authentication, error handling, and platform client behavior.
- `server.json`, `smithery.yaml`, `glama.json`, and `llms.txt` describe the
  published server. `.github/workflows/npm-publish.yml` is the npm release path.

## Development rules

- Use the committed `package-lock.json` with npm and preserve compatibility with
  the `package.json` engine requirement (`node >=22`). Source is strict ESM
  TypeScript; generated `dist/` files remain untracked.
  Development and publication use Node 26 and npm 12.2.1; dependency CI also
  validates Node 22 to cover the supported minimum major.
- Keep MCP stdout reserved for protocol traffic. Send startup and diagnostic
  messages to stderr.
- Add platform operations as `ToolDef` entries and include them in the matching
  exported `appleTools` or `googleTools` array. Let `src/index.ts` perform common
  registration, JSON result formatting, and error conversion.
- Preserve credential precedence and partial-configuration behavior documented in
  `DESIGN.md`. Never commit `.p8` keys, service-account JSON, OAuth tokens, or
  credential values. Use environment variables or the existing per-user Google
  token store.
- When a user-visible tool, prompt, resource, configuration variable, package
  name, or install command changes, update `README.md` and the applicable
  published metadata in the same change. Keep README content user-focused.
- Keep `package.json`, `package-lock.json`, `server.json`, and release branch
  versions synchronized for a release. The publish workflow requires
  `release/<version>` to match `package.json` and publishes through npm Trusted
  Publishing with GitHub OIDC.

## Required validation

Run from the repository root:

```powershell
npm ci
npm run lint
npm test
npm run build
npm run test:stdio
npm pack --dry-run
git diff --check
```

For release validation, also run `npm pack --json > pack-result.json` followed by
`node scripts/verify-package.mjs` after building. The verifier requires `tar` on
PATH and the pack result and tarball in the repository root. Publish only the
verified tarball, as the [publication workflow](.github/workflows/npm-publish.yml)
does; the artifact checks and rationale are described in
[DESIGN.md](DESIGN.md#package-publication-boundary).

For runtime or protocol changes, add or update automated coverage, initialize the
built stdio server with an MCP client, and exercise the affected tool path against
an appropriately authorized account or a safe fixture. `npm run test:stdio`
rebuilds and tests Apple review submission and response-loss retries through an
MCP client using `test/fixtures/apple-review.mjs`, without live credentials or
network access. It also covers screenshot upload bytes, Google product pricing,
and saved-token fallback using `test/fixtures/upload-pricing.mjs`.
It is separate from `npm test`; extend coverage for other
affected paths as needed. Preserve the submission ownership and failure
boundaries described in [DESIGN.md](DESIGN.md#apple-review-submission).
