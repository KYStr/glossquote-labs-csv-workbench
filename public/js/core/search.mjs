import { ok, fail } from './input.mjs';
import { validateRecords } from './selection.mjs';

export const QUERY_LIMIT = 256;

export function validateQuery(query) {
  if (typeof query !== 'string') return fail('INVALID_SEARCH_QUERY');
  if (query.length > QUERY_LIMIT) return fail('SEARCH_TOO_LONG');
  if (/[\r\n]/u.test(query)) return fail('INVALID_SEARCH_QUERY');
  for (let index = 0; index < query.length; index++) {
    const code = query.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = query.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return fail('INVALID_SEARCH_QUERY');
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) return fail('INVALID_SEARCH_QUERY');
  }
  return ok(query);
}

// Validate the bounded stored dataset, then search only one source column.
// Results contain positions only; no cell copies, projection or mutation.
export function findCells(records, hasHeader, sourceColumnIndex, query) {
  if (typeof hasHeader !== 'boolean') return fail('INVALID_SELECTION');
  const valid = validateRecords(records);
  if (!valid.ok) return valid;
  if (!Number.isSafeInteger(sourceColumnIndex) || sourceColumnIndex < 0 || sourceColumnIndex >= valid.value) return fail('INVALID_SELECTION');
  const checked = validateQuery(query);
  if (!checked.ok) return checked;
  const matches = [];
  if (query === '') return ok(matches);
  const start = hasHeader ? 1 : 0;
  for (let recordIndex = start; recordIndex < records.length; recordIndex++) {
    if (!records[recordIndex][sourceColumnIndex].includes(query)) continue;
    const dataRowNumber = recordIndex - start + 1;
    matches.push({ recordIndex, sourceColumnIndex, recordNumber: recordIndex + 1, fieldNumber: sourceColumnIndex + 1, dataRowNumber, pageIndex: Math.floor((dataRowNumber - 1) / 100), pageRowIndex: (dataRowNumber - 1) % 100 });
  }
  return ok(matches);
}
