import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCsv, serializeOriginalJson, createOutputWriter } from '../public/js/core/export.mjs';
import { projectRecords } from '../public/js/core/selection.mjs';
const decode = bytes => new TextDecoder().decode(bytes);
test('CV-21 protection, exact CSV byte profile and immutable inputs; CV-22 original refused', () => {
  const rows = Object.freeze([Object.freeze(['=1+1','001']), Object.freeze(['plain','a"b'])]);
  assert.equal(decode(serializeCsv(rows,'protected').value), '"\'=1+1","001"\r\n"plain","a""b"');
  assert.equal(serializeCsv(rows,'original').error.code,'FORMULA_RISK');
  assert.equal(decode(serializeCsv([['a\r\nb','a\rb']],'original').value),'"a\r\nb","a\rb"');
});
test('CV-23 JSON fixed schema, key order, indent, no trailing LF/BOM; source indices survive projection', () => {
  const value = decode(serializeOriginalJson([['001','=1+1']],[0,2],false).value);
  assert.deepEqual(JSON.parse(value), {schemaVersion:1,format:'csv-selection',hasHeader:false,sourceColumnIndices:[0,2],records:[['001','=1+1']]});
  assert.ok(value.startsWith('{\n  "schemaVersion": 1,')); assert.ok(value.endsWith('}'));
  for (const indices of [[0], [1,1], [-1,2], [0,50]]) assert.equal(serializeOriginalJson([['a','b']],indices,true).error.code,'INVALID_SELECTION');
  assert.equal(serializeOriginalJson([['a']],[0],'true').ok, false);
});
test('CV-24 only selected cells including header affect original CSV gate', () => {
  const rows = [['=header','safe'],['value','text']];
  assert.equal(serializeCsv(projectRecords(rows,[1]).value,'original').ok,true);
  assert.equal(serializeCsv(projectRecords(rows,[0]).value,'original').error.code,'FORMULA_RISK');
});
test('CV-25 exact byte writer boundary and permanent rejection', () => {
  const writer = createOutputWriter(); assert.equal(writer.append('a'.repeat(4194304)).ok, true);
  assert.equal(writer.finish().value.byteLength,4194304);
  assert.equal(writer.append('x').error.code,'OUTPUT_TOO_LARGE'); assert.equal(writer.finish().error.code,'OUTPUT_TOO_LARGE');
  assert.equal(writer.append('').ok,false);
  const multibyte = createOutputWriter(); multibyte.append('😀'.repeat(1048576)); assert.equal(multibyte.finish().value.length,4194304); assert.equal(multibyte.append('漢').ok,false);
});
