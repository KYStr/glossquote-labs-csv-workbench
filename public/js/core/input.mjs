export const LIMITS = Object.freeze({ input: 1_048_576, rows: 5_000, columns: 50, cells: 100_000, field: 16_384, output: 4_194_304 });
export const ok = value => ({ ok: true, value });
export const fail = (code, record = null, field = null, offset = null) => ({ ok: false, error: { code, record, field, offset } });

export function decodeUtf8(bytes) {
  if (!(bytes instanceof Uint8Array)) return fail('INVALID_UTF8');
  if (bytes.byteLength > LIMITS.input) return fail('INPUT_TOO_LARGE');
  try { return ok(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)); }
  catch { return fail('INVALID_UTF8'); }
}

export function validateSource(text) {
  if (typeof text !== 'string') return fail('INVALID_UNICODE');
  if (text.length > LIMITS.input) return fail('INPUT_TOO_LARGE');
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return fail('INVALID_UNICODE', null, null, index);
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) return fail('INVALID_UNICODE', null, null, index);
    else if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31)) return fail('UNSUPPORTED_CONTROL', null, null, index);
  }
  if (new TextEncoder().encode(text).byteLength > LIMITS.input) return fail('INPUT_TOO_LARGE');
  return ok(text.startsWith('\uFEFF') ? text.slice(1) : text);
}
