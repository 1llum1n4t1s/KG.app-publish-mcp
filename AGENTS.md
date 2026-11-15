# Repository Working Agreement

This repository provides the `@kagayoi/app-publish-mcp` stdio MCP server. Read
[`DESIGN.md`](DESIGN.md) before changing runtime boundaries or authentication.

## Structure

- `src/index.ts` composes the MCP server, registers tools, prompts, and resources,
  and owns the stdio transport.
- `src/cli.ts` selects normal server startup or the Google OAuth command.
- `src/i18n.ts` and `src/locales/<tag>.json` hold the human-readable messages
  (CLI output, startup diagnostics, the Google OAuth browser page) in nine
  languages: ja, en, zh-CN, zh-TW, ko, es, fr, de, pt-BR.
- `src/apple/` and `src/google/` contain platform clients and declarative tool
  registries. Keep API transport details in `client.ts` and MCP schemas/handlers
  in `tools.ts`. Both registries use the shared `ToolDef<C>` type from
  `src/tool-def.ts`.
- `test/` contains automated Bun coverage for tool contracts, authentication,
  error handling, and platform client behavior. `test/fixtures/` holds the
  review/upload fixtures and the Bun network guard (`network-guard.mjs`).
- `scripts/` holds the release helpers: `verify-bun-package.ps1` (archive
  verification), `verify-packaged-bun.mjs` (real-install execution check) and
  the native npm publisher.
- `server.json`, `smithery.yaml`, `glama.json`, and `llms.txt` describe the
  published server. `.github/workflows/npm-publish.yml` is the npm release path.

## Development rules

- Use Bun with the committed `bun.lock` (text lockfile, the source of truth for
  dependencies; do not manage `package-lock.json`) and preserve the
  `package.json` engine requirement (`bun >=1.4.4`). The product runs only on
  Bun: users start it with `bun x --bun @kagayoi/app-publish-mcp@latest`, and the
  CLI shebang is `#!/usr/bin/env bun`. Node.js and `npx` are not supported. Source is
  strict ESM TypeScript; generated `dist/` files remain untracked.
  Dependency validation and the publication workflow both use Bun 1.4.4.
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
- `README.md` (English) is the source. When it changes, update `README.ja.md`,
  `README.zh-CN.md`, `README.zh-TW.md`, `README.ko.md`, `README.es.md`,
  `README.fr.md`, `README.de.md` and `README.pt-BR.md` in the same change, and
  keep the nine-language switch line on the first line of every file. Do not
  translate commands, paths, configuration keys, environment variable names,
  product names, URLs or the package name.
- MCP tool names, descriptions, input schema text and errors returned to the AI
  assistant stay in English. When adding human-readable text (CLI output,
  startup or error messages shown to a person, the OAuth browser page), add it
  to every `src/locales/<tag>.json` dictionary (same keys and `{name}`
  placeholders) and run `test/localization.test.ts`. Language is resolved by
  `APP_PUBLISH_MCP_LANGUAGE` → `LC_ALL` → `LC_MESSAGES` → `LANG` → the OS
  locale → English; the browser page uses `Accept-Language`. Tests that assert
  English messages set `APP_PUBLISH_MCP_LANGUAGE=en`.
- Keep `package.json`, `server.json`, and release branch versions synchronized
  for a release. The publish workflow requires
  `release/<version>` to match `package.json` and publishes using GitHub OIDC Trusted Publishing. The publication workflow runs install, build, pack, verification and OIDC publication
  on GitHub-hosted ubuntu-latest to meet npm provenance requirements. Normal
  dependency validation also runs on GitHub-hosted ubuntu-latest.

## Required validation

Run from the repository root:

```powershell
bun install --frozen-lockfile --no-save
bun --no-env-file --no-install --bun run lint
bun --no-env-file --no-install run test
bun --no-env-file --no-install --bun run build
bun --no-env-file --no-install run test:stdio
bun pm pack --quiet --destination <dedicated-absolute-work-path>
pwsh -NoProfile -File scripts/verify-bun-package.ps1 -PackageFile <tarball>
bun scripts/verify-packaged-bun.mjs <tarball> <empty-work-directory>
git diff --check
```

All scripts, development, tests and dependency CI run on Bun.

The pack and verification steps run after the build (`test:stdio` builds). Keep the
tarball and work directories outside the repository and clean them afterwards.

`verify-packaged-bun.mjs` installs the tarball into an empty directory with
`bun add`, starts the `node_modules/.bin/app-publish-mcp` shim over stdio, matches
the discovered tools to the README Features table, and runs the Apple review
fixture under `test/fixtures/network-guard.mjs` (outbound network blocked). It
resolves dependencies from the registry, so versions can differ from
`bun.lock`. Dependency CI (`.github/workflows/dependency-validation.yml`) runs
the same checks. Publish only the verified tarball, as the
[publication workflow](.github/workflows/npm-publish.yml) does; the artifact
checks and rationale are described in
[DESIGN.md](DESIGN.md#package-publication-boundary).

For runtime or protocol changes, add or update automated coverage, initialize the
built stdio server with an MCP client, and exercise the affected tool path against
an appropriately authorized account or a safe fixture. `bun run test:stdio`
rebuilds and tests Apple review submission and response-loss retries through an
MCP client using `test/fixtures/apple-review.mjs`, without live credentials or
network access. It also covers screenshot upload bytes, Google product pricing,
and saved-token fallback using `test/fixtures/upload-pricing.mjs`.
It is separate from `bun run test`; extend coverage for other
affected paths as needed. Preserve the submission ownership and failure
boundaries described in [DESIGN.md](DESIGN.md#apple-review-submission).

For publisher changes, also run `pwsh -NoProfile -File scripts/Test-NpmPublisher.ps1 -WorkDirectory <dedicated-absolute-work-path>`.
The C# publisher is compiled in memory by PowerShell 7.4+ without a .NET SDK or
npm publication runtime. Tests use fixture tarballs, mocked HTTP/cosign and a
localhost redirect check without live credentials. Use an empty work directory
and clean its fixture files afterwards. Only a 404 version lookup permits a new
publication attempt; unknown PUT results must not be retried automatically.
