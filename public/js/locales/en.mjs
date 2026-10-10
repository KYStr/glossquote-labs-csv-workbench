export default {
  fileHelp: 'A successful read replaces the text below. Maximum 1 MiB.', fileUnsupported: 'File reading is unavailable in this browser. You can still paste CSV text.',
  fileHint: 'Using the original file text, including line breaks inside cells. Editing switches the source to LF line breaks.',
  textHint: 'Pasted or edited text uses LF line breaks, including line breaks inside quoted cells.',
  idle: 'Paste comma-separated text or choose a UTF-8 CSV file.', dirty: 'The source changed. Preview the CSV again.',
  reading: 'Reading the selected CSV…', parsing: 'Checking the CSV structure…', preparingExport: 'Preparing the export copy…',
  exportReady: 'The export is ready. Review the copy before downloading.', empty: 'No CSV data. Paste text or choose a file.',
  headerOnly: 'Column names only, with no data rows. You can still export the column names.', noColumns: 'No columns selected. Keep at least one column.',
  noRisk: '✓ Selected cells did not trigger this tool’s formula-risk rules. Other applications may still infer types. Check their import settings.',
  original: 'Original value', protected: 'Protected copy value',
  downloaded: 'The download has started. Clearing this page does not delete downloaded files.',
  formatProtected: 'The protected copy prefixes possible formula values with an apostrophe. This changes the strings. Check the downloaded content.',
  formatOriginal: 'Original CSV preserves selected cell strings and their order. Quote style and record separators are not a byte-for-byte copy of the file.',
  formatJson: 'Original JSON preserves all selected strings, including column names, in schemaVersion 1. JSON re-import is not supported.',
  column: n => `Column ${n}`, ready: n => `Loaded ${n} data ${n === '1' ? 'row' : 'rows'}. Choose the columns to keep.`,
  summary: (rows, selected, total) => `${rows} data ${rows === '1' ? 'row' : 'rows'}, ${selected} of ${total} columns selected`, page: (current,total) => `Page ${current} of ${total}`,
  risk: n => `⚠ ${n} selected ${n === '1' ? 'cell' : 'cells'} may be interpreted as formulas by a spreadsheet. Original CSV is disabled. Review the protected copy or choose original JSON.`,
  changed: (name,size,count) => `${name} (${size} bytes) · ${count} ${count === '1' ? 'cell' : 'cells'} changed`, unchanged: (name,size) => `${name} (${size} bytes) · original cell strings preserved`,
  coordinate: (record,field) => `Record ${record} / source column ${field}`,
  errors: {
    FILE_TYPE: 'Choose one file with a .csv extension. Excel files are not supported.', INPUT_TOO_LARGE: 'The source exceeds 1 MiB. Use a smaller file or split the data.',
    INVALID_UTF8: 'The file is not valid UTF-8. Save it as UTF-8 CSV in the original application and try again.', INVALID_UNICODE: 'The source contains incomplete Unicode characters. Correct it and try again.', UNSUPPORTED_CONTROL: 'The source contains unsupported control characters. Remove them and try again.',
    CSV_SYNTAX: 'The CSV structure is incomplete. Check quotes and separators.', COLUMN_MISMATCH: 'This record has a different column count from the first record. Correct the source; this tool does not fill missing columns.',
    ROW_LIMIT: 'The source exceeds 5,000 records, including the header. Split the data.', COLUMN_LIMIT: 'The source exceeds 50 columns. Use a smaller file.', CELL_LIMIT: 'The source exceeds 100,000 cells, including the header. Split the data.', FIELD_TOO_LONG: 'A cell exceeds 16,384 UTF-16 units. Shorten the source value.',
    NO_COLUMNS: 'Select at least one column.', FORMULA_RISK: 'Selected cells have formula risk, so original CSV cannot be exported. Choose the protected copy or original JSON.', OUTPUT_TOO_LARGE: 'The output exceeds 4 MiB. Select fewer columns.',
    UNSUPPORTED: 'This browser lacks the required local processing capabilities.', TIMEOUT: 'The job exceeded five seconds and was stopped. Try a smaller source.', READ_FAILED: 'The file could not be read. Your previous source is kept. Choose the file again.', WORKER_FAILED: 'Local processing did not complete and was stopped. Preview the source again.', INVALID_SELECTION: 'The column selection is invalid. Preview the source and select columns again.', INVALID_PAGE: 'This page does not exist. Preview the source again.'
  }
};
