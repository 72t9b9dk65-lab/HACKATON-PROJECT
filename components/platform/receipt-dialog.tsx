'use client';
import { useState } from 'react';
import {
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  ScanLine,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadCareFile, type CareStore } from '@/hooks/use-care-workspace';
import {
  categories,
  expandLines,
  allocateProducts,
  balances,
  money,
  parseMoney,
} from '@/lib/platform/model';
import { parseReceiptText } from '@/lib/platform/receipt-parser';
import type {
  Category,
  FileRecord,
  Receipt,
  ReceiptDraft,
} from '@/lib/platform/types';
import { Modal, Notice, Primary } from './shared';

type Row = {
  key: string;
  description: string;
  category: Category;
  quantity: string;
  price: string;
};
const newRow = (): Row => ({
  key: crypto.randomUUID(),
  description: '',
  category: 'food',
  quantity: '1',
  price: '',
});
const today = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(
    new Date(),
  );
export function ReceiptDialog({
  store,
  receipt,
  onClose,
  onSaved,
}: {
  store: CareStore;
  receipt?: Receipt;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const itemizing = receipt?.source === 'workbook' && !receipt.itemizedAt;
  const [supplier, setSupplier] = useState(receipt?.supplier ?? '');
  const [reference, setReference] = useState(receipt?.reference ?? '');
  const [day, setDay] = useState(receipt?.purchasedAt.slice(0, 10) ?? today());
  const [total, setTotal] = useState(
    receipt ? String(receipt.totalOre / 100) : '',
  );
  const [rows, setRows] = useState<Row[]>(() =>
    receipt && !itemizing
      ? receipt.products.map((p) => ({
          key: crypto.randomUUID(),
          description: p.description,
          category: p.category,
          quantity: '1',
          price: String(p.amountOre / 100),
        }))
      : [newRow()],
  );
  const [file, setFile] = useState<FileRecord | null>(receipt?.file ?? null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [engine, setEngine] = useState('');
  const [extracted, setExtracted] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const lines = rows.map((r) => ({
    description: r.description,
    category: r.category,
    quantity: Number(r.quantity),
    unitOre: parseMoney(r.price) ?? 0,
  }));
  const computed = lines.reduce((n, l) => n + l.quantity * l.unitOre, 0);
  const printed = itemizing ? receipt!.totalOre : parseMoney(total);
  const valid =
    !!printed &&
    printed === computed &&
    lines.every(
      (l) =>
        l.description.trim() &&
        Number.isInteger(l.quantity) &&
        l.quantity > 0 &&
        l.quantity <= 100 &&
        l.unitOre > 0,
    );
  let allocation: ReturnType<typeof allocateProducts> = [];
  let allocationError = '';
  if (valid && !itemizing && store.state) {
    try {
      allocation = allocateProducts(
        expandLines(lines, 'preview'),
        balances(store.state),
      );
    } catch (e) {
      allocationError =
        e instanceof Error ? e.message : 'Not enough available donations.';
    }
  }
  function change(key: string, field: keyof Row, value: string) {
    setRows((rows) =>
      rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
    setReviewed(false);
  }
  function applyText(text: string) {
    const parsed = parseReceiptText(text);
    if (!itemizing) {
      setSupplier(parsed.supplier);
      setReference(parsed.reference);
      setDay(parsed.purchasedAt || today());
      setTotal(parsed.totalOre ? String(parsed.totalOre / 100) : '');
    }
    setRows(
      parsed.lines.length
        ? parsed.lines.map((l) => ({
            key: crypto.randomUUID(),
            description: l.description,
            category: l.category,
            quantity: String(l.quantity),
            price: String(l.unitOre / 100),
          }))
        : [newRow()],
    );
    setWarnings(parsed.warnings);
    setExtracted(text);
    setReviewed(false);
  }
  async function readFile(selected: File) {
    if (selected.size > 12_000_000) {
      setError('Each document must be smaller than 12 MB.');
      return;
    }
    setReading(true);
    setError('');
    setWarnings([]);
    setEngine('');
    setReviewed(false);
    setFile(null);
    const results = await Promise.allSettled([
      uploadCareFile(selected),
      fetch('/api/receipt-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': selected.type || 'application/octet-stream',
        },
        body: selected,
      }).then(async (response) => {
        const data = (await response.json()) as {
          text?: string;
          engine?: string;
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error ?? 'Automatic reading is unavailable.');
        return data;
      }),
    ]);
    const upload = results[0],
      ocr = results[1];
    if (upload.status === 'fulfilled') setFile(upload.value);
    else
      setError(
        upload.reason instanceof Error
          ? upload.reason.message
          : 'The document could not be saved.',
      );
    if (ocr.status === 'fulfilled' && ocr.value.text) {
      applyText(ocr.value.text);
      setEngine(ocr.value.engine ?? 'Document text');
    } else {
      setExtracted('');
      setWarnings([
        'Automatic reading did not find reliable text. You can enter the product details below.',
      ]);
    }
    setReading(false);
  }
  async function selectFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 10);
    setQueue(selected.slice(1));
    setSavedCount(0);
    await readFile(selected[0]);
  }
  async function sample() {
    const text = `Sample Care Supplies\nReceipt: CARE-${Date.now().toString().slice(-8)}\nDate: ${today()}\nDog food 2 x 50.00\nRehabilitation session 1 x 120.00\nChew toy 2 x 35.00\nTotal 290.00 SEK\nCare document template.`;
    setQueue([]);
    await readFile(
      new File([text], 'sample-care-receipt.txt', { type: 'text/plain' }),
    );
  }
  async function save() {
    setError('');
    if (!valid || !reviewed) return;
    if (itemizing && !file) {
      setError('Attach the original receipt to verify the product details.');
      return;
    }
    const draft: ReceiptDraft = {
      supplier,
      reference,
      purchasedAt: day,
      totalOre: printed!,
      lines,
      file,
    };
    const action = itemizing
      ? { type: 'itemize' as const, receiptId: receipt!.id, lines, file: file! }
      : receipt
        ? { type: 'edit-receipt' as const, receiptId: receipt.id, draft }
        : { type: 'receipt' as const, draft };
    if (await store.send(action)) {
      const count = savedCount + 1;
      setSavedCount(count);
      if (queue.length) {
        const [next, ...rest] = queue;
        setQueue(rest);
        await readFile(next);
      } else {
        onSaved(
          itemizing
            ? 'Product details added. Existing donor balances are unchanged.'
            : `${count === 1 ? 'Receipt saved' : `${count} receipts saved`}. Review the allocation before using donations.`,
        );
        onClose();
      }
    }
  }
  const donorTotals =
    store.state?.donors
      .map((d) => ({
        ...d,
        amount: allocation
          .flatMap((p) => p.shares)
          .filter((s) => s.donorId === d.id)
          .reduce((n, s) => n + s.amountOre, 0),
      }))
      .filter((d) => d.amount > 0) ?? [];
  return (
    <Modal
      wide
      open
      onClose={() => {
        if (!reading && !store.busy) onClose();
      }}
      title={
        itemizing
          ? 'Add the original product details'
          : receipt
            ? 'Edit pending receipt'
            : 'Add receipts or invoices'
      }
      description={
        itemizing
          ? 'Replace the workbook placeholder with the purchased items. The recorded total and donor contributions stay unchanged.'
          : 'Upload a document, check the products, then save. Donations are used only when you confirm the allocation.'
      }
    >
      <div className="cp-receipt-flow">
        <span className="active">
          <b>1</b> Read
        </span>
        <span className={file ? 'active' : ''}>
          <b>2</b> Review
        </span>
        <span>
          <b>3</b> Allocate
        </span>
      </div>
      <div
        className={`cp-upload-zone ${reading ? 'cp-reading' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!reading) void selectFiles(e.dataTransfer.files);
        }}
      >
        {reading ? (
          <>
            <LoaderCircle className="cp-spin" size={28} />
            <strong>Reading your document…</strong>
            <span>You can review every field before saving.</span>
          </>
        ) : (
          <>
            <UploadCloud size={28} />
            <strong>
              {file ? file.name : 'Drop receipts here, or choose files'}
            </strong>
            <span>Images, PDF or text · up to 10 files · 12 MB each</span>
            <label className="cp-file-picker">
              {file ? 'Choose another document' : 'Choose files'}
              <input
                type="file"
                multiple={!receipt}
                accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                onChange={(e) => void selectFiles(e.target.files)}
                disabled={reading}
              />
            </label>
          </>
        )}
      </div>
      {!!queue.length && (
        <Notice>
          {savedCount} saved · {queue.length + 1} documents left to review. Each
          receipt gets its own products.
        </Notice>
      )}
      {!receipt && !file && !reading && (
        <button className="cp-text-link" onClick={() => void sample()}>
          <FileText size={15} /> Try a clearly marked sample receipt
        </button>
      )}
      {engine && (
        <span className="cp-extraction-status">
          <ScanLine size={16} />
          {engine} · Check the highlighted fields
        </span>
      )}
      {warnings.length > 0 && <Notice>{warnings.join(' ')}</Notice>}
      {(error || store.error) && (
        <Notice kind="error">{error || store.error}</Notice>
      )}
      <div className="cp-receipt-fields">
        <label className="cp-field">
          Supplier
          <input
            value={supplier}
            disabled={itemizing || reading}
            maxLength={180}
            onChange={(e) => {
              setSupplier(e.target.value);
              setReviewed(false);
            }}
            placeholder="Supplier name"
          />
        </label>
        <label className="cp-field">
          Receipt / invoice number
          <input
            value={reference}
            disabled={itemizing || reading}
            maxLength={180}
            onChange={(e) => {
              setReference(e.target.value);
              setReviewed(false);
            }}
            placeholder="e.g. HS-1042"
          />
        </label>
        <label className="cp-field">
          Purchase date
          <input
            type="date"
            value={day}
            disabled={itemizing || reading}
            max={today()}
            onChange={(e) => {
              setDay(e.target.value);
              setReviewed(false);
            }}
          />
        </label>
      </div>
      <div className="cp-section-title">
        <h3>Purchased products & services</h3>
        <span>
          {lines.reduce(
            (n, l) => n + (Number.isInteger(l.quantity) ? l.quantity : 0),
            0,
          )}{' '}
          items
        </span>
      </div>
      <div className="cp-line-editor">
        <div className="cp-line-head">
          <span>Product or service</span>
          <span>Category</span>
          <span>Qty</span>
          <span>Unit price, SEK</span>
          <span />
        </div>
        {rows.map((row, i) => (
          <div className="cp-line-row" key={row.key}>
            <input
              aria-label={`Product ${i + 1}`}
              value={row.description}
              maxLength={180}
              onChange={(e) => change(row.key, 'description', e.target.value)}
              placeholder="Product or service"
            />
            <select
              aria-label={`Category for product ${i + 1}`}
              value={row.category}
              onChange={(e) => change(row.key, 'category', e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              aria-label={`Quantity for product ${i + 1}`}
              type="number"
              min={1}
              max={100}
              step={1}
              value={row.quantity}
              onChange={(e) => change(row.key, 'quantity', e.target.value)}
            />
            <input
              aria-label={`Unit price for product ${i + 1}`}
              inputMode="decimal"
              value={row.price}
              onChange={(e) => change(row.key, 'price', e.target.value)}
              placeholder="0.00"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove product ${i + 1}`}
              disabled={rows.length === 1}
              onClick={() => {
                setRows(rows.filter((r) => r.key !== row.key));
                setReviewed(false);
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        disabled={rows.length >= 60}
        onClick={() => {
          setRows([...rows, newRow()]);
          setReviewed(false);
        }}
      >
        <Plus size={16} /> Add product
      </Button>
      <div className="cp-receipt-reconcile">
        <label className="cp-field">
          Printed receipt total, SEK
          <input
            inputMode="decimal"
            value={total}
            disabled={itemizing}
            onChange={(e) => {
              setTotal(e.target.value);
              setReviewed(false);
            }}
            placeholder="0.00"
          />
        </label>
        <div>
          <small>Sum of products</small>
          <strong>{money(computed)} SEK</strong>
          <span className={valid ? 'cp-reconciled' : 'cp-mismatch'}>
            {valid ? (
              <>
                <CheckCircle2 size={14} /> Totals match
              </>
            ) : printed ? (
              `${money(Math.abs(printed - computed))} SEK difference`
            ) : (
              'Enter the printed total'
            )}
          </span>
        </div>
      </div>
      <p className="cp-fine-print">
        Use the final price paid, including tax and any discount. Identical
        units keep the same price; differently priced products get separate
        lines.
      </p>
      {valid && !itemizing && (
        <details className="cp-details">
          <summary>Estimated allocation · {money(computed)} SEK</summary>
          {allocationError ? (
            <Notice>{allocationError}</Notice>
          ) : (
            <>
              <p>
                Each product or service is assigned whole to one available
                portfolio. Items that cannot fit an individual balance remain
                pending.
              </p>
              {donorTotals.map((d) => (
                <div className="cp-summary-row" key={d.id}>
                  <span>{d.name}</span>
                  <strong>{money(d.amount)} SEK</strong>
                </div>
              ))}
              <small>
                Final allocation uses the balances available when you confirm.
              </small>
            </>
          )}
        </details>
      )}
      <details className="cp-details">
        <summary>Read or paste document text</summary>
        <textarea
          aria-label="Receipt text"
          rows={6}
          value={extracted}
          onChange={(e) => setExtracted(e.target.value)}
          placeholder="Paste text from your receipt here"
        />
        <Button
          variant="outline"
          disabled={!extracted.trim() || reading}
          onClick={() => applyText(extracted)}
        >
          Extract product lines
        </Button>
      </details>
      <label className="cp-review-check">
        <input
          type="checkbox"
          checked={reviewed}
          disabled={!valid || reading}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        <span>
          I checked the quantities, categories and prices against the receipt.
        </span>
      </label>
      <div className="cp-modal-actions">
        <Button
          variant="ghost"
          disabled={reading || store.busy}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Primary
          disabled={
            !valid ||
            !reviewed ||
            reading ||
            store.busy ||
            (!itemizing && (!supplier.trim() || !reference.trim() || !day))
          }
          onClick={() => void save()}
        >
          {store.busy ? (
            <LoaderCircle className="cp-spin" size={16} />
          ) : (
            <CheckCircle2 size={17} />
          )}{' '}
          {itemizing
            ? 'Confirm product details'
            : queue.length
              ? 'Save & review next'
              : 'Save for allocation'}
        </Primary>
      </div>
    </Modal>
  );
}
