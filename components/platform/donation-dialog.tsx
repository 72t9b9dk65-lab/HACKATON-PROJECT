'use client';
import { CareImage } from './care-image';
import { useState } from 'react';
import { ArrowRight, Heart, Repeat, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  carePlans,
  projectCare,
  forecastDays,
  type CarePlanId,
} from '@/lib/care-impact';
import { money, parseMoney } from '@/lib/platform/model';
import type { CareStore } from '@/hooks/use-care-workspace';
import { Modal, Notice, Primary } from './shared';
export type Preview = {
  amountOre: number;
  careId: CarePlanId;
  monthly: boolean;
  day: number;
  startDate: string;
  dogCount: number;
  units: number;
};
export function DonationDialog({
  open,
  onClose,
  store,
  donorId,
  onPreview,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  store: CareStore;
  donorId: string;
  onPreview: (preview: Preview) => void;
  onSuccess: (message: string) => void;
}) {
  const [amount, setAmount] = useState('100');
  const [careId, setCareId] = useState<CarePlanId>('food');
  const [monthly, setMonthly] = useState(false);
  const [day, setDay] = useState(0);
  const [startDate] = useState(() =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(
      new Date(),
    ),
  );
  const parsed = parseMoney(amount);
  const valid = parsed !== null && parsed <= 1_000_000 && parsed >= 100;
  const projection = projectCare({
    amountOre: valid ? parsed : null,
    careId,
    frequency: monthly ? 'monthly' : 'once',
    startDate,
    day,
  });
  const plan = carePlans.find((p) => p.id === careId)!;
  function preview() {
    if (!valid) return;
    onPreview({
      amountOre: parsed!,
      careId,
      monthly,
      day,
      startDate,
      dogCount: projection.dogCount,
      units: projection.totalUnits,
    });
    onClose();
  }
  async function donate() {
    if (!valid) return;
    const ok = await store.send({
      type: 'donate',
      donorId,
      amountOre: parsed!,
      monthly,
      category: careId,
      goalId: 'shared-care',
    });
    if (ok) {
      onSuccess(
        `${money(parsed!)} SEK added to available care funds.${monthly ? ' Monthly forecast saved. No automatic payments are scheduled.' : ''}`,
      );
      onClose();
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="A little gift. A new possibility."
      description="Choose an amount and see the care it could help provide."
    >
      <div className="cp-frequency">
        <button
          className={!monthly ? 'active' : ''}
          onClick={() => {
            setMonthly(false);
            setDay(0);
          }}
        >
          One time
        </button>
        <button
          className={monthly ? 'active' : ''}
          onClick={() => setMonthly(true)}
        >
          <Repeat size={16} /> Every month
        </button>
      </div>
      <div className="cp-gift-examples">
        {carePlans.map((p) => (
          <button
            key={p.id}
            aria-label={`${money(p.presetOre)} SEK — ${p.name}`}
            onClick={() => {
              setCareId(p.id);
              setAmount(String(p.presetOre / 100));
            }}
            className={careId === p.id ? 'active' : ''}
          >
            <CareImage src={p.asset} alt="" />
            <span>
              <strong>
                {money(p.presetOre)} <small>SEK</small>
              </strong>
              <b>{p.name}</b>
              <small>{p.example.split(' · ')[1]}</small>
            </span>
          </button>
        ))}
      </div>
      <label className="cp-field">
        Your amount
        <div className="cp-money-input">
          <input
            inputMode="decimal"
            aria-label="Donation amount in SEK"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
          />
          <span>SEK{monthly ? ' / month' : ''}</span>
        </div>
      </label>
      {!valid && (
        <Notice kind="error">
          Enter an amount from 1 to 10,000 SEK, with up to two decimal places.
        </Notice>
      )}
      <div className="cp-impact-example">
        <CareImage src={plan.asset} alt="" />
        <div>
          <strong>
            {projection.totalUnits} {plan.unit} could be funded
          </strong>
          <p>
            {projection.dogCount} estimated{' '}
            {projection.dogCount === 1 ? 'recipient' : 'recipients'} ·{' '}
            {money(projection.reserveOre)} SEK carried toward the next care unit
          </p>
        </div>
      </div>
      {monthly && (
        <details className="cp-details">
          <summary>Explore your 12-month forecast</summary>
          <p>
            Day {day + 1} · {projection.date} · {projection.contributions}{' '}
            projected gifts
          </p>
          <input
            className="cp-range"
            aria-label="Forecast day"
            type="range"
            min={0}
            max={forecastDays(startDate)}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          />
          <div className="cp-range-labels">
            <span>Today</span>
            <span>12 months</span>
          </div>
          <p>
            Contributions accumulate month by month. Repeat care may support the
            same dogs.
          </p>
        </details>
      )}
      <p className="cp-fine-print">
        Based on{' '}
        <a
          href="https://hundstallet.se/stod-oss/"
          target="_blank"
          rel="noreferrer"
        >
          Hundstallet’s giving examples
        </a>
        . These are estimates, not reserved purchases or guaranteed recipients.
        Donations support shared care.
      </p>
      {store.error && <Notice kind="error">{store.error}</Notice>}
      <div className="cp-donation-actions">
        <Button
          variant="outline"
          disabled={!valid || store.busy}
          onClick={preview}
        >
          <Eye size={17} /> Preview in my shelter
        </Button>
        <Primary disabled={!valid || store.busy} onClick={() => void donate()}>
          <Heart size={17} />
          {store.busy
            ? 'Saving…'
            : monthly
              ? 'Record gift & save plan'
              : 'Record demo donation'}
          <ArrowRight size={17} />
        </Primary>
      </div>
      <a
        className="cp-real-gift"
        href="https://hundstallet.se/stod-oss/"
        target="_blank"
        rel="noreferrer"
      >
        Make a real gift on Hundstallet’s official website ↗
      </a>
      <small className="cp-demo-note">
        No payment is taken. Monthly gifts beyond the first are a forecast.
      </small>
    </Modal>
  );
}
