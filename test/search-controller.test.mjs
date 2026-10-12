import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchController } from '../public/js/app.mjs';
import { initialSession, transition } from '../public/js/core/session.mjs';
import { processMessage } from '../public/js/worker.mjs';
import { analyzeRisk } from '../public/js/core/risk.mjs';

const fixture = () => [['id','note','note'],...Array.from({length:201},(_,i)=>{const n=i+1;return[String(n).padStart(3,'0'),[1,100,101,201].includes(n)?`needle-${n}`:`plain-${n}`,n===150?'needle-hidden':'other'];})];
function setup(records=fixture()) {
  let session=transition(initialSession(),{type:'parse'});
  session=transition(session,{type:'parsed',jobId:session.jobId,records});
  const controller=createSearchController({getSession:()=>session,goToPage:pageIndex=>dispatch({type:'page',pageIndex})});
  function dispatch(event) {const before=session;session=transition(session,event);controller.observeSession(event,before,session);return session;}
  const prepare=format=>{dispatch({type:'format',format});dispatch({type:'prepare'});const result=processMessage({type:'export',jobId:session.jobId,records:session.records,indices:session.indices,hasHeader:session.hasHeader,format});assert.equal(result.ok,true);dispatch({type:'prepared',jobId:session.jobId,output:result.value});};
  return{controller,dispatch,prepare,getSession:()=>session};
}
const stable=session=>{const {pageIndex,...rest}=session;return rest;};

test('U04-01/10 first / previous / next use match order and never wrap',()=>{
  const {controller,getSession,dispatch}=setup();controller.setColumn(1);controller.setQuery('needle');controller.run();
  assert.equal(controller.getState().currentMatch,0);assert.equal(controller.move(-1),false);
  controller.move(1);assert.equal(getSession().pageIndex,0);controller.move(1);assert.equal(getSession().pageIndex,1);
  dispatch({type:'page',pageIndex:0});assert.equal(controller.getState().currentMatch,2);assert.equal(controller.getState().matches[2].pageIndex,1);
  controller.move(1);assert.equal(getSession().pageIndex,2);assert.equal(controller.move(1),false);controller.move(-1);assert.equal(getSession().pageIndex,1);
  controller.setQuery('absent');controller.run();assert.equal(controller.getState().status,'noMatch');assert.equal(getSession().pageIndex,1);assert.equal(controller.move(1),false);
});
test('U04-07 search, paging and query errors preserve full original output and job identity',()=>{
  const {controller,getSession,prepare}=setup();prepare('original');
  const before=getSession(), snapshot=structuredClone(stable(before)), bytes=before.output.bytes.slice();
  controller.setColumn(1);controller.setQuery('needle');controller.run();controller.move(1);controller.move(1);controller.move(1);
  controller.setQuery('x'.repeat(257));controller.run();assert.equal(controller.getState().query.length,257);assert.equal(controller.getState().error,'SEARCH_TOO_LONG');controller.clear();
  assert.deepEqual(stable(getSession()),snapshot);assert.equal(getSession().output,before.output);assert.deepEqual(getSession().output.bytes,bytes);
  const text=new TextDecoder().decode(bytes);assert.equal(text.split('\r\n').length,202);assert.ok(text.includes('plain-200'));
});
test('U04-08 formula search never acknowledges, retracts acknowledgement or bypasses original gate',()=>{
  const {controller,getSession,dispatch,prepare}=setup([['id','note'],['001','=1+1'],['002','plain']]);prepare('protected');
  const bytes=getSession().output.bytes.slice(), jobId=getSession().jobId;
  controller.setColumn(1);controller.setQuery('=1+1');controller.run();assert.equal(getSession().ack,false);assert.equal(getSession().output.riskCount,1);
  dispatch({type:'ack',ack:true});controller.setQuery('plain');controller.run();controller.clear();assert.equal(getSession().ack,true);assert.equal(getSession().jobId,jobId);assert.deepEqual(getSession().output.bytes,bytes);
  assert.equal(analyzeRisk(getSession().records).count,1);assert.equal(processMessage({type:'export',jobId,records:getSession().records,indices:[0,1],hasHeader:true,format:'original'}).error.code,'FORMULA_RISK');
  dispatch({type:'format',format:'json'});assert.equal(getSession().ack,false);assert.equal(getSession().output,null);
});
test('U04-02/09 source index stays separate from visible projection and selection invalidates once',()=>{
  const {controller,getSession,dispatch}=setup();dispatch({type:'select',indices:[1,2]});assert.equal(controller.getState().sourceColumnIndex,1);
  controller.setColumn(2);controller.setQuery('needle');controller.run();assert.equal(controller.getState().matches[0].sourceColumnIndex,2);assert.equal(getSession().indices[0],1);
  dispatch({type:'select',indices:[1]});assert.equal(controller.getState().sourceColumnIndex,1);assert.equal(controller.getState().matches.length,0);assert.equal(controller.getState().query,'needle');assert.equal(controller.setColumn(2),false);assert.deepEqual(getSession().indices,[1]);
  dispatch({type:'select',indices:[]});assert.equal(controller.canSearch(),false);assert.equal(controller.run(),false);assert.equal(controller.getState().sourceColumnIndex,null);
});
test('U04-05 header change requires a fresh search and its existing output invalidation',()=>{
  const {controller,dispatch,getSession,prepare}=setup([['needle'],['plain']]);prepare('original');controller.setQuery('needle');controller.run();assert.equal(controller.getState().status,'noMatch');
  dispatch({type:'header',hasHeader:false});assert.equal(controller.getState().matches.length,0);assert.equal(controller.getState().query,'needle');assert.equal(getSession().output,null);
  controller.run();assert.equal(controller.getState().matches[0].recordIndex,0);assert.equal(controller.getState().matches[0].dataRowNumber,1);
});
test('U04-06/09 source events clear query/cursor, stale callbacks cannot revive search',()=>{
  const {controller,dispatch,getSession}=setup();dispatch({type:'read'});dispatch({type:'file',jobId:getSession().jobId,source:'id,note\r\n001,"a\r\nb"\r\n002,z'});
  dispatch({type:'parse'});dispatch({type:'parsed',jobId:getSession().jobId,records:[['id','note'],['001','a\r\nb'],['002','z']]});
  controller.setColumn(1);controller.setQuery('b');controller.run();assert.equal(getSession().rawSource,'id,note\r\n001,"a\r\nb"\r\n002,z');assert.equal(getSession().sourceKind,'file');
  const oldJob=getSession().jobId;dispatch({type:'edit',hasSource:true});assert.equal(getSession().rawSource,null);assert.equal(controller.getState().query,'');assert.equal(controller.getState().currentMatch,-1);
  const cleared=controller.getState();dispatch({type:'parsed',jobId:oldJob,records:[['stale']]});assert.equal(controller.getState(),cleared);dispatch({type:'clear'});assert.equal(controller.getState().sourceColumnIndex,null);
});
test('busy search controls never cancel or replace parse/export; export-only errors allow search',()=>{
  const {controller,dispatch,getSession}=setup();controller.setColumn(1);controller.setQuery('needle');controller.run();const state=controller.getState();
  dispatch({type:'prepare'});assert.equal(controller.canSearch(),false);for(const operation of [()=>controller.run(),()=>controller.move(1),()=>controller.setQuery('new'),()=>controller.setColumn(2),()=>controller.clear()])assert.equal(operation(),false);
  assert.equal(controller.getState(),state);const id=getSession().jobId;dispatch({type:'error',jobId:id,error:{code:'WORKER_FAILED'}});assert.equal(controller.canSearch(),true);controller.run();assert.equal(getSession().phase,'error');assert.equal(getSession().jobId,id);
});
test('format/prepare keep search cursor; query input does not scan and clear keeps page',()=>{
  const {controller,dispatch,getSession,prepare}=setup();controller.setColumn(1);controller.setQuery('needle');assert.equal(controller.getState().matches.length,0);controller.run();controller.move(1);controller.move(1);
  const state=controller.getState();prepare('json');assert.equal(controller.getState(),state);dispatch({type:'page',pageIndex:2});controller.clear();assert.equal(getSession().pageIndex,2);assert.equal(getSession().phase,'exportReady');assert.equal(controller.getState().query,'');
});
