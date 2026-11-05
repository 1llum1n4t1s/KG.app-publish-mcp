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
- `test/` contains automated Bun and Node compatibility coverage for tool contracts,
  authentication, error handling, and platform client behavior.
- `server.json`, `smithery.yaml`, `glama.json`, and `llms.txt` describe the
  published server. `.github/workflows/npm-publish.yml` is the npm release path.

## Development rules

- Use Bun with the committed `package-lock.json` and preserve compatibility with
  the `package.json` engine requirement (`node >=22`). Source is strict ESM
  TypeScript; generated `dist/` files remain untracked.
  The Node compatibility path and dependency CI use Node 26.13.0 and npm 12.2.1;
  the publication workflow builds and packs with Bun 1.4.4.
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
bun install --frozen-lockfile --no-save
bun --no-env-file --no-install --bun run lint
bun --no-env-file --no-install run test
bun --no-env-file --no-install --bun run build
bun --no-env-file --no-install run test:stdio
git diff --check
```

Default start, development and test scripts use Bun. Preserve the public Node.js
CLI contract; dependency CI runs `npm run test:node` and `npm run test:stdio:node`
with the actual Node runtime for compatibility coverage.

For release validation, also run `npm pack --json > pack-result.json` followed by
`node scripts/verify-package.mjs` after building. The verifier requires `tar` on
PATH and the pack result and tarball in the repository root. Publish only the
verified tarball, as the [publication workflow](.github/workflows/npm-publish.yml)
does; the artifact checks and rationale are described in
[DESIGN.md](DESIGN.md#package-publication-boundary).

The release workflow packs with Bun and validates the resulting tarball using
`scripts/verify-bun-package.ps1`. The npm pack verifier remains available for
checking the Node/npm compatibility path.

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

For publisher changes, also run `pwsh -NoProfile -File scripts/Test-NpmPublisher.ps1 -WorkDirectory <dedicated-absolute-work-path>`.
The C# publisher is compiled in memory by PowerShell 7.4+ without a .NET SDK or
npm publication runtime. Tests use fixture tarballs, mocked HTTP/cosign and a
localhost redirect check without live credentials. Use an empty work directory
and clean its fixture files afterwards. Only a 404 version lookup permits a new
publication attempt; unknown PUT results must not be retried automatically.
