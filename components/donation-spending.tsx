'use client';

import { useDogCare } from '@/hooks/use-dog-care';

import { useState } from 'react';
import { ArrowLeft, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DogPortrait } from '@/components/dog-portrait';
import { DogName } from '@/components/dog-name';
import { ShelterPhotoDialog } from '@/components/shelter-photo-updates';
import { expensePhotoUpdate, type CareUpdate } from '@/lib/care-calendar';
import type { DonorTransaction } from '@/lib/staff-portal';
import {
  expenseCategories,
  expenseDateLabel,
  expenseLabel,
  type DemoExpense,
  type spendingSummary,
} from '@/lib/donation-spending';
import { workbookTransaction } from '@/lib/workbook-transactions';
import { kronor, profileDogs } from '@/lib/donation-shell';

type Spending = ReturnType<typeof spendingSummary>;
export function DonationBalance({
  spending,
  open,
  onToggle,
}: {
  spending: Spending;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="donation-wallet"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="personal-shelter-view"
    >
      <span className="donation-wallet-heading">
        Your total donated <small>DEMO</small>
      </span>
      <strong className="donation-wallet-total">
        {kronor(spending.totalOre)} <small>SEK</small>
      </strong>
      <span className="donation-wallet-split">
        <span>
          <span>
            <i className="pending-dot" />
            Pending
          </span>
          <strong>
            {kronor(spending.pendingOre)} <small>SEK</small>
          </strong>
        </span>
        <span>
          <span>
            <i className="used-dot" />
            Used
          </span>
          <strong>
            {kronor(spending.usedOre)} <small>SEK</small>
          </strong>
        </span>
      </span>
      <span className="donation-wallet-meter" aria-hidden="true">
        <i
          style={{
            width: `${spending.totalOre ? (spending.usedOre / spending.totalOre) * 100 : 0}%`,
          }}
        />
      </span>
      <span className="donation-wallet-action">
        {open ? 'Back to your shelter' : 'See where your money went'}{' '}
        <ChevronDown size={17} />
      </span>
    </button>
  );
}

function SpendBar({ amount, max }: { amount: number; max: number }) {
  return (
    <div className="spending-bar-track" aria-hidden="true">
      <span style={{ height: `${max ? (amount / max) * 100 : 0}%` }} />
    </div>
  );
}

export function SpendingBreakdown({
  spending,
  onClose,
  onSelectDog,
}: {
  spending: Spending;
  onClose: () => void;
  onSelectDog: (id: string) => void;
}) {
  const { openDog } = useDogCare();
  const [view, setView] = useState('categories');
  const dogs = profileDogs.filter((dog) =>
    spending.residentIds.includes(dog.id),
  );
  const categoryMax = Math.max(1, ...Object.values(spending.byCategory));
  const dogMax = Math.max(
    1,
    ...dogs.map((dog) => spending.funding.byDog[dog.id].amountOre),
  );
  return (
    <section
      id="donation-spending-breakdown"
      className="spending-breakdown"
      aria-labelledby="spending-breakdown-title"
    >
      <div className="spending-breakdown-heading">
        <div>
          <span className="donation-eyebrow">WHERE YOUR GIFT IS USED</span>
          <h2 id="spending-breakdown-title">
            {kronor(spending.usedOre)} SEK put to work
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          aria-label="Back to your shelter"
          onClick={onClose}
        >
          <ArrowLeft size={18} /> Back to shelter
        </Button>
      </div>
      <Tabs value={view} onValueChange={(value) => setView(String(value))}>
        <TabsList aria-label="Show spending by">
          <TabsTrigger value="categories">Goods & services</TabsTrigger>
          <TabsTrigger value="dogs">Dogs in your shelter</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <div
            className="spending-columns"
            role="list"
            aria-label="Used donation by goods and services"
          >
            {expenseCategories.map((category) => (
              <div
                className="spending-column"
                role="listitem"
                key={category.id}
              >
                <strong className="spending-column-value">
                  {kronor(spending.byCategory[category.id])} <small>SEK</small>
                </strong>
                <SpendBar
                  amount={spending.byCategory[category.id]}
                  max={categoryMax}
                />
                <img
                  className="spending-category-art"
                  src={category.asset}
                  alt=""
                  width="72"
                  height="72"
                />
                <span>{category.label}</span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="dogs">
          {dogs.length ? (
            <div
              className="spending-columns spending-dog-columns"
              role="list"
              aria-label="Used donation per shelter dog"
            >
              {dogs.map((dog) => (
                <div role="listitem" key={dog.id}>
                  <button
                    type="button"
                    className="spending-column spending-dog-column"
                    onClick={() => {
                      onSelectDog(dog.id);
                      openDog(dog.id);
                    }}
                    aria-label={`${dog.name}: ${kronor(spending.funding.byDog[dog.id].amountOre)} SEK used. Open their profile.`}
                  >
                    <strong className="spending-column-value">
                      {kronor(spending.funding.byDog[dog.id].amountOre)}{' '}
                      <small>SEK</small>
                    </strong>
                    <SpendBar
                      amount={spending.funding.byDog[dog.id].amountOre}
                      max={dogMax}
                    />
                    <DogPortrait dog={dog} />
                    <DogName name={dog.name} />
                    <span className="spending-dog-breed">{dog.breed}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="spending-empty">
              Your first recorded care expense will bring a dog into your
              shelter.
            </p>
          )}
        </TabsContent>
      </Tabs>
      <p className="spending-breakdown-note">
        Pending: {kronor(spending.pendingOre)} SEK awaiting expenses. Categories
        include every recorded cost. Dogs are linked when staff attach a care
        photo and identify the recipients. Imported expenses use simulated dog
        assignments.
      </p>
    </section>
  );
}

export function ExpenseTransactions({
  expenses,
  transactions,
  selectedId,
  onReplay,
}: {
  expenses: DemoExpense[];
  transactions: DonorTransaction[];
  selectedId?: string;
  onReplay: (expense: DemoExpense) => void;
}) {
  const { events, now } = useDogCare();
  const [photoExpenseId, setPhotoExpenseId] = useState<string | null>(null);
  const photoExpense = expenses.find(
    (expense) => expense.id === photoExpenseId,
  );
  const openedPhoto = photoExpense
    ? expensePhotoUpdate(events, photoExpense, now)
    : undefined;
  const sorted = [...transactions].sort(
    (a, b) =>
      Date.parse(b.recordedAt) - Date.parse(a.recordedAt) ||
      a.id.localeCompare(b.id),
  );
  return (
    <section
      className="expense-transactions"
      aria-labelledby="expense-transactions-title"
    >
      <h2 id="expense-transactions-title">What your donation funded</h2>
      <div className="expense-transaction-list">
        {sorted.map((transaction) => {
          const expense = transaction.expenses[0];
          const category = expenseCategories.find(
            (item) => item.id === transaction.category,
          )!;
          const names = transaction.expenses
            .map((e) => profileDogs.find((d) => d.id === e.dogId)!.name)
            .join(', ');
          const photo = transaction.expenses
            .map((e) => expensePhotoUpdate(events, e, now))
            .find(Boolean);
          const title = transaction.legacy
            ? expenseLabel(transaction.legacy)
            : transaction.description;
          const dateLabel = expenseDateLabel({
            recordedAt: transaction.recordedAt,
          } as DemoExpense);
          const selected = transaction.expenses.some(
            (e) => e.id === selectedId,
          );
          return (
            <div
              key={transaction.id}
              className="expense-transaction"
              data-selected={selected}
            >
              <button
                type="button"
                className="expense-transaction-main"
                disabled={!expense}
                onClick={() => {
                  if (expense) onReplay(expense);
                }}
                aria-pressed={selected}
                aria-label={`${title}, ${kronor(transaction.amountOre)} SEK, ${dateLabel}.${expense ? ' Replay care.' : ' Awaiting a staff photo and dog assignment.'}`}
              >
                <img src={category.asset} alt="" width="46" height="46" />
                <span className="expense-transaction-copy">
                  <strong>{title}</strong>
                  <span>
                    {names || 'Awaiting care photo'}
                    {transaction.legacy &&
                    !transaction.photos.length &&
                    workbookTransaction(transaction.legacy)
                      ? ' (demo match)'
                      : ''}{' '}
                    · {kronor(transaction.amountOre)} SEK
                  </span>
                  <time dateTime={transaction.recordedAt}>{dateLabel}</time>
                  {!!transaction.products?.length && (
                    <span className="expense-owned-products">
                      {transaction.products.map((product) => (
                        <span key={product.id}>
                          {product.name} · {kronor(product.amountOre)} SEK
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
              <TransactionPhotoButton
                photo={photo}
                dogName={names || 'this dog'}
                onOpen={() => {
                  if (photo) setPhotoExpenseId(photo.expenseId);
                }}
              />
            </div>
          );
        })}
        {!transactions.length && (
          <p className="spending-empty">
            No care expenses yet. Your donations remain pending until an expense
            is recorded.
          </p>
        )}
      </div>
      <ShelterPhotoDialog
        event={openedPhoto ?? null}
        onClose={() => setPhotoExpenseId(null)}
      />
    </section>
  );
}

function TransactionPhotoButton({
  photo,
  dogName,
  onOpen,
}: {
  photo?: CareUpdate;
  dogName: string;
  onOpen: () => void;
}) {
  const src = photo?.photos[0]?.src;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const available = !!src && src !== failedSrc;
  return (
    <button
      type="button"
      className="expense-transaction-photo"
      disabled={!photo}
      onClick={onOpen}
      aria-label={
        photo
          ? `View ${dogName}’s transaction photo`
          : 'No photo available for this transaction'
      }
      title={photo ? 'View transaction photo' : 'No photo available'}
    >
      {available ? (
        <img
          src={src}
          alt=""
          width="44"
          height="44"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <ImageIcon size={24} aria-hidden="true" />
      )}
    </button>
  );
}
