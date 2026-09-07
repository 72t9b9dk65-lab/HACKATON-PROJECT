'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DogPortrait } from '@/components/dog-portrait';
import { DogName } from '@/components/dog-name';
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
      aria-controls="donation-spending-breakdown"
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
        {open ? 'Hide spending breakdown' : 'See where your money went'}{' '}
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
  open,
  onClose,
  onSelectDog,
}: {
  spending: Spending;
  open: boolean;
  onClose: () => void;
  onSelectDog: (id: string) => void;
}) {
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
      hidden={!open}
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
          aria-label="Close spending breakdown"
          onClick={onClose}
        >
          <X size={18} />
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
                    onClick={() => onSelectDog(dog.id)}
                    aria-label={`${dog.name}: ${kronor(spending.funding.byDog[dog.id].amountOre)} SEK used. See their care moment.`}
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
        Pending: {kronor(spending.pendingOre)} SEK awaiting expenses. Both views
        show the same recorded demo spending; forecasts are separate. Imported
        expenses use simulated dog assignments.
      </p>
    </section>
  );
}

export function ExpenseTransactions({
  expenses,
  selectedId,
  onReplay,
}: {
  expenses: DemoExpense[];
  selectedId?: string;
  onReplay: (expense: DemoExpense) => void;
}) {
  const sorted = [...expenses].sort(
    (a, b) =>
      Date.parse(b.recordedAt) - Date.parse(a.recordedAt) ||
      a.id.localeCompare(b.id),
  );
  return (
    <section
      className="expense-transactions"
      aria-labelledby="expense-transactions-title"
    >
      <h2 id="expense-transactions-title">Your care transactions</h2>
      <p>
        {expenses.length} demo expenses. Imported dates, amounts and categories
        come from your spreadsheet; dog assignments are simulated.
      </p>
      <div className="expense-transaction-list">
        {sorted.map((expense) => {
          const category = expenseCategories.find(
            (item) => item.id === expense.category,
          )!;
          const dog = profileDogs.find((item) => item.id === expense.dogId)!;
          return (
            <button
              type="button"
              key={expense.id}
              className="expense-transaction"
              onClick={() => onReplay(expense)}
              aria-pressed={selectedId === expense.id}
            >
              <img src={category.asset} alt="" width="46" height="46" />
              <span className="expense-transaction-copy">
                <strong>{expenseLabel(expense)}</strong>
                <span>
                  {dog.name}
                  {workbookTransaction(expense) ? ' (demo match)' : ''} ·{' '}
                  {kronor(expense.amountOre)} SEK
                </span>
                <time dateTime={expense.recordedAt}>
                  {expenseDateLabel(expense)}
                </time>
                <small>
                  <Play size={11} /> Replay care moment
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          );
        })}
        {!expenses.length && (
          <p className="spending-empty">
            No care expenses yet. Your donations remain pending until an expense
            is recorded.
          </p>
        )}
      </div>
    </section>
  );
}
