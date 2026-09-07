'use client';

import { ArrowUpRight, ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { kronor } from '@/lib/donation-shell';
import {
  CARE_SOURCE,
  carePlans,
  carePlan,
  dateAfterMonths,
  daysBetween,
  displayDate,
  type CarePlanId,
  type GivingFrequency,
  type CareProjection,
} from '@/lib/care-impact';
import { parseDonationAmount } from '@/lib/virtual-shelter';
import type { MonthlyPlan } from '@/lib/shelter-profile';

export function CarePlanner({
  amount,
  careId,
  frequency,
  onAmount,
  onCare,
  onFrequency,
  onConfirm,
  ready,
  atLimit,
  monthlyPlan,
  onCancelMonthly,
}: {
  amount: string;
  careId: CarePlanId;
  frequency: GivingFrequency;
  onAmount: (value: string) => void;
  onCare: (id: CarePlanId) => void;
  onFrequency: (frequency: GivingFrequency) => void;
  onConfirm: () => void;
  ready: boolean;
  atLimit: boolean;
  monthlyPlan: MonthlyPlan | null;
  onCancelMonthly: () => void;
}) {
  const ore = parseDonationAmount(amount);
  return (
    <form
      className="care-planner"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
    >
      <div className="care-planner-heading">
        <h2>What could your gift make possible?</h2>
        <span>Choose an example, or enter your own amount.</span>
      </div>
      <div className="care-plan-options" aria-label="Care examples">
        {carePlans.map((plan) => (
          <Button
            key={plan.id}
            type="button"
            variant="outline"
            className="care-plan-option"
            aria-pressed={careId === plan.id}
            onClick={() => {
              onCare(plan.id);
              onAmount(String(plan.presetOre / 100));
            }}
          >
            <img src={plan.asset} width="76" height="76" alt="" />
            <span>
              <strong>{kronor(plan.presetOre)} SEK</strong>
              <span>{plan.name}</span>
              <small>{plan.example.split(' · ')[1]}</small>
            </span>
          </Button>
        ))}
      </div>
      <div className="care-planner-action-row">
        <div className="care-amount-field">
          <label htmlFor="shelter-donation-amount">Your amount</label>
          <div className="shelter-custom-amount">
            <Input
              id="shelter-donation-amount"
              type="number"
              inputMode="numeric"
              min="1"
              max="10000"
              step="1"
              value={amount}
              placeholder="Your amount"
              onChange={(event) => onAmount(event.target.value)}
              aria-invalid={amount !== '' && ore === null}
              aria-describedby="care-planner-note"
            />
            <span>SEK</span>
          </div>
        </div>
        <div className="giving-frequency" aria-label="Donation frequency">
          <Button
            type="button"
            variant="outline"
            aria-pressed={frequency === 'once'}
            onClick={() => onFrequency('once')}
          >
            One time
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-pressed={frequency === 'monthly'}
            onClick={() => onFrequency('monthly')}
          >
            <Repeat2 size={15} /> Every month
          </Button>
        </div>
        <Button
          type="submit"
          className="donation-primary"
          disabled={!ready || ore === null || (frequency === 'once' && atLimit)}
        >
          {frequency === 'monthly'
            ? monthlyPlan
              ? 'Update monthly preview'
              : 'Save monthly preview'
            : ore === null
              ? 'Choose an amount'
              : `Donate ${kronor(ore)} SEK`}{' '}
          <ArrowUpRight size={19} />
        </Button>
      </div>
      <p id="care-planner-note" className="care-planner-note">
        {amount !== '' && ore === null
          ? 'Enter a whole amount from 1 to 10,000 SEK. '
          : ''}
        {frequency === 'monthly'
          ? 'Monthly plans are saved as forecasts. No automatic charges or future gifts are recorded.'
          : 'Demo donation. No payment is taken.'}{' '}
        {carePlan(careId).detail}
      </p>
      {monthlyPlan && (
        <div className="saved-monthly-plan">
          <Repeat2 size={15} />
          <span>
            {kronor(monthlyPlan.amountOre)} SEK/month ·{' '}
            {carePlan(monthlyPlan.careId).name} · saved preview
          </span>
          <Button type="button" variant="ghost" onClick={onCancelMonthly}>
            Remove plan
          </Button>
        </div>
      )}
    </form>
  );
}

export function CareTimeline({
  projection,
  startDate,
  onDay,
}: {
  projection: CareProjection;
  startDate: string;
  onDay: (day: number) => void;
}) {
  const plan = carePlan(projection.careId);
  return (
    <section className="care-timeline" aria-labelledby="care-timeline-title">
      <div className="care-timeline-heading">
        <div>
          <span className="donation-eyebrow">
            {projection.frequency === 'monthly'
              ? '12-MONTH FORECAST'
              : 'YOUR GIFT OVER TIME'}
          </span>
          <h3 id="care-timeline-title">
            {displayDate(projection.date)}{' '}
            <small>· Day {projection.day + 1}</small>
          </h3>
        </div>
        <div className="care-day-controls">
          <Button
            type="button"
            variant="outline"
            disabled={projection.day === 0}
            onClick={() => onDay(projection.day - 1)}
            aria-label="Previous forecast day"
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={projection.day === projection.maxDay}
            onClick={() => onDay(projection.day + 1)}
            aria-label="Next forecast day"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <Slider
        value={[projection.day]}
        min={0}
        max={projection.maxDay}
        step={1}
        onValueChange={(value) =>
          onDay(Array.isArray(value) ? value[0] : value)
        }
        aria-labelledby="care-timeline-title"
        className="care-day-slider"
      />
      <div className="care-month-ticks">
        {Array.from({ length: 12 }, (_, index) => (
          <button
            type="button"
            key={index}
            aria-label={`Preview month ${index + 1}`}
            aria-current={projection.month === index + 1 ? 'date' : undefined}
            onClick={() =>
              onDay(daysBetween(startDate, dateAfterMonths(startDate, index)))
            }
          >
            {index === 0 ? 'Start' : `M${index + 1}`}
          </button>
        ))}
      </div>
      <div
        className="care-projection-stats"
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <strong>
            {kronor(projection.committedOre)} <small>SEK</small>
          </strong>
          <span>
            {projection.contributions} projected{' '}
            {projection.contributions === 1 ? 'gift' : 'gifts'}
          </span>
        </div>
        <div>
          <strong>{projection.dogCount}</strong>
          <span>estimated {projection.dogCount === 1 ? 'dog' : 'dogs'}</span>
        </div>
        <div>
          <strong>
            {projection.usedUnits} <small>/ {projection.totalUnits}</small>
          </strong>
          <span>{plan.unit} · use / capacity</span>
        </div>
        <div>
          <strong>
            {kronor(projection.reserveOre)} <small>SEK</small>
          </strong>
          <span>carried toward next care unit</span>
        </div>
      </div>
      <p className="care-forecast-source">
        <a href={CARE_SOURCE} target="_blank" rel="noreferrer">
          Based on Hundstallet’s giving examples <ArrowUpRight size={13} />
        </a>
        . One care option uses the budget at a time. Timing and dog matching are
        illustrative; food and rehabilitation can support the same dogs each
        month.
      </p>
    </section>
  );
}
