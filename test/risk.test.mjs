import test from 'node:test';
import assert from 'node:assert/strict';
import { hasFormulaRisk, analyzeRisk, protectCell } from '../public/js/core/risk.mjs';
test('CV-19 conservative ASCII/fullwidth formulas and leading line controls', () => {
  for (const value of ['=1+1','+2','-12','@x','  =x','＝1','＋1','－1','＠x','\ttext','\ntext','\rtext','\t','\u3000＝1','\uFEFF@x']) assert.equal(hasFormulaRisk(value), true, JSON.stringify(value));
  for (const code of [32, 0xa0,0x1680,...Array.from({length:11},(_,i)=>0x2000+i),0x2028,0x2029,0x202f,0x205f,0x3000,0xfeff]) assert.equal(hasFormulaRisk(String.fromCodePoint(code)+'=x'), true);
});
test('CV-20 plain strings and non-leading tabs', () => {
  for (const value of ['', '001','a=1',"'=-x",'text\t','  ', '\u200b=x']) assert.equal(hasFormulaRisk(value),false);
});
test('analysis uses numeric coordinates; protection prepends without trimming', () => {
  assert.deepEqual(analyzeRisk([['=header','safe'],['text',' -12']]), {count:2,cells:[{record:1,field:1},{record:2,field:2}]});
  assert.equal(protectCell('  =x'), "'  =x"); assert.equal(protectCell('001'),'001');
});
