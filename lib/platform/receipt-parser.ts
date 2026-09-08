import { parseMoney } from './model.ts';
import type { Category, LineDraft } from './types.ts';
export function suggestCategory(description: string): Category {
  const s = description.toLowerCase();
  if (/vaccin|examination|veterin|undersök|vet visit/.test(s))
    return 'vaccination';
  if (/medicin|medicine|antibiot|tablett|läkemedel/.test(s)) return 'medicine';
  if (/rehab|recovery|physio/.test(s)) return 'rehabilitation';
  if (/toy|toys|bone|chew|ball|leksak|tuggben|boll/.test(s)) return 'play';
  if (/food|meal|kibble|treat|foder|mat|godis/.test(s)) return 'food';
  if (/walk|promenad/.test(s)) return 'walk';
  return 'comfort';
}
export function parseReceiptText(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lines: LineDraft[] = [];
  const warnings: string[] = [];
  let totalOre: number | null = null;
  let reference = '';
  let purchasedAt = '';
  for (const row of rows) {
    const ref = row.match(
      /(?:receipt|invoice|kvitto|faktura|reference)(?:\s*(?:no|nr|number))?\s*[:#]\s*(.+)/i,
    );
    if (ref) reference = ref[1].trim();
    const day = row.match(/\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/);
    if (day) purchasedAt = `${day[1]}-${day[2]}-${day[3]}`;
    if (/^(?:grand\s+total|total|totalt|att betala|summa)\b/i.test(row)) {
      const match = row.match(/(\d[\d\s]*[.,]\d{2})\s*(?:SEK|kr)?$/i);
      if (match) totalOre = parseMoney(match[1]);
      continue;
    }
    if (/\b(?:vat|moms|tax|subtotal|change|cash|card|netto)\b/i.test(row))
      continue;
    const detailed = row.match(
      /^(.+?)\s+(\d{1,3})\s*[x×@]\s*(\d+(?:[.,]\d{2})?)\s*(?:SEK|kr)?(?:\s*[=|]\s*\d+(?:[.,]\d{2})?)?$/i,
    );
    const simple = detailed
      ? null
      : row.match(/^([\p{L}].{2,}?)\s+(\d+[.,]\d{2})\s*(?:SEK|kr)?$/u);
    const description = detailed?.[1] ?? simple?.[1];
    const unitOre = parseMoney(detailed?.[3] ?? simple?.[2] ?? '');
    const quantity = detailed ? Number(detailed[2]) : 1;
    if (description && unitOre && quantity > 0 && quantity <= 100)
      lines.push({
        description,
        category: suggestCategory(description),
        quantity,
        unitOre,
      });
  }
  const computed = lines.reduce((n, l) => n + l.quantity * l.unitOre, 0);
  if (totalOre === null)
    warnings.push(
      'Receipt total was not confidently read. Enter the printed total.',
    );
  if (!lines.length)
    warnings.push('No product lines were confidently read. Add them below.');
  if (totalOre !== null && computed !== totalOre)
    warnings.push(
      'The extracted products do not match the printed total. Check quantities, discounts and prices.',
    );
  if (!reference) warnings.push('Add the receipt or invoice number.');
  return {
    supplier: rows[0]?.slice(0, 180) ?? '',
    reference,
    purchasedAt,
    totalOre,
    lines,
    warnings,
    text,
  };
}
