'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Plus,
  Minus,
  Maximize,
  Moon,
  Sun,
  LockKeyhole,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { CareImage } from './care-image';
import { profileDogs } from '@/lib/donation-shell';
import { money } from '@/lib/platform/model';
import { shelterMoment, dogIsSleeping } from '@/lib/platform/shelter-routine';
import {
  areaAsset,
  hashSeed,
  pointOnRoute,
  buildShelterNetwork,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  type ShelterNetwork,
  zoneSize,
  type ShelterProgress,
  type ZoneId,
} from '@/lib/platform/shelter-growth';
import { Button } from '@/components/ui/button';
type Props = {
  progress: ShelterProgress;
  clock: number;
  preview: boolean;
  onDog: (id: string) => void;
  onDonate: () => void;
  growthSummary: ReactNode;
  previewControls?: ReactNode;
};
export function GrowingShelter({
  progress,
  clock,
  preview,
  onDog,
  onDonate,
  growthSummary,
  previewControls,
}: Props) {
  const [reduced, setReduced] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 660 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusedArea, setFocusedArea] = useState<ZoneId | null>(null);
  const [dragging, setDragging] = useState(false);
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
  const network = useMemo(
    () =>
      buildShelterNetwork(
        progress.zones.filter((z) => !preview || z.projectedLevel > 0),
        preview,
      ),
    [progress.zones, preview],
  );
  const fitScale = Math.min(
    dimensions.width / (WORLD_WIDTH + 80),
    dimensions.height / (WORLD_HEIGHT + 80),
  );
  const baseScale = Math.max(dimensions.width < 600 ? 0.5 : 0, fitScale);
  const scale = baseScale * zoom;
  const areaOrder = [...progress.zones].sort((a, b) => a.y - b.y || a.x - b.x);
  const selected = progress.zones.find((z) => z.id === focusedArea);
  const wasPreviewActive = useRef(preview);
  useEffect(() => {
    const justOpened = preview && !wasPreviewActive.current;
    wasPreviewActive.current = preview;
    if (justOpened || (preview && selected?.projectedLevel === 0)) {
      setFocusedArea(null);
      setZoom(fitScale / baseScale);
      setPan({ x: 0, y: 0 });
    }
  }, [preview, selected?.projectedLevel, fitScale, baseScale]);
  const selectedIndex = areaOrder.findIndex((z) => z.id === focusedArea);
  const adjacentAreas = selected
    ? network.connections
        .filter((edge) => edge.from === selected.id || edge.to === selected.id)
        .map((edge) => {
          const zone = progress.zones.find(
            (z) => z.id === (edge.from === selected.id ? edge.to : edge.from),
          )!;
          const direction =
            zone.x < selected.x
              ? 'left'
              : zone.x > selected.x
                ? 'right'
                : zone.y < selected.y
                  ? 'up'
                  : 'down';
          return { zone, direction };
        })
    : [];
  const offset = {
    x: dimensions.width / 2 - (selected?.x ?? WORLD_WIDTH / 2) * scale + pan.x,
    y:
      dimensions.height / 2 - (selected?.y ?? WORLD_HEIGHT / 2) * scale + pan.y,
  };
  function focusArea(id: ZoneId) {
    if (!focusedArea) {
      // Reserve room for side arrows and the badge beneath the largest tile.
      // One shared scale lets navigation keep exactly the same magnification.
      const largest = Math.max(
        ...progress.zones.map((z) =>
          zoneSize(z.id, preview ? 5 : Math.max(1, z.level)),
        ),
      );
      const focusScale = Math.max(
        0.25,
        Math.min(
          (dimensions.width - 112) / largest,
          (dimensions.height - 48) / (largest + 184),
          2,
        ),
      );
      setZoom(focusScale / baseScale);
    }
    setFocusedArea(id);
    setPan({ x: 0, y: 0 });
  }
  function showWholeShelter() {
    setFocusedArea(null);
    setZoom(fitScale / baseScale);
    setPan({ x: 0, y: 0 });
  }
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
      network={network}
      poseMoment={poseMoment}
      reduced={reduced}
      onDog={onDog}
    />
  );
  function visitAdjacentArea(id: ZoneId) {
    focusArea(id);
    // Keep keyboard navigation available when a direction disappears at an edge.
    requestAnimationFrame(() => {
      viewport.current
        ?.querySelector<HTMLButtonElement>(`[data-zone-focus="${id}"]`)
        ?.focus({ preventScroll: true });
    });
  }
  function navigateAreasWithKeys(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!selected || e.defaultPrevented) return;
    const directions: Record<string, string> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };
    const direction = directions[e.key];
    if (direction) {
      e.preventDefault();
      const neighbor = adjacentAreas.find(
        (area) => area.direction === direction,
      );
      if (neighbor) visitAdjacentArea(neighbor.zone.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      showWholeShelter();
    }
  }
  function panWithKeys(e: React.KeyboardEvent<HTMLButtonElement>) {
    navigateAreasWithKeys(e);
    if (e.defaultPrevented) return;
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
      {previewControls}
      <div
        ref={viewport}
        className={'gs-viewport' + (dragging ? ' is-dragging' : '')}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          setDragging(true);
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
          setDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        <div
          className="gs-world"
          style={{
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
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
          <svg
            className="gs-paths"
            viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
            style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT }}
            aria-hidden="true"
          >
            {network.paths.map((path) => (
              <polyline
                key={path.id}
                points={path.points.map((p) => `${p.x},${p.y}`).join(' ')}
                data-zone={path.zoneId}
                data-entrance={path.entrance}
                className={path.locked ? 'is-locked' : ''}
              />
            ))}
          </svg>
          {progress.zones
            .filter((z) => !preview || z.projectedLevel > 0)
            .map((z) => {
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
                    'gs-zone gs-zone-' +
                    z.id +
                    ' ' +
                    (ghost ? 'is-locked' : '') +
                    (preview && ghost ? ' is-preview-upgrade' : '')
                  }
                  style={{ left: z.x, top: z.y, width: size, height: size }}
                >
                  <button
                    className="gs-zone-art"
                    data-zone-focus={z.id}
                    onKeyDown={navigateAreasWithKeys}
                    onClick={() => focusArea(z.id)}
                    aria-label={'Zoom into ' + z.name}
                    aria-pressed={focusedArea === z.id}
                  >
                    <CareImage
                      src={areaAsset(z, shown)}
                      alt={z.name + ' level ' + shown}
                      width={480}
                      height={480}
                      draggable={false}
                      loading="eager"
                    />
                  </button>
                  <button
                    className={
                      'gs-zone-label' +
                      ((z.entrances as readonly string[]).includes('bottom')
                        ? ' gs-label-beside-road'
                        : '')
                    }
                    onClick={onDonate}
                    title={
                      z.nextThresholdOre !== null
                        ? money(z.remainingOre) + ' SEK more donated to upgrade'
                        : 'Fully upgraded'
                    }
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
                  </button>
                </div>
              );
            })}
          {progress.residentIds.map((id, i) => resident(id, i))}
          {preview &&
            progress.potentialIds.map((id, i) => (
              <PreviewShelterDog
                key={id}
                id={id}
                index={i}
                progress={progress}
              />
            ))}
        </div>
        {selected && (
          <>
            {adjacentAreas.map(({ zone, direction }) => {
              const Icon =
                direction === 'left'
                  ? ChevronLeft
                  : direction === 'right'
                    ? ChevronRight
                    : direction === 'up'
                      ? ChevronUp
                      : ChevronDown;
              return (
                <Button
                  key={direction}
                  className={'gs-area-arrow gs-area-' + direction}
                  onKeyDown={navigateAreasWithKeys}
                  variant="outline"
                  aria-label={'Go ' + direction + ' to ' + zone.name}
                  title={zone.name}
                  onClick={() => visitAdjacentArea(zone.id)}
                >
                  <Icon size={26} />
                </Button>
              );
            })}
            <span className="sr-only" aria-live="polite">
              {selected.name}, area {selectedIndex + 1} of {areaOrder.length}
            </span>
          </>
        )}
        <div className="gs-map-tools">
          <Button
            variant="outline"
            aria-label="Zoom in"
            title="Zoom in · arrow keys move the map"
            onKeyDown={panWithKeys}
            onClick={() => setZoom((z) => Math.min(4 / baseScale, z + 0.2))}
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
            aria-label={
              selected ? 'Back to whole shelter' : 'Fit whole shelter'
            }
            title={
              selected
                ? 'Back to whole shelter · Escape'
                : 'Fit whole shelter · arrow keys move the map'
            }
            onKeyDown={panWithKeys}
            onClick={showWholeShelter}
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
        <small>
          {selected
            ? 'Use arrows to explore · Escape to see the shelter'
            : 'Click an area to explore · Drag to move'}
        </small>
      </footer>
    </section>
  );
}

// Generic breed sprites carry no Hundstallet identity or profile link.
const previewSprites = [
  '/dogs/pixel-breeds/labrador-retriever.png',
  '/dogs/pixel-breeds/samoyed.png',
  '/dogs/pixel-breeds/french-bulldog.png',
  '/dogs/pixel-breeds/dachshund.png',
  '/dogs/pixel-breeds/mixed-medium.png',
];
function PreviewShelterDog({
  id,
  index,
  progress,
}: {
  id: string;
  index: number;
  progress: ShelterProgress;
}) {
  const areas = progress.zones.filter((z) => z.projectedLevel > 0);
  const zone = areas[index % areas.length];
  const slot = Math.floor(index / areas.length);
  const x = zone.x + ((slot % 3) - 1) * 48;
  const y = zone.y + (Math.floor(slot / 3) - 1) * 48;
  return (
    <div
      className="gs-dog is-preview gs-preview-companion"
      style={{
        left: x,
        top: y,
        width: 76,
        height: 90,
        zIndex: Math.round(y) + 1000,
      }}
    >
      <CareImage
        src={previewSprites[hashSeed(id) % previewSprites.length]}
        alt="Illustrative preview companion"
        width={90}
        height={90}
        draggable={false}
      />
    </div>
  );
}

// Animation changes only each sprite's compositor transform, not the whole map's React tree.
function ShelterDog({
  id,
  index,
  ghost,
  progress,
  network,
  poseMoment,
  reduced,
  onDog,
}: {
  id: string;
  index: number;
  ghost: boolean;
  progress: ShelterProgress;
  network: ShelterNetwork;
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
    const routes = new Map<string, ReturnType<ShelterNetwork['route']>>();
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
          const key = `${from.id}:${to.id}`;
          if (!routes.has(key)) routes.set(key, network.route(from.id, to.id));
          const route = routes.get(key)!;
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
  }, [id, index, ghost, progress.zones, network, sleeping, reduced, columns]);
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
