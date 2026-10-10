import { parseCsv } from './core/csv.mjs';
import { projectRecords } from './core/selection.mjs';
import { analyzeRisk } from './core/risk.mjs';
import { serializeCsv, serializeOriginalJson } from './core/export.mjs';
import { fail } from './core/input.mjs';

export function processMessage(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || !Number.isSafeInteger(message.jobId) || message.jobId < 1) return fail('WORKER_FAILED');
  const keys = message.type === 'parse' ? ['type','jobId','source'] : message.type === 'export' ? ['type','jobId','records','indices','hasHeader','format'] : [];
  if (!keys.length || Object.keys(message).length !== keys.length || !Object.keys(message).every(key => keys.includes(key))) return fail('WORKER_FAILED');
  if (message.type === 'parse') return parseCsv(message.source);
  if (typeof message.hasHeader !== 'boolean' || !['protected','original','json'].includes(message.format)) return fail('WORKER_FAILED');
  const projected = projectRecords(message.records, message.indices); if (!projected.ok) return projected;
  const result = message.format === 'json' ? serializeOriginalJson(projected.value, message.indices, message.hasHeader) : serializeCsv(projected.value, message.format);
  return result.ok ? { ok: true, value: { bytes: result.value, riskCount: analyzeRisk(projected.value).count } } : result;
}
if (typeof self !== 'undefined') self.onmessage = event => {
  let result;
  try { result = processMessage(event.data); } catch { result = fail('WORKER_FAILED'); }
  const response = { type: event.data?.type === 'export' ? 'export-result' : 'parse-result', jobId: Number.isSafeInteger(event.data?.jobId) ? event.data.jobId : 0, ...result };
  if (result.ok && response.type === 'export-result') self.postMessage(response, [result.value.bytes.buffer]);
  else self.postMessage(response);
};
