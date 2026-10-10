import { LIMITS, ok, fail } from './input.mjs';
import { validateRecords, validIndices } from './selection.mjs';
import { hasFormulaRisk, protectCell } from './risk.mjs';

export function createOutputWriter() {
  const chunks = []; let size = 0, rejected = false;
  return {
    append(chunk) {
      if (rejected) return fail('OUTPUT_TOO_LARGE');
      const bytes = new TextEncoder().encode(chunk);
      if (size + bytes.byteLength > LIMITS.output) { chunks.length = 0; size = 0; rejected = true; return fail('OUTPUT_TOO_LARGE'); }
      size += bytes.byteLength; chunks.push(bytes); return ok(undefined);
    },
    finish() {
      if (rejected) return fail('OUTPUT_TOO_LARGE');
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return ok(bytes);
    }
  };
}
export function serializeCsv(records, mode) {
  const valid = validateRecords(records); if (!valid.ok) return valid;
  if (!valid.value) return fail('NO_COLUMNS');
  if (!['protected', 'original'].includes(mode)) return fail('INVALID_SELECTION');
  if (mode === 'original' && records.some(row => row.some(hasFormulaRisk))) return fail('FORMULA_RISK');
  const writer = createOutputWriter();
  for (let index = 0; index < records.length; index++) {
    const row = records[index].map(value => '"' + (mode === 'protected' ? protectCell(value) : value).replaceAll('"', '""') + '"').join(',');
    const appended = writer.append((index ? '\r\n' : '') + row); if (!appended.ok) return appended;
  }
  return writer.finish();
}
export function serializeOriginalJson(records, sourceIndices, hasHeader) {
  const valid = validateRecords(records); if (!valid.ok) return valid;
  if (!valid.value) return fail('NO_COLUMNS');
  if (!validIndices(sourceIndices, LIMITS.columns) || sourceIndices.length !== valid.value || typeof hasHeader !== 'boolean') return fail('INVALID_SELECTION');
  const value = { schemaVersion: 1, format: 'csv-selection', hasHeader, sourceColumnIndices: [...sourceIndices], records };
  const writer = createOutputWriter(); const result = writer.append(JSON.stringify(value, null, 2));
  return result.ok ? writer.finish() : result;
}
