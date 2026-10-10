import { LIMITS, validateSource, ok, fail } from './input.mjs';

export function validateRecords(records) {
  if (!Array.isArray(records)) return fail('INVALID_SELECTION');
  if (records.length > LIMITS.rows) return fail('ROW_LIMIT');
  if (!records.length) return ok(0);
  if (!Array.isArray(records[0]) || !records[0].length) return fail('NO_COLUMNS');
  const width = records[0].length;
  if (width > LIMITS.columns) return fail('COLUMN_LIMIT');
  if (width * records.length > LIMITS.cells) return fail('CELL_LIMIT');
  let bytes = 0;
  const encoder = new TextEncoder();
  for (let r = 0; r < records.length; r++) {
    if (!Array.isArray(records[r]) || records[r].length !== width) return fail('COLUMN_MISMATCH', r + 1);
    for (let c = 0; c < width; c++) {
      const value = records[r][c];
      if (typeof value !== 'string') return fail('INVALID_SELECTION', r + 1, c + 1);
      if (value.length > LIMITS.field) return fail('FIELD_TOO_LONG', r + 1, c + 1);
      const valid = validateSource(value); if (!valid.ok) return valid;
      bytes += encoder.encode(value).byteLength;
      if (bytes > LIMITS.input) return fail('INPUT_TOO_LARGE');
    }
  }
  return ok(width);
}
export function validIndices(indices, width) {
  return Array.isArray(indices) && indices.length > 0 && indices.length <= width && indices.every((index, position) => Number.isSafeInteger(index) && index >= 0 && index < width && (!position || index > indices[position - 1]));
}
export function projectRecords(records, indices) {
  if (Array.isArray(indices) && !indices.length) return fail('NO_COLUMNS');
  const valid = validateRecords(records); if (!valid.ok) return valid;
  if (!validIndices(indices, valid.value)) return fail('INVALID_SELECTION');
  return ok(records.map(row => indices.map(index => row[index])));
}
export function makeLabels(records, hasHeader, locale = 'zh-Hant') {
  if (!records.length) return [];
  const english = locale === 'en';
  return records[0].map((value, index) => {
    const position = english ? `column ${index + 1}` : `第${index + 1}欄`;
    if (!hasHeader) return english ? `Column ${index + 1}` : position;
    if (value === '') return english ? `Unnamed (${position})` : `未命名（${position}）`;
    return records[0].filter(other => other === value).length > 1 ? `${value} (${position})` : value;
  });
}
export function pageRows(records, hasHeader, pageIndex) {
  if (typeof hasHeader !== 'boolean' || !Number.isSafeInteger(pageIndex) || pageIndex < 0) return fail('INVALID_PAGE');
  const count = Math.max(0, records.length - (hasHeader ? 1 : 0));
  if (pageIndex >= Math.max(1, Math.ceil(count / 100))) return fail('INVALID_PAGE');
  const start = (hasHeader ? 1 : 0) + pageIndex * 100;
  return ok(records.slice(start, start + 100));
}
