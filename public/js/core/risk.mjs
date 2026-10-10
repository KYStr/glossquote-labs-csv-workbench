const leadingSpace = code => [9, 10, 13, 32, 0x00a0, 0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff].includes(code) || (code >= 0x2000 && code <= 0x200a);
export function hasFormulaRisk(value) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (leadingSpace(code)) { if (code === 9 || code === 10 || code === 13) return true; continue; }
    return '=+-@＝＋－＠'.includes(character);
  }
  return false;
}
export function analyzeRisk(records) {
  const cells = [];
  records.forEach((row, record) => row.forEach((value, field) => { if (hasFormulaRisk(value)) cells.push({ record: record + 1, field: field + 1 }); }));
  return { count: cells.length, cells };
}
export const protectCell = value => hasFormulaRisk(value) ? `'${value}` : value;
