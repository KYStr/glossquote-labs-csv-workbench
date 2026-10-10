import test from 'node:test';
import assert from 'node:assert/strict';
import { initialSession, transition, createJobController } from '../public/js/core/session.mjs';
import { processMessage } from '../public/js/worker.mjs';
test('CV-29/35 old job results ignored; raw file source survives read failure and is removed on first edit', () => {
  let state = transition(initialSession(), {type:'read'});
  state = transition(state,{type:'file', jobId:state.jobId,source:'"a\r\nb",c'});
  assert.equal(state.rawSource, '"a\r\nb",c');
  state = transition(state,{type:'parse'}); const old = state.jobId;
  state = transition(state,{type:'clear'});
  assert.equal(transition(state,{type:'parsed',jobId:old,records:[['stale']]}), state);
  assert.deepEqual(state, initialSession(state.jobId));
  state = transition(state,{type:'read'}); state = transition(state,{type:'file',jobId:state.jobId,source:'"a\r\nb",c'});
  state = transition(state,{type:'read'}); state = transition(state,{type:'error',jobId:state.jobId,error:{code:'READ_FAILED'}});
  assert.equal(state.sourceKind,'file'); assert.equal(state.rawSource,'"a\r\nb",c');
  state = transition(state,{type:'edit',hasSource:true}); assert.equal(state.sourceKind,'text'); assert.equal(state.rawSource,null);
});
test('selection/header/format/edit reset prepared bytes and confirmation; harmless paging retains them', () => {
  let ready = transition(initialSession(),{type:'parse'}); ready = transition(ready,{type:'parsed',jobId:ready.jobId,records:[['a','b'],['1','2']]});
  ready = transition(ready,{type:'prepare'}); ready = transition(ready,{type:'prepared',jobId:ready.jobId,output:{bytes:Uint8Array.of(1),riskCount:1}}); ready = transition(ready,{type:'ack',ack:true});
  for (const event of [{type:'select',indices:[1]},{type:'header',hasHeader:false},{type:'format',format:'json'},{type:'edit',hasSource:true}]) {
    const next = transition(ready,event); assert.equal(next.ack,false); assert.equal(next.output,null); assert.ok(next.jobId > ready.jobId);
  }
  assert.equal(transition(ready,{type:'page',pageIndex:0}).output,ready.output);
});
test('CV-29/32 delayed worker and reader callbacks cannot overwrite a newer job; timeout always terminates', () => {
  const workers=[], readers=[], timers=new Map(), results=[]; let next=0, revoked=[];
  const jobs=createJobController({
    makeWorker:()=>{ const worker={ postMessage(){},terminate(){ this.terminated=true; }}; workers.push(worker); return worker; },
    makeReader:()=>{ const reader={readyState:1,readAsArrayBuffer(){},abort(){this.aborted=true;this.onabort?.();}};readers.push(reader);return reader;},
    setTimer:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},clearTimer:id=>timers.delete(id), revokeURL:url=>revoked.push(url)
  });
  jobs.read({}, value=>results.push(value),code=>results.push(code));const oldReaderCallback=readers[0].onload;readers[0].result='stale';jobs.dispose();oldReaderCallback();assert.equal(readers[0].aborted,true);assert.deepEqual(results,[]);
  jobs.run({jobId:1},value=>results.push(value),code=>results.push(code));const delayed=workers[0].onmessage;
  jobs.run({jobId:2},value=>results.push(value),code=>results.push(code));delayed({data:'stale'});assert.equal(workers[0].terminated,true);assert.deepEqual(results,[]);
  const timeout=[...timers.values()][0];assert.equal(timeout.ms,5000);timeout.fn();assert.equal(workers[1].terminated,true);assert.deepEqual(results,['TIMEOUT']);assert.equal(timers.size,0);
  jobs.ownURL('blob:synthetic');jobs.expireURL();[...timers.values()][0].fn();assert.deepEqual(revoked,['blob:synthetic']);
});
test('Worker exact protocol and export defense rejects unknown fields, malicious index and original risk', () => {
  assert.equal(processMessage({type:'parse',jobId:1,source:'a,b'}).ok,true);
  assert.equal(processMessage({type:'parse',jobId:1,source:'a',extra:true}).error.code,'WORKER_FAILED');
  assert.equal(processMessage({type:'unknown',jobId:1}).ok,false);
  const message={type:'export',jobId:2,records:[['=x','safe']],indices:[0],hasHeader:true,format:'original'};
  assert.equal(processMessage(message).error.code,'FORMULA_RISK');assert.equal(processMessage({...message,indices:[1]}).ok,true);
  assert.equal(processMessage({...message,indices:[0,0]}).ok,false);
});
