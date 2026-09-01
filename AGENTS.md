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
  the `package.json` engine requirement (`node >=18`). Source is strict ESM
  TypeScript; generated `dist/` files remain untracked.
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
  `release/<version>` to match `package.json` and publishes with `NPM_TOKEN`.

## Required validation

Run from the repository root:

```powershell
npm ci
npm run lint
npm test
npm run build
npm pack --dry-run
git diff --check
```

For runtime or protocol changes, add or update automated coverage, initialize the
built stdio server with an MCP client, and exercise the affected tool path against
an appropriately authorized account or a safe fixture.
