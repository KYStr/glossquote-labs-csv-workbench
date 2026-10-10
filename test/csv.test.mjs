import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../public/js/core/csv.mjs';

for (const [id, source, value] of [
  ['CV-01 empty', '', []], ['CV-01 LF', '\n', [['']]], ['CV-01 two LF', '\n\n', [[''], ['']]],
  ['CV-02', 'a,b\r\n1,2\r\n', [['a','b'],['1','2']]],
  ['CV-03', '"a,b","c""d"', [['a,b', 'c"d']]],
  ['CV-04', '"a\r\nb",c\n"d\ne",f', [['a\r\nb', 'c'], ['d\ne', 'f']]],
  ['CV-05 trailing comma', 'a,', [['a','']]], ['CV-05 comma', ',', [['','']]], ['CV-05 quotes', '""', [['']]],
  ['CV-18', '001,9007199254740993,false,2026-01-02', [['001', '9007199254740993', 'false', '2026-01-02']]],
  ['quoted solitary CR', '"a\rb",c', [['a\rb','c']]], ['whitespace', ', ', [['',' ']]]
]) test(id, () => assert.deepEqual(parseCsv(source), { ok: true, value }));
test('CV-06 four-state syntax rejection', () => {
  for (const source of ['"a" ,b', 'a"b,c', '"a', 'a\rb', '"a"\t,b', '"a"x', '"a"\r']) {
    const result = parseCsv(source); assert.equal(result.error.code, 'CSV_SYNTAX'); assert.equal('value' in result, false);
  }
});
test('CV-07 rejects ragged rows, records count logical lines', () => {
  assert.equal(parseCsv('a,b\nc').error.record, 2);
  assert.equal(parseCsv('"a\nb",c\nd').error.record, 2);
  assert.equal(parseCsv('a,b\nc').error.code, 'COLUMN_MISMATCH');
});
test('CV-11 UTF-16 decoded field length boundary', () => {
  assert.equal(parseCsv('a'.repeat(16384)).ok, true);
  assert.equal(parseCsv('a'.repeat(16385)).error.code, 'FIELD_TOO_LONG');
  assert.equal(parseCsv('😀'.repeat(8192)).ok, true);
  assert.equal(parseCsv('"' + '""'.repeat(16384) + '"').ok, true);
});
test('CV-12 column boundary', () => {
  assert.equal(parseCsv(Array(50).fill('a').join(',')).ok, true);
  assert.equal(parseCsv(Array(51).fill('a').join(',')).error.code, 'COLUMN_LIMIT');
});
test('CV-13 record boundary', () => {
  assert.equal(parseCsv(Array(5000).fill('a').join('\n')).ok, true);
  assert.equal(parseCsv(Array(5001).fill('a').join('\n')).error.code, 'ROW_LIMIT');
});
test('CV-14 total cell boundary', () => {
  const row = Array(50).fill('a').join(',');
  assert.equal(parseCsv(Array(2000).fill(row).join('\n')).ok, true);
  assert.equal(parseCsv(Array(2001).fill(row).join('\n')).error.code, 'CELL_LIMIT');
});
test('deterministic quoted roundtrip across commas, CR/LF, quotes and astral Unicode', () => {
  const cells = ['', ' ', 'a,b', 'a\r\nb', 'a\rb', 'a\nb', '"a"', '😀', '001'];
  for (let i = 0; i < cells.length; i++) {
    const rows = [cells, [...cells.slice(i), ...cells.slice(0, i)]];
    const source = rows.map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')).join('\r\n');
    assert.deepEqual(parseCsv(source).value, rows);
  }
});
