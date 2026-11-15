#!/usr/bin/env node
import { tCli } from './i18n.js';

/**
 * CLI entry point.
 *   app-publish-mcp              → starts MCP server (stdio)
 *   app-publish-mcp auth google  → interactive OAuth flow
 */

const args = process.argv.slice(2);

if (args[0] === 'auth') {
  import('./auth.js').then((m) => {
    m.runAuthCli().catch((err: Error) => {
      console.error(tCli('cli.errorPrefix'), err.message);
      process.exit(1);
    });
  });
} else {
  import('./index.js');
}
