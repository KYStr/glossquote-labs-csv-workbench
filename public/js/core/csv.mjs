import { validateSource, LIMITS, ok, fail } from './input.mjs';

export function parseCsv(source) {
  const validated = validateSource(source);
  if (!validated.ok) return validated;
  const text = validated.value;
  const records = [];
  let row = [], chunks = [], length = 0, state = 'START_FIELD', touched = false, totalCells = 0, offset = 0;
  const error = code => fail(code, records.length + 1, row.length + 1, offset);
  const append = character => {
    if (length + character.length > LIMITS.field) return error('FIELD_TOO_LONG');
    chunks.push(character); length += character.length; return null;
  };
  const finishField = () => {
    if (row.length >= LIMITS.columns) return error('COLUMN_LIMIT');
    row.push(chunks.join('')); chunks = []; length = 0; return null;
  };
  const finishRecord = () => {
    if (records.length >= LIMITS.rows) return error('ROW_LIMIT');
    if (totalCells + row.length > LIMITS.cells) return error('CELL_LIMIT');
    if (records.length && row.length !== records[0].length) return error('COLUMN_MISMATCH');
    totalCells += row.length; records.push(row); row = []; touched = false; return null;
  };
  for (offset = 0; offset < text.length; offset++) {
    const character = text[offset];
    let rejected = null;
    if (state === 'QUOTED') {
      if (character === '"') state = 'AFTER_QUOTE';
      else rejected = append(character);
    } else if (character === ',' ) {
      rejected = finishField(); state = 'START_FIELD'; touched = true;
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[offset + 1] !== '\n') return error('CSV_SYNTAX');
      rejected = finishField() || finishRecord(); state = 'START_FIELD';
      if (character === '\r') offset++;
    } else if (character === '"') {
      if (state === 'UNQUOTED') return error('CSV_SYNTAX');
      if (state === 'AFTER_QUOTE') rejected = append('"');
      state = 'QUOTED'; touched = true;
    } else {
      if (state === 'AFTER_QUOTE') return error('CSV_SYNTAX');
      rejected = append(character); state = 'UNQUOTED'; touched = true;
    }
    if (rejected) return rejected;
  }
  if (state === 'QUOTED') return error('CSV_SYNTAX');
  if (state !== 'START_FIELD' || touched || row.length) {
    const rejected = finishField() || finishRecord();
    if (rejected) return rejected;
  }
  return ok(records);
}
