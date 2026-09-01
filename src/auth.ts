#!/usr/bin/env node
/**
 * Interactive OAuth flow for Google Play Console.
 *
 * Usage:
 *   npx app-publish-mcp auth google
 *
 * Opens browser → user logs in → tokens saved to ~/.app-publish-mcp/google.json
 * The MCP server auto-loads this file on startup.
 */

import { OAuth2Client } from 'google-auth-library';
import { createServer } from 'http';
import { execFile } from 'child_process';
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.app-publish-mcp');
const GOOGLE_TOKEN_PATH = join(CONFIG_DIR, 'google.json');
const GOOGLE_OAUTH_CALLBACK_HOST = '127.0.0.1';
const GOOGLE_OAUTH_CALLBACK_PORT = 19847;
const GOOGLE_OAUTH_CALLBACK_ORIGIN = `http://${GOOGLE_OAUTH_CALLBACK_HOST}:${GOOGLE_OAUTH_CALLBACK_PORT}`;

// Embedded OAuth client — registered as "Desktop app" type so no client secret leak risk
const EMBEDDED_CLIENT_ID = ''; // will be set by user or embedded
const SCOPES = ['https://www.googleapis.com/auth/androidpublisher'];

interface TokenStore {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  savedAt: string;
}

export function getGoogleTokenPath(): string {
  return GOOGLE_TOKEN_PATH;
}

export function parseSavedGoogleToken(raw: string): TokenStore | null {
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return null;
    const token = candidate as Record<string, unknown>;
    if (
      typeof token.clientId !== 'string' || token.clientId.trim() === '' ||
      typeof token.clientSecret !== 'string' || token.clientSecret.trim() === '' ||
      typeof token.refreshToken !== 'string' || token.refreshToken.trim() === ''
    ) {
      return null;
    }
    return {
      clientId: token.clientId,
      clientSecret: token.clientSecret,
      refreshToken: token.refreshToken,
      savedAt: typeof token.savedAt === 'string' ? token.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function loadSavedGoogleToken(): TokenStore | null {
  if (!existsSync(GOOGLE_TOKEN_PATH)) return null;
  try {
    return parseSavedGoogleToken(readFileSync(GOOGLE_TOKEN_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function saveToken(token: TokenStore): void {
  // These are long-lived OAuth credentials — keep them owner-only.
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(GOOGLE_TOKEN_PATH, JSON.stringify(token, null, 2), { mode: 0o600 });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getBrowserOpenCommand(
  url: string,
  platform: NodeJS.Platform = process.platform,
): { file: string; args: string[] } {
  if (platform === 'darwin') return { file: 'open', args: [url] };
  if (platform === 'win32') {
    return { file: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] };
  }
  return { file: 'xdg-open', args: [url] };
}

/** Open a URL in the user's default browser without passing it through a shell. */
function openBrowser(url: string): void {
  const command = getBrowserOpenCommand(url);
  const child = execFile(command.file, command.args);
  child.once('error', err => {
    console.error(`Could not open the browser automatically: ${err.message}`);
  });
}

export interface OAuthCallbackOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
  openBrowser?: (url: string) => void;
  log?: (message: string) => void;
  onListening?: (address: { host: string; port: number }) => void;
}

export function waitForOAuthCode(
  authUrl: string,
  expectedState: string,
  options: OAuthCallbackOptions = {},
): Promise<string> {
  const host = options.host ?? GOOGLE_OAUTH_CALLBACK_HOST;
  const port = options.port ?? GOOGLE_OAUTH_CALLBACK_PORT;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const launchBrowser = options.openBrowser ?? openBrowser;
  const log = options.log ?? console.log;

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://${host}:${port}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }

      if (url.searchParams.get('state') !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Invalid OAuth state');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Authentication failed</h1><p>${escapeHtml(error)}</p><p>You can close this tab.</p>`);
        finish(new Error(`Auth failed: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end('Missing code');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0a0a0a;color:#fff">
          <div style="text-align:center">
            <h1 style="font-size:48px;margin-bottom:8px">✓</h1>
            <h2>Authentication successful</h2>
            <p style="color:#888">You can close this tab.</p>
          </div>
        </body></html>
      `);
      finish(undefined, code);
    });

    const finish = (error?: Error, code?: string): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (server.listening) server.close();
      if (error) reject(error);
      else resolve(code!);
    };

    server.once('error', err => {
      finish(new Error(`OAuth callback server failed: ${err.message}`, { cause: err }));
    });

    timer = setTimeout(() => {
      finish(new Error(`Authentication timed out (${Math.ceil(timeoutMs / 60_000)} min)`));
    }, timeoutMs);

    server.listen(port, host, () => {
      const address = server.address();
      const listeningPort = typeof address === 'object' && address ? address.port : port;
      options.onListening?.({ host, port: listeningPort });

      log('\n🔐 Opening browser for Google authentication...\n');
      log(`If the browser doesn't open, visit:\n${authUrl}\n`);

      try {
        launchBrowser(authUrl);
      } catch (err) {
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}

async function authGoogle(clientId: string, clientSecret: string): Promise<void> {
  const oauth2 = new OAuth2Client(clientId, clientSecret, `${GOOGLE_OAUTH_CALLBACK_ORIGIN}/callback`);
  const state = randomBytes(32).toString('base64url');

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });

  const code = await waitForOAuthCode(authUrl, state);

  // Exchange code for tokens
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. Try revoking app access at https://myaccount.google.com/permissions and retry.');
  }

  saveToken({
    clientId,
    clientSecret,
    refreshToken: tokens.refresh_token,
    savedAt: new Date().toISOString(),
  });

  console.log(`✅ Google credentials saved to ${GOOGLE_TOKEN_PATH}`);
  console.log('   The MCP server will auto-load these on next startup.');
}

// ── CLI entry ──
async function main() {
  const args = process.argv.slice(2);

  if (args[0] !== 'auth') {
    // Not an auth command — this file should not be the entry point for MCP server
    console.error('Usage: app-publish-mcp auth google');
    console.error('       app-publish-mcp auth google --client-id=XXX --client-secret=YYY');
    process.exit(1);
  }

  const target = args[1];

  if (target === 'google') {
    let clientId = '';
    let clientSecret = '';

    // Parse --client-id and --client-secret from args
    for (const arg of args) {
      if (arg.startsWith('--client-id=')) clientId = arg.split('=')[1];
      if (arg.startsWith('--client-secret=')) clientSecret = arg.split('=')[1];
    }

    // Check env vars as fallback
    if (!clientId) clientId = process.env.GOOGLE_CLIENT_ID || '';
    if (!clientSecret) clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      console.error('❌ OAuth Client ID and Secret required.\n');
      console.error('Get them from: Google Cloud Console → APIs & Services → Credentials → Create OAuth Client ID (Desktop app)\n');
      console.error('Then run:');
      console.error('  app-publish-mcp auth google --client-id=YOUR_ID --client-secret=YOUR_SECRET\n');
      console.error('Or set env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
      process.exit(1);
    }

    await authGoogle(clientId, clientSecret);
  } else {
    console.error(`Unknown auth target: ${target}`);
    console.error('Available: google');
    process.exit(1);
  }
}

// Export for CLI usage (called from cli.ts)
export { main as runAuthCli };
