import fixture from '../public/data/hundstallet/fake-transactions.json' with { type: 'json' };
export const WORKBOOK_IMPORT_ID = 'workbook-import-b5c0fff39efefbbb';

// A source row number is not a unique transaction ID: retain repeated rows.
const occurrences = new Map<number, number>();
export const workbookRows = fixture.transactions.map((row) => {
  const occurrence = (occurrences.get(row.row) ?? 0) + 1;
  occurrences.set(row.row, occurrence);
  return { ...row, key: `${row.row}${occurrence > 1 ? `-${occurrence}` : ''}` };
});
