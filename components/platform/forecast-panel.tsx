'use client';
import { CalendarDays, ArrowUpRight } from 'lucide-react';
import { carePlans, projectCare, forecastDays } from '@/lib/care-impact';
import { money } from '@/lib/platform/model';
import type { Preview } from './donation-dialog';
export function ForecastPanel({
  preview,
  onChange,
  onContinue,
}: {
  preview: Preview;
  onChange: (p: Preview) => void;
  onContinue: () => void;
}) {
  const plan = carePlans.find((p) => p.id === preview.careId)!;
  const forecast = projectCare({
    amountOre: preview.amountOre,
    careId: preview.careId,
    frequency: preview.monthly ? 'monthly' : 'once',
    startDate: preview.startDate,
    day: preview.day,
  });
  function change(day: number) {
    const next = projectCare({
      amountOre: preview.amountOre,
      careId: preview.careId,
      frequency: preview.monthly ? 'monthly' : 'once',
      startDate: preview.startDate,
      day,
    });
    onChange({
      ...preview,
      day,
      dogCount: next.dogCount,
      units: next.totalUnits,
    });
  }
  return (
    <div className="cp-shelter-forecast">
      <div>
        <span className="cp-eyebrow">YOUR POSSIBLE NEXT CHAPTER</span>
        <strong>
          {money(preview.amountOre)} SEK{preview.monthly ? ' / month' : ''}
        </strong>
        <span>
          {forecast.totalUnits} {plan.unit} · {forecast.dogCount} estimated
          recipients
        </span>
        <button onClick={onContinue}>
          Continue with this gift <ArrowUpRight size={15} />
        </button>
      </div>
      <details>
        <summary>
          <CalendarDays size={16} /> Explore the day-by-day forecast
        </summary>
        <div className="cp-forecast-date">
          <strong>{forecast.date}</strong>
          <span>Day {preview.day + 1}</span>
        </div>
        <input
          className="cp-range"
          type="range"
          min={0}
          max={forecastDays(preview.startDate)}
          value={preview.day}
          onChange={(e) => change(Number(e.target.value))}
          aria-label="Day in the donation forecast"
        />
        <div className="cp-range-labels">
          <span>Today</span>
          <span>12 months</span>
        </div>
        <div className="cp-forecast-stats">
          <span>
            <strong>{forecast.contributions}</strong> projected gifts
          </span>
          <span>
            <strong>{forecast.totalUnits}</strong> {plan.unit}
          </span>
          <span>
            <strong>{money(forecast.reserveOre)} SEK</strong> toward the next
            unit
          </span>
        </div>
        <p>
          Giving and care capacity accumulate. The same dogs may receive repeat
          care. This forecast does not change any recorded spending.
        </p>
      </details>
    </div>
  );
}
