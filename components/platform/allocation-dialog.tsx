'use client';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shelterProgress } from '@/lib/platform/shelter-growth';
import { profileDogs } from '@/lib/donation-shell';
import { allocateProducts, balances, money } from '@/lib/platform/model';
import type { CareStore } from '@/hooks/use-care-workspace';
import { Modal, Notice, Primary, CategoryIcon } from './shared';
export function AllocationDialog({
  store,
  receiptId,
  onClose,
  onSaved,
}: {
  store: CareStore;
  receiptId: string;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const state = store.state!;
  const [reviewed, setReviewed] = useState<number | null>(null);
  const receipts = state.receipts
    .filter(
      (r) => r.state === 'draft' && (receiptId === 'all' || r.id === receiptId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const total = receipts.reduce((n, r) => n + r.totalOre, 0);
  const wallets = balances(state);
  let products: ReturnType<typeof allocateProducts> = [];
  let error = '';
  try {
    products = allocateProducts(
      receipts.flatMap((r) => r.products),
      wallets,
    );
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : 'The allocation could not be calculated.';
  }
  const plan = wallets.map((d) => ({
    ...d,
    cost: products
      .flatMap((p) => p.shares)
      .filter((s) => s.donorId === d.id)
      .reduce((n, s) => n + s.amountOre, 0),
  }));
  async function confirm() {
    if (reviewed !== state.revision || error || !receipts.length) return;
    if (
      await store.send(
        receiptId === 'all'
          ? { type: 'fund-pending' }
          : { type: 'fund', receiptId },
      )
    ) {
      onSaved(
        `${money(total)} SEK allocated to ${products.length} purchased items. You can now add their care photos.`,
      );
      onClose();
    }
  }
  return (
    <Modal
      wide
      open
      onClose={onClose}
      title="Distribute products to supporters"
      description="Each purchased item keeps its price and identity. Existing allocations stay unchanged."
    >
      <div className="cp-allocation-total">
        <span>
          {receipts.length} pending{' '}
          {receipts.length === 1 ? 'receipt' : 'receipts'} ·{' '}
          {products.length || receipts.flatMap((r) => r.products).length} items
        </span>
        <strong>
          {money(total)} <small>SEK</small>
        </strong>
      </div>
      {(error || store.error) && (
        <Notice kind="error">{error || store.error}</Notice>
      )}
      {!error && (
        <>
          <div className="cp-allocation-wallets">
            {plan.map((d) => {
              const before = shelterProgress(
                d.id,
                d.used,
                d.pending,
                0,
                profileDogs,
              );
              const after = shelterProgress(
                d.id,
                d.used + d.cost,
                d.pending - d.cost,
                0,
                profileDogs,
              );
              const upgrades = after.zones.filter(
                (z) => z.level > before.zones.find((b) => b.id === z.id)!.level,
              );
              return (
                <div key={d.id}>
                  <strong>{d.name}</strong>
                  <span>
                    {money(d.pending)} <ArrowRight size={14} />{' '}
                    {money(d.pending - d.cost)} SEK
                  </span>
                  <small>
                    {d.cost
                      ? `${money(d.cost)} SEK used for these products`
                      : 'No change'}
                  </small>
                  {upgrades.length > 0 && (
                    <small>
                      {upgrades
                        .map((z) => `${z.name} → Level ${z.level}`)
                        .join(' · ')}
                    </small>
                  )}
                  {d.cost > 0 && !upgrades.length && (
                    <small>Progress towards the next area upgrade</small>
                  )}
                </div>
              );
            })}
          </div>
          <details className="cp-details" open>
            <summary>Purchased items and their contributors</summary>
            <div className="cp-allocation-products">
              {products.map((p) => (
                <div key={p.id}>
                  <CategoryIcon category={p.category} />
                  <span>
                    <strong>{p.description}</strong>
                    <small>
                      {p.shares
                        .map(
                          (s) =>
                            `${state.donors.find((d) => d.id === s.donorId)!.name}: ${money(s.amountOre)} SEK`,
                        )
                        .join(' · ')}
                    </small>
                  </span>
                  <b>{money(p.amountOre)} SEK</b>
                </div>
              ))}
            </div>
          </details>
          <Notice>
            <LockKeyhole size={15} /> Confirming records these assignments.
            Corrections return funds through a visible history entry.
          </Notice>
        </>
      )}
      {reviewed !== null && reviewed !== state.revision && (
        <Notice>
          The workspace changed. Check the updated allocation and confirm the
          review again.
        </Notice>
      )}
      <label className="cp-review-check">
        <input
          type="checkbox"
          checked={reviewed === state.revision}
          disabled={!!error || !receipts.length}
          onChange={(e) =>
            setReviewed(e.target.checked ? state.revision : null)
          }
        />
        I reviewed the products and the available balances.
      </label>
      <div className="cp-modal-actions">
        <Button variant="ghost" onClick={onClose}>
          Keep pending
        </Button>
        <Primary
          disabled={
            !!error ||
            !receipts.length ||
            store.busy ||
            reviewed !== state.revision
          }
          onClick={() => void confirm()}
        >
          {store.busy ? (
            <LoaderCircle size={17} className="cp-spin" />
          ) : (
            <LockKeyhole size={17} />
          )}{' '}
          Confirm {money(total)} SEK allocation
        </Primary>
      </div>
    </Modal>
  );
}
