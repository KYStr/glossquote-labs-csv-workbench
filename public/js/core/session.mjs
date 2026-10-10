export function initialSession(jobId = 0) {
  return { phase: 'idle', jobId, sourceKind: 'text', rawSource: null, hasSource: false, records: [], indices: [], hasHeader: true, format: 'protected', pageIndex: 0, ack: false, output: null, outputJobId: null, error: null };
}
const invalidated = session => ({ ...session, jobId: session.jobId + 1, ack: false, output: null, outputJobId: null, error: null });
const withoutRecords = session => ({ ...invalidated(session), records: [], indices: [], pageIndex: 0 });
export function transition(session, event) {
  switch (event.type) {
    case 'clear': return initialSession(session.jobId + 1);
    case 'edit': return { ...withoutRecords(session), phase: 'dirty', sourceKind: 'text', rawSource: null, hasSource: event.hasSource };
    case 'read': return { ...withoutRecords(session), phase: 'reading' };
    case 'parse': return { ...withoutRecords(session), phase: 'parsing' };
    case 'file': return session.jobId === event.jobId && session.phase === 'reading' ? { ...session, phase: 'dirty', sourceKind: 'file', rawSource: event.source, hasSource: event.source.length > 0 } : session;
    case 'parsed': return session.jobId === event.jobId && session.phase === 'parsing' ? { ...session, phase: 'ready', records: event.records, indices: event.records[0]?.map((_, index) => index) ?? [], pageIndex: 0 } : session;
    case 'prepare': return { ...invalidated(session), phase: 'preparingExport' };
    case 'prepared': return session.jobId === event.jobId && session.phase === 'preparingExport' ? { ...session, phase: 'exportReady', output: event.output, outputJobId: event.jobId } : session;
    case 'error': return event.jobId === session.jobId ? { ...session, phase: 'error', error: event.error, ack: false, output: null, outputJobId: null } : session;
    case 'cancel': return { ...invalidated(session), phase: session.records.length ? 'ready' : session.hasSource ? 'dirty' : 'idle' };
    case 'select': return { ...invalidated(session), phase: 'ready', indices: [...event.indices] };
    case 'header': return { ...invalidated(session), phase: session.records.length ? 'ready' : session.phase, hasHeader: event.hasHeader, indices: session.records[0]?.map((_, index) => index) ?? [], pageIndex: 0 };
    case 'format': return { ...invalidated(session), phase: session.records.length ? 'ready' : session.phase, format: event.format };
    case 'page': return { ...session, pageIndex: event.pageIndex };
    case 'ack': return session.phase === 'exportReady' ? { ...session, ack: event.ack === true } : session;
    default: return session;
  }
}

// The same lifecycle owner is used by the app and deterministic delayed tests.
export function createJobController({ makeWorker, makeReader, releaseWorkerURL = () => {}, setTimer = setTimeout, clearTimer = clearTimeout, revokeURL = url => URL.revokeObjectURL(url) }) {
  let worker = null, reader = null, timer = null, generation = 0, url = null, urlTimer = null;
  const releaseURL = () => { if (urlTimer !== null) clearTimer(urlTimer); urlTimer = null; if (url !== null) revokeURL(url); url = null; };
  const dispose = () => {
    generation++;
    if (timer !== null) clearTimer(timer); timer = null;
    if (worker) worker.terminate(); worker = null;
    releaseWorkerURL();
    if (reader) { const previous = reader; reader = null; if (previous.readyState === 1) previous.abort(); }
    releaseURL();
  };
  return {
    dispose, releaseURL,
    ownURL(value) { releaseURL(); url = value; },
    expireURL() { urlTimer = setTimer(releaseURL, 1000); },
    run(message, onResult, onError) {
      dispose(); const token = generation;
      try {
        worker = makeWorker();
        const finish = callback => { if (generation !== token) return; dispose(); callback(); };
        worker.onmessage = event => finish(() => onResult(event.data));
        worker.onerror = () => finish(() => onError('WORKER_FAILED'));
        worker.onmessageerror = () => finish(() => onError('WORKER_FAILED'));
        timer = setTimer(() => finish(() => onError('TIMEOUT')), 5000);
        worker.postMessage(message);
      } catch { dispose(); onError('WORKER_FAILED'); }
    },
    read(file, onResult, onError) {
      dispose(); const token = generation;
      try {
        reader = makeReader();
        const current = reader;
        current.onload = () => { if (generation !== token) return; const result = current.result; current.onload = current.onerror = current.onabort = null; reader = null; onResult(result); };
        current.onerror = () => { if (generation !== token) return; dispose(); onError('READ_FAILED'); };
        current.onabort = () => { if (generation !== token) return; dispose(); onError('READ_FAILED'); };
        current.readAsArrayBuffer(file);
      } catch { dispose(); onError('READ_FAILED'); }
    }
  };
}
