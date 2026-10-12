import test from 'node:test';
import assert from 'node:assert/strict';
import { findCells, validateQuery } from '../public/js/core/search.mjs';
import { parseCsv } from '../public/js/core/csv.mjs';
import { LIMITS } from '../public/js/core/input.mjs';

const fixture = () => [['id','note','note'], ...Array.from({ length: 201 },(_,i) => { const n=i+1; return [String(n).padStart(3,'0'), [1,100,101,201].includes(n)?`needle-${n}`:`plain-${n}`, n===150?'needle-hidden':'other']; })];

test('U04-01 F201 searches all pages with exact logical coordinates', () => {
  const result=findCells(fixture(),true,1,'needle');
  assert.equal(result.ok,true);
  assert.deepEqual(result.value,[1,100,101,201].map(recordIndex => ({ recordIndex,sourceColumnIndex:1,recordNumber:recordIndex+1,fieldNumber:2,dataRowNumber:recordIndex,pageIndex:Math.floor((recordIndex-1)/100),pageRowIndex:(recordIndex-1)%100 })));
  for(const match of result.value) assert.deepEqual(Object.values(match).map(value=>typeof value),Array(7).fill('number'));
});
test('U04-02 duplicate labels never merge distinct source columns', () => {
  const result=findCells(fixture(),true,2,'needle');
  assert.deepEqual(result.value,[{recordIndex:150,sourceColumnIndex:2,recordNumber:151,fieldNumber:3,dataRowNumber:150,pageIndex:1,pageRowIndex:49}]);
});
test('U04-03 literal punctuation and repeated occurrences count one cell', () => {
  const rows=[['id','note'],['001','foo.foo'],['002','foo'],['003','[x]'],['004','.*']];
  for(const [query,expected] of [['.',[1,4]],['[x]',[3]],['foo',[1,2]],['.*',[4]]]) assert.deepEqual(findCells(rows,true,1,query).value.map(match=>match.dataRowNumber),expected);
});
test('U04-04 case, spaces, Unicode composition and empty query are preserved', () => {
  const rows=[['x'],['Apple'],['apple'],[' apple '],['é'],['e\u0301']];
  for(const [query,expected] of [['Apple',[1]],['apple',[2,3]],[' apple ',[3]],['é',[4]],['e\u0301',[5]],[' ',[3]],['',[]]]) assert.deepEqual(findCells(rows,true,0,query).value.map(match=>match.dataRowNumber),expected);
});
test('U04-05 header is excluded only when enabled', () => {
  const rows=[['needle'],['plain']];
  assert.deepEqual(findCells(rows,true,0,'needle').value,[]);
  assert.deepEqual(findCells(rows,false,0,'needle').value,[{recordIndex:0,sourceColumnIndex:0,recordNumber:1,fieldNumber:1,dataRowNumber:1,pageIndex:0,pageRowIndex:0}]);
});
test('U04-06 logical records ignore physical quoted CRLF and remain unchanged', () => {
  const raw='id,note\r\n001,"a\r\nb"\r\n002,z', parsed=parseCsv(raw);
  assert.equal(parsed.ok,true);assert.equal(parsed.value[1][1],'a\r\nb');
  const rows=Object.freeze(parsed.value.map(row=>Object.freeze(row))), before=JSON.stringify(rows);
  assert.equal(findCells(rows,true,1,'b').value[0].recordNumber,2);
  assert.equal(JSON.stringify(rows),before);assert.equal(rows[1][1],'a\r\nb');
});
test('U04-11 query boundaries fail closed without echo or truncation', () => {
  const rows=[['a'],['a'.repeat(256)]];
  assert.equal(findCells(rows,true,0,'a'.repeat(256)).value.length,1);
  for(const query of ['a'.repeat(257),null,undefined,12,new String('a'),'a\nb','a\rb','\ud800','\udc00','\ud800x']) {
    const result=findCells(rows,true,0,query);
    assert.equal(result.ok,false);assert.equal(result.error.code,typeof query==='string'&&query.length>256?'SEARCH_TOO_LONG':'INVALID_SEARCH_QUERY');
    assert.deepEqual(Object.keys(result.error).sort(),['code','field','offset','record']);
    assert.equal(result.error.record,null);assert.equal(result.error.field,null);assert.equal(result.error.offset,null);
  }
  assert.equal(validateQuery('😀'.repeat(128)).ok,true);assert.equal(validateQuery('😀'.repeat(129)).error.code,'SEARCH_TOO_LONG');
  assert.equal(validateQuery('\t').value,'\t');
});
test('U04-11 helper rejects invalid Boolean, source index, shape and dataset limits', () => {
  for(const hasHeader of [null,1,'true']) assert.equal(findCells([['x']],hasHeader,0,'x').error.code,'INVALID_SELECTION');
  for(const index of [-1,1,0.1,'0',NaN,Infinity]) assert.equal(findCells([['x']],false,index,'x').error.code,'INVALID_SELECTION');
  for(const records of [null,{},[null],[[]],[['x'],['x','y']],[['x'],[3]]]) assert.equal(findCells(records,false,0,'x').ok,false);
  assert.equal(findCells(Array.from({length:5001},()=>['x']),false,0,'x').error.code,'ROW_LIMIT');
  assert.equal(findCells([Array(51).fill('x')],false,0,'x').error.code,'COLUMN_LIMIT');
  assert.equal(findCells(Array.from({length:2001},()=>Array(50).fill('x')),false,0,'x').error.code,'CELL_LIMIT');
  assert.equal(findCells([['x'.repeat(16385)]],false,0,'x').error.code,'FIELD_TOO_LONG');
  assert.equal(findCells(Array.from({length:100},()=>['x'.repeat(16384)]),false,0,'x').error.code,'INPUT_TOO_LARGE');
});
test('U04-12 HTML remains a literal query and cell; header-only has no matches', () => {
  const rows=[['note'],['<img src=x onerror=alert(1)>']];
  assert.equal(findCells(rows,true,0,'<img').value.length,1);
  assert.equal(findCells([['needle']],true,0,'needle').value.length,0);
});
test('U04-13 exact 1 MiB CSV / 5,000 records / 100,000 cells searches to final page', () => {
  let extra=LIMITS.input-999_999;
  const csv=Array.from({length:5000},(_,r)=>Array.from({length:20},()=>{const value=r?'needlexxx':'headxxxxx';return extra-->0?value+'a':value;}).join(',')).join('\n');
  assert.equal(new TextEncoder().encode(csv).byteLength,LIMITS.input);
  const parsed=parseCsv(csv);assert.equal(parsed.ok,true);
  const matches=findCells(parsed.value,true,19,'needle').value;
  assert.equal(matches.length,4999);assert.equal(matches.at(-1).dataRowNumber,4999);assert.equal(matches.at(-1).pageIndex,49);
  assert.equal(findCells(parsed.value,false,0,'').value.length,0);
  const noHeader=findCells(Array.from({length:5000},()=>['x']),false,0,'x');assert.equal(noHeader.value.length,5000);
});
