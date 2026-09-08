'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plus, Minus, Maximize, Moon, Sun, LockKeyhole } from 'lucide-react';
import { CareImage } from './care-image';
import { profileDogs } from '@/lib/donation-shell';
import { money } from '@/lib/platform/model';
import { shelterMoment, dogIsSleeping } from '@/lib/platform/shelter-routine';
import {
  hashSeed,
  pointOnRoute,
  travelRoute,
  routeToGarden,
  zoneSize,
  type ShelterProgress,
} from '@/lib/platform/shelter-growth';
import { Button } from '@/components/ui/button';
type Props = {
  progress: ShelterProgress;
  clock: number;
  preview: boolean;
  onDog: (id: string) => void;
  onDonate: () => void;
  growthSummary: ReactNode;
};
export function GrowingShelter({
  progress,
  clock,
  preview,
  onDog,
  onDonate,
  growthSummary,
}: Props) {
  const [reduced, setReduced] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 660 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([e]) =>
      setDimensions({
        width: e.contentRect.width,
        height: e.contentRect.height,
      }),
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  const moment = shelterMoment(clock);
  const poseMoment = shelterMoment(clock);
  const scale =
    Math.max(0.5, Math.min(dimensions.width / 1280, dimensions.height / 1600)) *
    zoom;
  const offset = {
    x: (dimensions.width - 1200 * scale) / 2 + pan.x,
    y: (dimensions.height - 1560 * scale) / 2 + pan.y,
  };
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(clock);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
  }).format(clock);
  const resident = (id: string, index: number, ghost = false) => (
    <ShelterDog
      key={id}
      id={id}
      index={index}
      ghost={ghost}
      progress={progress}
      poseMoment={poseMoment}
      reduced={reduced}
      onDog={onDog}
    />
  );
  function panWithKeys(e: React.KeyboardEvent<HTMLButtonElement>) {
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: 70, y: 0 },
      ArrowRight: { x: -70, y: 0 },
      ArrowUp: { x: 0, y: 70 },
      ArrowDown: { x: 0, y: -70 },
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setPan((p) => ({
        x: Math.max(-700, Math.min(700, p.x + move.x)),
        y: Math.max(-650, Math.min(650, p.y + move.y)),
      }));
    }
  }
  return (
    <section
      className={'gs-scene ' + (moment.night ? 'is-night' : '')}
      aria-label="Your growing virtual shelter"
    >
      <header className="gs-clock">
        <div className="gs-date">
          {moment.night ? <Moon size={25} /> : <Sun size={25} />}
          <span>
            <strong>{formatted}</strong>
            <small>
              {new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Stockholm',
                year: 'numeric',
              }).format(clock)}{' '}
              · {time} Stockholm
            </small>
          </span>
        </div>
        {growthSummary}
      </header>
      <div
        ref={viewport}
        className="gs-viewport"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setPan({
              x: Math.max(
                -700,
                Math.min(700, drag.current.px + e.clientX - drag.current.x),
              ),
              y: Math.max(
                -650,
                Math.min(650, drag.current.py + e.clientY - drag.current.y),
              ),
            });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div
          className="gs-world"
          style={{
            transform:
              'translate(' +
              offset.x +
              'px,' +
              offset.y +
              'px) scale(' +
              scale +
              ')',
          }}
        >
          <svg className="gs-paths" viewBox="0 0 1200 1560" aria-hidden="true">
            {progress.zones
              .filter((z) => z.id !== 'garden')
              .map((z) => (
                <polyline
                  key={z.id}
                  points={routeToGarden(z)
                    .map((p) => p.x + ',' + p.y)
                    .join(' ')}
                  className={z.level ? '' : 'is-locked'}
                />
              ))}
          </svg>
          {progress.zones.map((z) => {
            const shown = preview
              ? Math.max(1, z.projectedLevel)
              : Math.max(1, z.level);
            const ghost =
              z.level === 0 || (preview && z.projectedLevel > z.level);
            const size = zoneSize(z.id, shown);
            return (
              <div
                key={z.id}
                className={
                  'gs-zone gs-zone-' + z.id + ' ' + (ghost ? 'is-locked' : '')
                }
                style={{ left: z.x, top: z.y, width: size, height: size }}
              >
                <CareImage
                  src={
                    '/care/upgrades/' + z.family + '-livello-' + shown + '.webp'
                  }
                  alt={z.name + ' level ' + shown}
                  width={480}
                  height={480}
                  draggable={false}
                  loading="eager"
                />
                <button
                  className="gs-zone-label"
                  onClick={onDonate}
                  aria-label={
                    z.name +
                    (z.level ? ' level ' + z.level : ' locked') +
                    '. ' +
                    (z.nextThresholdOre
                      ? money(z.remainingOre) + ' SEK more donated to upgrade'
                      : 'Fully upgraded')
                  }
                >
                  <strong>
                    {!z.level && <LockKeyhole size={18} />} {z.name}
                  </strong>
                  <span>
                    {z.level
                      ? 'Level ' +
                        (preview ? z.projectedLevel : z.level) +
                        ' / 5'
                      : z.donationGapOre
                        ? preview && z.projectedLevel > 0
                          ? 'Would unlock with this gift'
                          : money(z.donationGapOre) + ' SEK to unlock'
                        : 'Unlocked'}
                  </span>
                  {z.level > 0 && z.nextThresholdOre !== null && (
                    <small>
                      {money(z.remainingOre)} SEK more donated to upgrade
                    </small>
                  )}
                </button>
              </div>
            );
          })}
          {progress.residentIds.map((id, i) => resident(id, i))}
          {preview &&
            progress.potentialIds.map((id, i) => resident(id, i, true))}
        </div>
        <div className="gs-map-tools">
          <Button
            variant="outline"
            aria-label="Zoom in"
            title="Zoom in · arrow keys move the map"
            onKeyDown={panWithKeys}
            onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
          >
            <Plus size={18} />
          </Button>
          <Button
            variant="outline"
            aria-label="Zoom out"
            title="Zoom out · arrow keys move the map"
            onKeyDown={panWithKeys}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          >
            <Minus size={18} />
          </Button>
          <Button
            variant="outline"
            aria-label="Fit whole shelter"
            title="Fit whole shelter · arrow keys move the map"
            onKeyDown={panWithKeys}
            onClick={() => {
              setZoom(
                Math.min(dimensions.width / 1280, dimensions.height / 1600) /
                  Math.max(
                    0.5,
                    Math.min(dimensions.width / 1280, dimensions.height / 1600),
                  ),
              );
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize size={17} />
          </Button>
        </div>
        {!progress.residentIds.length &&
          !(preview && progress.potentialIds.length) && (
            <div className="gs-empty">
              Your garden is ready.
              <br />
              <strong>
                The first 50 SEK donated welcomes a virtual companion.
              </strong>
            </div>
          )}
      </div>
      <footer className="gs-map-footer">
        <span>
          {preview
            ? 'Donation preview · faded areas show potential growth'
            : 'Your virtual shelter grows with your total donations.'}
        </span>
        <small>Drag to explore · virtual routines</small>
      </footer>
    </section>
  );
}

// Animation changes only each sprite's compositor transform, not the whole map's React tree.
function ShelterDog({
  id,
  index,
  ghost,
  progress,
  poseMoment,
  reduced,
  onDog,
}: {
  id: string;
  index: number;
  ghost: boolean;
  progress: ShelterProgress;
  poseMoment: ReturnType<typeof shelterMoment>;
  reduced: boolean;
  onDog: (id: string) => void;
}) {
  const element = useRef<HTMLButtonElement>(null);
  const elapsed = useRef(0);
  const dog = profileDogs.find((d) => d.id === id)!;
  const sleeping = !ghost && dogIsSleeping(id, poseMoment);
  const columns = Math.min(
    7,
    Math.ceil(Math.sqrt(progress.residentIds.length)),
  );
  const dogSize = sleeping ? Math.min(65, 240 / columns) : 76;
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const seed = hashSeed(id);
    const active = progress.zones.filter((z) => z.level > 0);
    const kennel = active.find((z) => z.id === 'kennel') ?? active[0];
    const projected = progress.zones.filter((z) => z.projectedLevel > 0);
    const previewZone = projected[index % projected.length];
    const previewIndex = Math.floor(index / projected.length);
    const restingOffset = {
      x: ((seed % 5) - 2) * 16,
      y: ((seed % 3) - 1) * 18,
    };
    const draw = () => {
      let moving = false;
      let point = {
        x: previewZone.x + ((previewIndex % 3) - 1) * 43,
        y: previewZone.y + (Math.floor(previewIndex / 3) - 1) * 43,
      };
      if (!ghost) {
        if (sleeping || reduced) {
          point = {
            x:
              kennel.x +
              ((index % columns) - (columns - 1) / 2) * (240 / columns),
            y: kennel.y - 60 + Math.floor(index / columns) * (220 / columns),
          };
        } else {
          const period = 42 + (seed % 24);
          const phase = elapsed.current + (seed % period);
          const cycle = Math.floor(phase / period),
            local = phase % period;
          const from = active[(cycle + seed) % active.length];
          const to = active[(cycle + seed + 1) % active.length];
          moving = local < 15 && from.id !== to.id;
          const route = travelRoute(from, to);
          // Connect the exact dwell positions to the route: no snap on arrival or departure.
          const start = {
            x: from.x + restingOffset.x,
            y: from.y + restingOffset.y,
          };
          const end = { x: to.x + restingOffset.x, y: to.y + restingOffset.y };
          point = moving
            ? pointOnRoute([start, ...route, end], local / 15)
            : end;
        }
      }
      node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -72%)`;
      node.style.zIndex = String(Math.round(point.y) + 1000);
      node.classList.toggle('is-moving', moving && !reduced);
    };
    draw();
    if (ghost || reduced || sleeping) return;
    let frame = 0;
    let last: number | null = null;
    const tick = (time: number) => {
      if (last !== null) elapsed.current += Math.min(time - last, 100) / 1000;
      last = time;
      draw();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [id, index, ghost, progress.zones, sleeping, reduced, columns]);
  return (
    <button
      ref={element}
      className={'gs-dog ' + (ghost ? 'is-preview' : '')}
      style={{ left: 0, top: 0, width: dogSize, height: dogSize + 14 }}
      aria-label={
        dog.name + (ghost ? ' — donation preview' : ' — open public profile')
      }
      onClick={() => onDog(id)}
    >
      {sleeping && (
        <span className="gs-sleep" aria-label="Sleeping">
          <span aria-hidden="true">Z</span>
          <span aria-hidden="true">Z</span>
          <span aria-hidden="true">Z</span>
        </span>
      )}
      <CareImage
        src={dog.sprite}
        style={{ width: dogSize, height: dogSize }}
        alt=""
        width={90}
        height={90}
        draggable={false}
      />
      <span className="gs-dog-name">{dog.name}</span>
    </button>
  );
}
