import { decodeUtf8, fail, LIMITS } from './core/input.mjs';
import { initialSession, transition, createJobController } from './core/session.mjs';
import { workerSource } from './worker-source.mjs';
import { makeLabels, pageRows } from './core/selection.mjs';
import { analyzeRisk, protectCell } from './core/risk.mjs';

import zh from './locales/zh-Hant.mjs';
import en from './locales/en.mjs';

export function mount({ document: doc = document, capabilities = globalThis } = {}) {
  const locale = doc.documentElement?.lang === 'en' ? 'en' : 'zh-Hant';
  const copy = locale === 'en' ? en : zh;
  const fmt = value => new Intl.NumberFormat(locale).format(value);
  const el = Object.fromEntries(['source','file','file-help','preview','clear','cancel','header','status','source-hint','format','prepare','workspace','columns','summary','table-head','table-body','table-empty','previous','next','page-label','risk','format-help','output','output-info','comparison','comparison-list','compare-previous','compare-next','compare-page','ack-area','ack','download'].map(id => [id, doc.getElementById(id)]));
  let session = initialSession();
  let comparePage = 0;
  const supported = ['TextEncoder','TextDecoder','Worker','Blob'].every(name => typeof capabilities[name] === 'function') && typeof capabilities.URL?.createObjectURL === 'function';
  let workerURL = null;
  const jobs = createJobController({
    makeWorker: () => { workerURL = capabilities.URL.createObjectURL(new capabilities.Blob([workerSource], { type: 'text/javascript' })); return new capabilities.Worker(workerURL); },
    releaseWorkerURL: () => { if (workerURL) capabilities.URL.revokeObjectURL(workerURL); workerURL = null; },
    makeReader: () => new capabilities.FileReader(), revokeURL: url => capabilities.URL.revokeObjectURL(url)
  });
  const dispatch = event => { session = transition(session, event); if (!['page','ack'].includes(event.type)) comparePage = 0; render(); };
  const error = (code, jobId = session.jobId) => dispatch({ type: 'error', jobId, error: fail(code).error });
  const node = (tag, text, className = '') => { const value = doc.createElement(tag); if (text !== undefined) value.textContent = text; if (className) value.className = className; return value; };
  const selectedRecords = () => session.records.map(row => session.indices.map(index => row[index]));
  const riskAnalysis = () => analyzeRisk(selectedRecords());
  const filename = () => session.format === 'json' ? 'selected-original.json' : `selected-${session.format}.csv`;
  function render() {
    const focused = doc.activeElement?.id;
    el.header.checked = session.hasHeader; el.format.value = session.format;
    const busy = ['reading','parsing','preparingExport'].includes(session.phase);
    el.preview.disabled = !supported || busy; el.header.disabled = busy; el.format.disabled = busy;
    el.file.disabled = !supported || typeof capabilities.FileReader !== 'function';
    el['file-help'].textContent = typeof capabilities.FileReader === 'function' ? copy.fileHelp : copy.fileUnsupported;
    el.cancel.hidden = !busy; el.prepare.disabled = !supported || busy || !session.records.length || !session.indices.length;
    el['source-hint'].textContent = session.sourceKind === 'file' ? copy.fileHint : copy.textHint;
    const count = Math.max(0,session.records.length-(session.hasHeader?1:0));
    const risk = riskAnalysis();
    el.status.classList.toggle('error',Boolean(session.error) || !supported);
    el.source.setAttribute('aria-invalid',session.error ? 'true' : 'false');
    el.status.textContent = !supported ? copy.errors.UNSUPPORTED : session.error ? (copy.errors[session.error.code] ?? copy.errors.WORKER_FAILED) + (session.error.record ? ` (${copy.coordinate(fmt(session.error.record),fmt(session.error.field ?? 1))})` : '') : session.phase === 'ready' ? !session.records.length ? copy.empty : count ? copy.ready(fmt(count)) : copy.headerOnly : copy[session.phase];
    el.workspace.hidden = !session.records.length;
    el.summary.textContent = copy.summary(fmt(count),fmt(session.indices.length),fmt(session.records[0]?.length ?? 0));
    const labels = makeLabels(session.records,session.hasHeader,locale);
    el.columns.replaceChildren();
    labels.forEach((label,index) => {
      const wrapper=node('label',undefined,'check-label'), input=node('input'); input.type='checkbox'; input.id=`column-${index}`; input.checked=session.indices.includes(index); input.disabled=busy;
      input.setAttribute('aria-label',`${copy.column(fmt(index+1))}: ${label}`);
      input.addEventListener('change',()=>{ const indices=Array.from(el.columns.querySelectorAll('input')).flatMap((item,i)=>item.checked?[i]:[]); jobs.dispose(); dispatch({type:'select',indices}); });
      wrapper.append(input,node('span',`${copy.column(fmt(index+1))}: ${label}`));el.columns.append(wrapper);
    });
    el['table-head'].replaceChildren();el['table-body'].replaceChildren();
    const head=node('tr');
    for (const index of session.indices) { const th=node('th');th.scope='col';th.append(node('pre',labels[index],'cell-value'));head.append(th); }
    el['table-head'].append(head);
    const rows=pageRows(session.records,session.hasHeader,session.pageIndex);
    if (rows.ok && session.indices.length) for (const row of rows.value) {const tr=node('tr');for(const index of session.indices){const td=node('td');td.append(node('pre',row[index],'cell-value'));tr.append(td);}el['table-body'].append(tr);}
    const pages=Math.max(1,Math.ceil(count/100));el['page-label'].textContent=copy.page(fmt(session.pageIndex+1),fmt(pages));
    el.previous.disabled=busy||session.pageIndex===0;el.next.disabled=busy||session.pageIndex+1>=pages;
    el['table-empty'].hidden=Boolean(count&&session.indices.length);el['table-empty'].textContent=session.indices.length?copy.headerOnly:copy.noColumns;
    el.risk.classList.toggle('warning',risk.count>0);el.risk.textContent=risk.count?copy.risk(fmt(risk.count)):copy.noRisk;
    el.format.querySelector('option[value="original"]').disabled=risk.count>0;
    el.prepare.disabled = el.prepare.disabled || (session.format==='original'&&risk.count>0);
    el['format-help'].textContent=copy[session.format==='protected'?'formatProtected':session.format==='original'?'formatOriginal':'formatJson'];
    const prepared=session.phase==='exportReady'&&session.outputJobId===session.jobId&&session.output;
    el.preview.classList.toggle('primary',!session.records.length);
    el.prepare.classList.toggle('primary',Boolean(session.records.length&&!prepared));
    const needsAck=Boolean(prepared&&session.format==='protected'&&prepared.riskCount>0);
    el.output.hidden=!prepared;el['ack-area'].hidden=!needsAck;el.ack.checked=session.ack;el.comparison.hidden=!needsAck;
    el.download.disabled=!prepared||(needsAck&&!session.ack);
    el['comparison-list'].replaceChildren();
    if(prepared){
      el['output-info'].textContent=session.format==='protected'?copy.changed(filename(),fmt(prepared.bytes.byteLength),fmt(prepared.riskCount)):copy.unchanged(filename(),fmt(prepared.bytes.byteLength));
      const changed=needsAck?risk.cells:[],comparePages=Math.max(1,Math.ceil(changed.length/100));
      comparePage=Math.min(comparePage,comparePages-1);
      for(const cell of changed.slice(comparePage*100,comparePage*100+100)){
        const index=session.indices[cell.field-1],value=session.records[cell.record-1][index];
        const wrapper=node('div',undefined,'comparison-cell');wrapper.append(node('h3',copy.coordinate(fmt(cell.record),fmt(index+1))));
        const values=node('div',undefined,'comparison-values');for(const [label,text] of [[copy.original,value],[copy.protected,protectCell(value)]]){const section=node('div');section.append(node('h4',label),node('pre',text,'cell-value'));values.append(section);}wrapper.append(values);el['comparison-list'].append(wrapper);
      }
      el['compare-page'].textContent=copy.page(fmt(comparePage+1),fmt(comparePages));el['compare-previous'].disabled=comparePage===0;el['compare-next'].disabled=comparePage+1>=comparePages;
    }
    if (focused?.startsWith('column-')) doc.getElementById(focused)?.focus({preventScroll:true});
  }
  el.source.addEventListener('input', () => { jobs.dispose(); dispatch({ type: 'edit', hasSource: el.source.value.length > 0 }); });
  el.file.addEventListener('cancel', () => { jobs.dispose(); dispatch({ type: 'read' }); dispatch({ type: 'cancel' }); });
  el.file.addEventListener('change', () => {
    jobs.dispose(); dispatch({ type: 'read' }); const jobId = session.jobId;
    const files = el.file.files;
    if (!files || files.length === 0) { dispatch({ type: 'cancel' }); return; }
    const file = files[0], fileCount = files.length; el.file.value = '';
    if (fileCount !== 1 || !/\.csv$/iu.test(file.name)) { error('FILE_TYPE', jobId); return; }
    if (file.size > LIMITS.input) { error('INPUT_TOO_LARGE', jobId); return; }
    jobs.read(file, buffer => {
      const decoded = decodeUtf8(new Uint8Array(buffer));
      if (!decoded.ok) { dispatch({ type: 'error', jobId, error: decoded.error }); return; }
      if (session.jobId !== jobId) return;
      el.source.value = decoded.value; dispatch({ type: 'file', jobId, source: decoded.value });
    }, code => error(code, jobId));
  });
  el.preview.addEventListener('click', () => {
    if (!supported) return;
    const source = session.sourceKind === 'file' ? session.rawSource : el.source.value;
    jobs.dispose(); dispatch({ type: 'parse' }); const jobId = session.jobId;
    jobs.run({ type: 'parse', jobId, source }, result => {
      if (session.jobId !== jobId) return;
      if (result?.jobId !== jobId || result?.type !== 'parse-result') { error('WORKER_FAILED',jobId); return; }
      if (result.ok) dispatch({ type: 'parsed', jobId, records: result.value }); else dispatch({ type: 'error', jobId, error: result.error });
    }, code => error(code, jobId));
  });
  el.header.addEventListener('change', () => { jobs.dispose(); dispatch({ type: 'header', hasHeader: el.header.checked }); });
  el.format.addEventListener('change', () => { jobs.dispose(); dispatch({ type: 'format', format: el.format.value }); });
  el.prepare.addEventListener('click', () => {
    if (!supported || !session.records.length || !session.indices.length || (session.format==='original'&&riskAnalysis().count>0)) return;
    jobs.dispose(); dispatch({ type: 'prepare' }); const jobId = session.jobId;
    jobs.run({ type: 'export', jobId, records: session.records, indices: session.indices, hasHeader: session.hasHeader, format: session.format }, result => {
      if (session.jobId !== jobId) return;
      if (result?.jobId !== jobId || result?.type !== 'export-result') { error('WORKER_FAILED',jobId); return; }
      if (result.ok) dispatch({ type: 'prepared', jobId, output: result.value }); else dispatch({ type: 'error', jobId, error: result.error });
    }, code => error(code, jobId));
  });
  el.cancel.addEventListener('click', () => { jobs.dispose(); dispatch({ type: 'cancel' }); });
  el.previous.addEventListener('click',()=>dispatch({type:'page',pageIndex:session.pageIndex-1}));
  el.next.addEventListener('click',()=>dispatch({type:'page',pageIndex:session.pageIndex+1}));
  el['compare-previous'].addEventListener('click',()=>{comparePage--;render();});el['compare-next'].addEventListener('click',()=>{comparePage++;render();});
  el.ack.addEventListener('change',()=>dispatch({type:'ack',ack:el.ack.checked}));
  el.download.addEventListener('click',()=>{
    if(el.download.disabled||session.phase!=='exportReady'||session.outputJobId!==session.jobId) return;
    if(session.format==='original'&&riskAnalysis().count>0) return;
    if(session.format==='protected'&&session.output.riskCount>0&&!session.ack) return;
    jobs.releaseURL();
    const url=capabilities.URL.createObjectURL(new capabilities.Blob([session.output.bytes],{type:session.format==='json'?'application/json;charset=utf-8':'text/csv;charset=utf-8'}));jobs.ownURL(url);
    const link=node('a');link.href=url;link.download=filename();doc.body.append(link);link.click();link.remove();jobs.expireURL();el.status.textContent=copy.downloaded;
  });
  const clear = () => { jobs.dispose(); el.source.value = ''; el.file.value = ''; dispatch({ type: 'clear' }); };
  el.clear.addEventListener('click', clear); capabilities.addEventListener?.('pagehide', clear);
  render();
  return { getSession: () => session, dispose: clear };
}
if (typeof document !== 'undefined' && document.getElementById('source') && !document.documentElement.hasAttribute('data-harness')) mount();
