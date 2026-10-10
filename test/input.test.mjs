import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeUtf8, validateSource, LIMITS } from '../public/js/core/input.mjs';
import { parseCsv } from '../public/js/core/csv.mjs';
const encode = text => new TextEncoder().encode(text);

test('CV-08 fatal UTF-8 and byte size gate', () => {
  assert.equal(decodeUtf8(Uint8Array.of(0xc3, 0x28)).error.code, 'INVALID_UTF8');
  for (const bytes of [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xe2]]) assert.equal(decodeUtf8(Uint8Array.from(bytes)).error.code, 'INVALID_UTF8');
  assert.equal(decodeUtf8(new Uint8Array(LIMITS.input + 1)).error.code, 'INPUT_TOO_LARGE');
});
test('CV-09 decode preserves BOMs; parser removes exactly one', () => {
  for (const count of [1, 2]) {
    const raw = '\uFEFF'.repeat(count) + 'a,b';
    assert.equal(decodeUtf8(encode(raw)).value, raw);
    assert.deepEqual(parseCsv(raw).value, [['\uFEFF'.repeat(count - 1) + 'a', 'b']]);
  }
});
test('CV-10 invalid Unicode and controls, no source in errors', () => {
  for (const bad of ['\uD800', '\uDC00', 'x\uD800y']) assert.equal(validateSource(bad).error.code, 'INVALID_UNICODE');
  for (const code of [...Array.from({ length: 9 }, (_, i) => i), 11, 12, ...Array.from({ length: 18 }, (_, i) => i + 14)]) assert.equal(validateSource(`a${String.fromCharCode(code)}b`).error.code, 'UNSUPPORTED_CONTROL');
  assert.equal(validateSource('😀\t\r\n').ok, true);
  assert.equal(validateSource({}).ok, false);
  assert.deepEqual(Object.keys(validateSource('\uD800').error), ['code', 'record', 'field', 'offset']);
});
test('CV-15 exact 1MiB boundary, raw length and multibyte limits', () => {
  const fields = Array(64).fill('a'.repeat(16383));
  for (const [increment, expected] of [[0, true], [1, true], [2, false]]) {
    const rows = [...fields]; if (increment >= 1) rows[0] += 'a'; if (increment >= 2) rows[1] += 'a';
    const source = rows.join('\n');
    assert.equal(encode(source).length, 1048575 + increment); assert.equal(parseCsv(source).ok, expected);
    if (!expected) assert.equal(parseCsv(source).error.code, 'INPUT_TOO_LARGE');
  }
  assert.equal(validateSource('a'.repeat(LIMITS.input + 1)).error.code, 'INPUT_TOO_LARGE');
  assert.equal(validateSource('漢'.repeat(349526)).error.code, 'INPUT_TOO_LARGE');
});
