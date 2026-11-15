import jwt from 'jsonwebtoken';
import fs from 'fs';

const APPLE_API_TIMEOUT_MS = 60_000;
const APPLE_UPLOAD_TIMEOUT_MS = 10 * 60_000;

interface AppleConfig {
  keyId: string;
  issuerId: string;
  p8Path: string;
  vendorNumber?: string;
}

export class AppleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly responseBody: string,
  ) {
    super(message);
    this.name = 'AppleApiError';
  }
}

export class AppleClient {
  private config: AppleConfig;
  private baseUrl = 'https://api.appstoreconnect.apple.com/v1';
  private token: string | null = null;
  private tokenExp = 0;

  constructor(config: AppleConfig) {
    this.config = config;
  }

  private getToken(): string {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && now < this.tokenExp - 60) return this.token;

    const privateKey = fs.readFileSync(this.config.p8Path, 'utf8');
    // App Store Connect はトークン寿命の上限を20分としているが、ちょうど20分(exp = iat + 1200)は
    // 401 NOT_AUTHORIZED で拒否される（2026-11-12 実測。19分は200）。時計のずれも考慮して上限未満の19分にする。
    const lifetimeSeconds = 19 * 60;
    const payload = {
      iss: this.config.issuerId,
      iat: now,
      exp: now + lifetimeSeconds,
      aud: 'appstoreconnect-v1',
    };

    this.token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: this.config.keyId, typ: 'JWT' },
    });
    this.tokenExp = now + lifetimeSeconds;
    return this.token;
  }

  async request<T = any>(
    path: string,
    options: {
      method?: string;
      body?: any;
      params?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const { method = 'GET', body, params } = options;
    let url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(APPLE_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AppleApiError(
        `Apple API ${method} ${path} → ${res.status}: ${text}`,
        res.status,
        method,
        path,
        text,
      );
    }

    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  }

  // アップロードは App Store Connect が返した upload operation だけで行う。
  // 返された URL へ JWT を付けて送らない（DESIGN.md の不変条件）ため、汎用の JWT 付き PUT は持たない。
  async uploadOperation(
    operation: {
      method?: string;
      url?: string;
      requestHeaders?: Array<{ name?: string; value?: string }>;
      length?: number;
      offset?: number;
    },
    source: string | Buffer<ArrayBuffer>,
  ): Promise<void> {
    if (!operation.url || !operation.method) {
      throw new Error('Apple upload operation missing url or method');
    }
    const fullBytes = typeof source === 'string' ? fs.readFileSync(source) : source;
    const start = operation.offset ?? 0;
    const len = operation.length ?? fullBytes.length - start;
    const slice = fullBytes.subarray(start, start + len);

    const headers: Record<string, string> = {};
    for (const h of operation.requestHeaders ?? []) {
      if (h.name && h.value !== undefined) headers[h.name] = h.value;
    }

    const res = await fetch(operation.url, {
      method: operation.method,
      headers,
      body: slice,
      signal: AbortSignal.timeout(APPLE_UPLOAD_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apple upload → ${res.status}: ${text}`);
    }
  }

  get vendorNumber() {
    return this.config.vendorNumber;
  }
}
