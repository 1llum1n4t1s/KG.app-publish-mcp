/**
 * Response compaction for App Store Connect (JSON:API) results.
 *
 * Apple attaches `links.self` to every resource and `links.{self,related}` to every
 * relationship. No tool accepts those URLs as input, so they only consume the AI
 * client's context. This module drops them and keeps everything a caller can act on:
 * resource identity and attributes, relationship linkage (`data`) and `meta`, and the
 * top-level `links` / `meta` (paging cursors such as `links.next`, `meta.paging`).
 *
 * Anything that is not recognizably a JSON:API document is returned untouched, so
 * handler-shaped results (and Google results, which never pass through here) keep
 * their exact form.
 */

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A JSON:API resource object: has string `type` and `id`. */
function isResource(value: unknown): value is Json {
  return isObject(value) && typeof value.type === 'string' && typeof value.id === 'string';
}

function compactRelationship(rel: unknown): unknown {
  // Not an object (unexpected shape): keep as is rather than guess.
  if (!isObject(rel)) return rel;
  const { links: _links, ...rest } = rel;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function compactResource(resource: Json): Json {
  const { links: _links, relationships, ...rest } = resource;
  const out: Json = { ...rest };
  if (isObject(relationships)) {
    const kept: Json = {};
    for (const [name, rel] of Object.entries(relationships)) {
      const compacted = compactRelationship(rel);
      if (compacted !== undefined) kept[name] = compacted;
    }
    if (Object.keys(kept).length > 0) out.relationships = kept;
  } else if (relationships !== undefined) {
    out.relationships = relationships;
  }
  return out;
}

function compactResources(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => (isResource(item) ? compactResource(item) : item));
  return isResource(value) ? compactResource(value) : value;
}

/**
 * Returns a compacted copy of a JSON:API document, or the input itself when it is not
 * one. A document is recognized by a resource-shaped (or array of resource-shaped)
 * `data`, or by an `included` array. Top-level keys other than `data` / `included`
 * (`links`, `meta`, handler additions) are carried over unchanged.
 */
export function compactJsonApi<T>(result: T): T {
  if (!isObject(result)) return result;
  const data = result.data;
  const dataIsResource = isResource(data) || (Array.isArray(data) && data.length > 0 && data.every(isResource));
  const hasIncluded = Array.isArray(result.included);
  // An empty `data` array alongside links/meta is still a JSON:API list response.
  const emptyList = Array.isArray(data) && data.length === 0 && (isObject(result.links) || isObject(result.meta));
  if (!dataIsResource && !hasIncluded && !emptyList) return result;

  const out: Json = { ...result };
  if ('data' in result) out.data = compactResources(data);
  if (hasIncluded) out.included = compactResources(result.included);
  return out as T;
}

/** Fixed replacement shown for secret values; keeps "a value is set" observable. */
export const REDACTED = '<redacted>';

/** Attribute names whose values must never reach the AI client's conversation. */
const SECRET_KEYS = new Set(['demoAccountPassword']);

/**
 * Returns a copy of `value` in which every secret attribute holding a non-empty
 * string is replaced by REDACTED. null / empty values are kept so callers can still
 * tell that no password is set. Applied recursively (data, included, echoed input)
 * so no response path can leak the value; the input is never mutated.
 */
export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactSecrets) as T;
  if (!isObject(value)) return value;
  const out: Json = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SECRET_KEYS.has(key) && typeof item === 'string' && item !== '' ? REDACTED : redactSecrets(item);
  }
  return out as T;
}

/** Redacts secret values that appear as JSON members inside error text (e.g. echoed request bodies). */
export function redactSecretText(text: string): string {
  const keys = [...SECRET_KEYS].join('|');
  // String.raw keeps the regex escapes intact inside the template literal.
  const pattern = new RegExp(String.raw`("(?:${keys})"\s*:\s*)"(?:[^"\\]|\\.)+"`, 'g');
  return text.replace(pattern, `$1"${REDACTED}"`);
}

/** Common shaping for every Apple tool result: compaction first, then secret redaction. */
export function formatAppleResult<T>(result: T): T {
  return redactSecrets(compactJsonApi(result));
}
