import test from 'node:test';
import assert from 'node:assert/strict';
import { projectRecords, makeLabels, pageRows } from '../public/js/core/selection.mjs';
test('CV-16 projection and duplicate/empty labels keep immutable source indices', () => {
  const source = Object.freeze([Object.freeze(['','x','x']), Object.freeze(['001','02','03'])]);
  assert.deepEqual(projectRecords(source, [0,2]).value, [['','x'],['001','03']]);
  const labels = makeLabels(source, true); assert.match(labels[0], /第1欄/u); assert.match(labels[1], /2/u); assert.match(labels[2], /3/u);
  assert.deepEqual(makeLabels(source, false), ['第1欄','第2欄','第3欄']);
});
test('CV-17 rejects invalid selection without coercion', () => {
  for (const [indices, code] of [[[], 'NO_COLUMNS'], [[1,0], 'INVALID_SELECTION'], [[0,0], 'INVALID_SELECTION'], [[-1], 'INVALID_SELECTION'], [[2], 'INVALID_SELECTION'], [['0'], 'INVALID_SELECTION'], [[0.5], 'INVALID_SELECTION']]) assert.equal(projectRecords([['a','b']], indices).error.code, code);
  assert.equal(projectRecords([['a'], []], [0]).error.code, 'COLUMN_MISMATCH');
  assert.equal(projectRecords([[1]], [0]).ok, false);
});
test('CV-26 100/100/1 page sizes and header-only', () => {
  const rows = [['header'], ...Array.from({length:201}, (_, i) => [String(i)])];
  assert.deepEqual([0,1,2].map(page => pageRows(rows,true,page).value.length), [100,100,1]);
  assert.deepEqual(pageRows([['header']],true,0).value, []);
  assert.equal(pageRows(rows,true,3).error.code, 'INVALID_PAGE');
  assert.equal(pageRows(rows,true,-1).ok, false);
});
