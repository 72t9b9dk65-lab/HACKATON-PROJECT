'use client';
import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { money } from '@/lib/platform/model';
import type { GrowthCheckpoint } from '@/lib/platform/shelter-growth';

function checkpointLabel(point: GrowthCheckpoint) {
  return [
    point.current ? 'Your donations' : '',
    point.companion ? `Companion ${point.companion}` : '',
    ...point.upgrades.map(
      (upgrade) => `${upgrade.name} level ${upgrade.level}`,
    ),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function GrowthCheckpoints({
  checkpoints,
  value,
  donated,
  maximum,
  onChange,
}: {
  checkpoints: GrowthCheckpoint[];
  value: number;
  donated: number;
  maximum: number;
  onChange: (amountOre: number) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  const previous = checkpoints.findLast((point) => point.amountOre < value);
  const next = checkpoints.find((point) => point.amountOre > value);
  useLayoutEffect(() => {
    const row = strip.current;
    const point = selected.current;
    if (!row || !point) return;
    const center = () => {
      row.scrollTo({
        left: point.offsetLeft - (row.clientWidth - point.offsetWidth) / 2,
      });
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(row);
    return () => observer.disconnect();
  }, [value, checkpoints.length]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const target = {
      ArrowLeft: previous,
      ArrowRight: next,
      Home: checkpoints[0],
      End: checkpoints.at(-1),
    }[event.key];
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!target) return;
    onChange(target.amountOre);
    requestAnimationFrame(() => {
      strip.current
        ?.querySelector<HTMLButtonElement>(
          `[data-checkpoint="${target.amountOre}"]`,
        )
        ?.focus({ preventScroll: true });
    });
  }

  return (
    <>
      <div className="gs-growth-slider-heading">
        <strong>Preview total donated</strong>
        <output aria-live="polite">{money(value)} SEK</output>
      </div>
      <progress
        className="gs-growth-progress"
        aria-label="Your total donated"
        max={maximum}
        value={donated}
      />
      <div className="gs-growth-slider-scale">
        <span>0 SEK</span>
        <span>{money(maximum)} SEK · Fully upgraded</span>
      </div>
      <fieldset
        className="gs-growth-navigation"
        aria-label="Growth checkpoints"
      >
        <button
          type="button"
          className="gs-growth-arrow"
          aria-label="Previous growth checkpoint"
          title={
            previous ? `${money(previous.amountOre)} SEK` : 'First checkpoint'
          }
          disabled={!previous}
          onKeyDown={navigate}
          onClick={() => previous && onChange(previous.amountOre)}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="gs-growth-checkpoint-window">
          <div className="gs-growth-checkpoints" ref={strip}>
            {checkpoints.map((point) => (
              <button
                type="button"
                key={point.amountOre}
                ref={point.amountOre === value ? selected : undefined}
                data-checkpoint={point.amountOre}
                className="gs-growth-checkpoint"
                aria-current={point.amountOre === value ? 'step' : undefined}
                tabIndex={point.amountOre === value ? 0 : -1}
                aria-label={`${money(point.amountOre)} SEK · ${checkpointLabel(point) || 'Fully upgraded'}`}
                title={checkpointLabel(point) || 'Fully upgraded'}
                onKeyDown={navigate}
                onClick={() => onChange(point.amountOre)}
              >
                {money(point.amountOre)}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="gs-growth-arrow"
          aria-label="Next growth checkpoint"
          title={next ? `${money(next.amountOre)} SEK` : 'Last checkpoint'}
          disabled={!next}
          onKeyDown={navigate}
          onClick={() => next && onChange(next.amountOre)}
        >
          <ChevronRight size={20} />
        </button>
      </fieldset>
    </>
  );
}
