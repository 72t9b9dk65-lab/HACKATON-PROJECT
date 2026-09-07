'use client';

import { useState } from 'react';
import { Package, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useStaffLedger } from '@/hooks/use-staff-ledger';
import { kronor } from '@/lib/donation-shell';
import { expandProductUnits } from '@/lib/product-allocation';
import {
  parseReceiptAmount,
  setTransactionProducts,
  type PortalTransaction,
} from '@/lib/staff-portal';

export function TransactionProductsEditor({
  transaction,
  store,
  onSaved,
}: {
  transaction: PortalTransaction;
  store: ReturnType<typeof useStaffLedger>;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState(() =>
    transaction.products?.length
      ? transaction.products.map((product) => ({
          id: product.id,
          name: product.name,
          quantity: '1',
          price: String(product.amountOre / 100),
        }))
      : [
          {
            id: 'first-product',
            name: '',
            quantity: '1',
            price: String(transaction.amountOre / 100),
          },
        ],
  );
  const [error, setError] = useState('');
  const total = rows.reduce(
    (sum, row) =>
      sum + (parseReceiptAmount(row.price) ?? 0) * (Number(row.quantity) || 0),
    0,
  );
  const count = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  function change(
    id: string,
    field: 'name' | 'quantity' | 'price',
    value: string,
  ) {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }
  async function save() {
    setError('');
    try {
      const products = rows.flatMap((row) =>
        expandProductUnits(
          crypto.randomUUID(),
          row.name.trim(),
          Number(row.quantity),
          parseReceiptAmount(row.price) ?? 0,
        ),
      );
      const failure = await store.updateStaff((staff, base) =>
        setTransactionProducts(staff, base, transaction.id, products),
      );
      if (failure) setError(failure);
      else onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  return (
    <>
      <DialogTitle>
        <Package size={23} /> Purchased products
      </DialogTitle>
      <DialogDescription>
        {transaction.description} · {kronor(transaction.amountOre)} SEK. Enter
        each product’s price. Use separate rows for items with different prices.
      </DialogDescription>
      <form
        className="staff-product-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {!transaction.products?.length && (
          <p className="staff-form-note">
            This record contains a category total only. Enter the products from
            the receipt.
          </p>
        )}
        {rows.map((row, index) => (
          <div className="staff-product-edit-row" key={row.id}>
            <label>
              Product {index + 1}
              <input
                required
                maxLength={160}
                value={row.name}
                placeholder="e.g. Chew bone"
                onChange={(e) => change(row.id, 'name', e.target.value)}
              />
            </label>
            <label>
              Quantity
              <input
                required
                type="number"
                min="1"
                max="100"
                step="1"
                value={row.quantity}
                onChange={(e) => change(row.id, 'quantity', e.target.value)}
              />
            </label>
            <label>
              Unit price · SEK
              <input
                required
                inputMode="decimal"
                value={row.price}
                placeholder="0.00"
                onChange={(e) => change(row.id, 'price', e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              disabled={rows.length === 1}
              aria-label={`Remove product ${index + 1}`}
              onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
            >
              <X size={16} />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={count >= 100}
          onClick={() =>
            setRows([
              ...rows,
              { id: crypto.randomUUID(), name: '', quantity: '1', price: '' },
            ])
          }
        >
          <Plus size={16} /> Add product
        </Button>
        <div
          className="staff-products-total"
          data-matched={total === transaction.amountOre}
        >
          <span>
            {count} products · {kronor(total)} SEK listed
          </span>
          <strong>
            {total === transaction.amountOre
              ? 'Matches transaction total'
              : `${kronor(Math.abs(transaction.amountOre - total))} SEK ${total > transaction.amountOre ? 'over the total' : 'still to itemize'}`}
          </strong>
        </div>
        <p className="staff-form-note">
          Each product is paid in full by one donor. Assignments balance the
          cost across available portfolios; product prices are never divided.
        </p>
        {error && (
          <p role="alert" className="staff-error">
            {error}
          </p>
        )}
        <Button
          className="staff-primary"
          type="submit"
          disabled={
            store.busy ||
            total !== transaction.amountOre ||
            count > 100 ||
            count < 1
          }
        >
          {store.busy ? 'Assigning…' : 'Save products & assign donors'}
        </Button>
      </form>
    </>
  );
}
