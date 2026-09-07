'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PawPrint, Heart, LoaderCircle } from 'lucide-react';
import { geoContains } from 'd3-geo';
import {
  prepareSwedenMap,
  MAX_SWEDEN_ZOOM,
  type SwedenBoundary,
  type SwedenDetails,
} from '@/lib/sweden-map';
import { shelters, sek } from '@/lib/hundstallet-data';
import type { MapMode } from '@/lib/earth-data';
import { PixelCareIcon } from '@/components/pixel-care-icon';
import {
  careAllocation,
  careKinds,
  kronor,
  type ProfileDog,
} from '@/lib/donation-shell';

export default function SwedenMap({
  selectedId,
  mode,
  zoom,
  onZoom,
  resetKey,
  raised,
  onSelect,
  dogMarkers,
}: {
  selectedId: string;
  mode: MapMode;
  zoom: number;
  onZoom: (value: number) => void;
  resetKey: number;
  raised: Record<string, number>;
  onSelect: (id: string) => void;
  dogMarkers?: (ProfileDog & { amountOre: number })[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 770 });
  const [boundary, setBoundary] = useState<SwedenBoundary | null>(null);
  const [details, setDetails] = useState<SwedenDetails | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const zoomRef = useRef({ zoom, onZoom });
  zoomRef.current = { zoom, onZoom };
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    Promise.all([
      fetch('/data/sweden.json', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw Error('Map unavailable');
        return r.json() as Promise<SwedenBoundary>;
      }),
      fetch('/data/sweden-details.json', { signal: controller.signal }).then(
        (r) => {
          if (!r.ok) throw Error('Map details unavailable');
          return r.json() as Promise<SwedenDetails>;
        },
      ),
    ])
      .then(([data, detail]) => {
        prepareSwedenMap(data, 800, 770, detail);
        setBoundary(data);
        setDetails(detail);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(element);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current.onZoom(
        Math.max(
          1,
          Math.min(
            MAX_SWEDEN_ZOOM,
            zoomRef.current.zoom * Math.exp(-e.deltaY * 0.001),
          ),
        ),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener('wheel', wheel);
    };
  }, []);
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [resetKey]);
  const prepared = useMemo(
    () =>
      boundary
        ? prepareSwedenMap(
            boundary,
            size.width,
            size.height,
            details ?? undefined,
            dogMarkers ? 'donation' : 'default',
          )
        : null,
    [boundary, size, details, !!dogMarkers],
  );
  const cx = size.width * 0.56,
    cy = size.height * 0.49;
  const limit = (x: number, y: number) => ({
    x: Math.max(
      -size.width * 0.65 * zoom,
      Math.min(size.width * 0.65 * zoom, x),
    ),
    y: Math.max(
      -size.height * 0.65 * zoom,
      Math.min(size.height * 0.65 * zoom, y),
    ),
  });
  // Reserve shelter callouts and controls before placing secondary geographic labels.
  const contextLabels = useMemo(() => {
    if (!prepared || !details) return [];
    const screen = (coords: [number, number]) => {
      const p = prepared.projection(coords)!;
      return {
        x: (p[0] - cx) * zoom + cx + pan.x,
        y: (p[1] - cy) * zoom + cy + pan.y,
      };
    };
    const occupied = shelters.map((s) => {
      const p = screen(s.coordinates);
      return {
        left: p.x - 140,
        right: p.x + 140,
        top: p.y - 48,
        bottom: p.y + 48,
      };
    });
    occupied.push({ left: 0, right: 230, top: 0, bottom: 245 });
    const candidates = [
      ...details.places
        .filter((p) => zoom >= 2 || (p.properties.population ?? 0) > 90000)
        .map((p) => ({
          id: String(p.id),
          name: p.properties.name,
          kind: 'city',
          coordinates:
            p.geometry.type === 'Point'
              ? (p.geometry.coordinates as [number, number])
              : ([0, 0] as [number, number]),
        })),
      ...(zoom >= 1.7
        ? prepared.counties.map((p) => ({ ...p, kind: 'county' }))
        : []),
      ...(zoom >= 2.4
        ? prepared.lakes
            .filter(
              (p) => p.name && boundary && geoContains(boundary, p.coordinates),
            )
            .map((p) => ({ ...p, kind: 'lake' }))
        : []),
    ];
    const labels: {
      id: string;
      name: string;
      kind: string;
      x: number;
      y: number;
    }[] = [];
    for (const c of candidates) {
      const p = screen(c.coordinates);
      const width = c.name.length * (c.kind === 'county' ? 6.7 : 6.2);
      const left = c.kind === 'city' ? p.x : p.x - width / 2;
      const box = {
        left: left - 5,
        right: left + width + 12,
        top: p.y - 18,
        bottom: p.y + 8,
      };
      if (
        box.left < 15 ||
        box.right > size.width - 20 ||
        box.top < 110 ||
        box.bottom > size.height - 155
      )
        continue;
      if (
        occupied.some(
          (r) =>
            box.left < r.right &&
            box.right > r.left &&
            box.top < r.bottom &&
            box.bottom > r.top,
        )
      )
        continue;
      occupied.push(box);
      labels.push({ ...c, ...p });
    }
    return labels;
  }, [prepared, details, boundary, zoom, pan, cx, cy, size]);
  function stopDrag(e: React.PointerEvent<SVGSVGElement>) {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return (
    <div className="hs-sweden-map" ref={container}>
      {!prepared && (
        <div className="map-loading" role="status">
          {error ? (
            <>
              <p>The Sweden map could not be loaded.</p>
              <button onClick={() => setRetry((v) => v + 1)}>Try again</button>
            </>
          ) : (
            <>
              <LoaderCircle className="spin" />
              <p>Loading Sweden…</p>
            </>
          )}
        </div>
      )}
      {prepared && (
        <svg
          className="hs-sweden-svg"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-label="Detailed map of Sweden, with counties, lakes, rivers, cities, and three Hundstallet shelters. Drag to pan, use arrow keys to move, and plus or minus to zoom."
          tabIndex={0}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              panX: pan.x,
              panY: pan.y,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current)
              setPan(
                limit(
                  drag.current.panX + e.clientX - drag.current.x,
                  drag.current.panY + e.clientY - drag.current.y,
                ),
              );
          }}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (
              [
                'ArrowUp',
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
                '+',
                '-',
              ].includes(e.key)
            ) {
              e.preventDefault();
              if (e.key === '+') onZoom(Math.min(MAX_SWEDEN_ZOOM, zoom * 1.25));
              else if (e.key === '-') onZoom(Math.max(1, zoom / 1.25));
              else
                setPan((p) =>
                  limit(
                    p.x +
                      (e.key === 'ArrowRight'
                        ? 30
                        : e.key === 'ArrowLeft'
                          ? -30
                          : 0),
                    p.y +
                      (e.key === 'ArrowDown'
                        ? 30
                        : e.key === 'ArrowUp'
                          ? -30
                          : 0),
                  ),
                );
            }
          }}
        >
          <defs>
            <clipPath id="sweden-detail-clip">
              <path d={prepared.outline} />
            </clipPath>
            <linearGradient id="sweden-land" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#dce6c8" />
              <stop offset="1" stopColor="#a7c298" />
            </linearGradient>
            <pattern
              id="sweden-grid"
              width="55"
              height="55"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M55 0H0V55"
                fill="none"
                stroke="#a4b89b"
                strokeWidth=".6"
                opacity=".09"
              />
            </pattern>
          </defs>
          <rect
            width={size.width}
            height={size.height}
            fill="url(#sweden-grid)"
          />
          <g
            transform={`translate(${pan.x + cx * (1 - zoom)},${pan.y + cy * (1 - zoom)}) scale(${zoom})`}
          >
            <path
              d={prepared.outline}
              className="hs-sweden-land"
              fill="url(#sweden-land)"
              stroke="#e8f1d7"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            >
              <title>Sweden · Natural Earth 1:10 million boundary</title>
            </path>
            <g clipPath="url(#sweden-detail-clip)">
              {prepared.counties.map((county, i) => (
                <path
                  key={county.id}
                  d={county.path}
                  className={`hs-county hs-county-${i % 3}`}
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{county.name} County</title>
                </path>
              ))}
              {prepared.rivers.map((river) => (
                <path
                  key={river.id}
                  d={river.path}
                  className="hs-river"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{river.name}</title>
                </path>
              ))}
              {prepared.lakes.map((lake) => (
                <path
                  key={lake.id}
                  d={lake.path}
                  className="hs-lake"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{lake.name}</title>
                </path>
              ))}
            </g>
          </g>
          {contextLabels.map((label) => (
            <g
              key={label.id}
              className={`hs-context-label hs-context-${label.kind}`}
              pointerEvents="none"
            >
              {label.kind === 'city' && (
                <circle cx={label.x} cy={label.y} r="2.3" />
              )}
              <text
                x={label.x + (label.kind === 'city' ? 7 : 0)}
                y={label.y - 4}
                textAnchor={label.kind === 'city' ? 'start' : 'middle'}
              >
                {label.name}
              </text>
            </g>
          ))}
          {zoom === 1 && (
            <>
              <text
                x={size.width * 0.57}
                y={size.height * 0.34}
                className="hs-country-label"
              >
                SWEDEN
              </text>
              <text
                x={size.width * 0.83}
                y={size.height * 0.6}
                className="hs-water-label"
                transform={`rotate(-70 ${size.width * 0.83} ${size.height * 0.6})`}
              >
                BALTIC SEA
              </text>
            </>
          )}
          {!dogMarkers &&
            shelters.map((s) => {
              const point = prepared.projection(s.coordinates);
              if (!point) return null;
              const x = (point[0] - cx) * zoom + cx + pan.x,
                y = (point[1] - cy) * zoom + cy + pan.y;
              if (
                x < -25 ||
                x > size.width + 25 ||
                y < 80 ||
                y > size.height - 40
              )
                return null;
              const active = s.id === selectedId;
              const Icon = mode === 'impact' ? Heart : PawPrint;
              const left = s.id === 'alingsas';
              const labelX = left
                ? Math.max(105, x - 32)
                : Math.min(size.width - 112, x + 32);
              const labelY = y + (s.id === 'orkelljunga' ? 15 : -13);
              const percentage = Math.round(
                ((raised[s.id] ?? s.raised) / s.goal) * 100,
              );
              return (
                <g
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className="hs-shelter-marker"
                  aria-pressed={active}
                  aria-label={`${s.name} shelter. ${mode === 'impact' ? `${sek(raised[s.id] ?? s.raised)} in demo support` : 'View the dog care story'}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onSelect(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(s.id);
                    }
                  }}
                >
                  <path
                    d={`M${x} ${y} L${labelX} ${labelY}`}
                    stroke={active ? '#e0f4b3' : '#b0c99b'}
                    strokeWidth="1"
                    fill="none"
                  />
                  {active && (
                    <circle cx={x} cy={y} r="25" fill="#d9f1a8" opacity=".15" />
                  )}
                  <circle
                    className="hs-pin-circle"
                    cx={x}
                    cy={y}
                    r={active ? 16 : 13}
                    fill={active ? '#e8f5c5' : '#fffef5'}
                    stroke="#526f49"
                    strokeWidth="1.5"
                  />
                  <Icon
                    x={x - 8}
                    y={y - 8}
                    width="16"
                    height="16"
                    color="#35513a"
                    strokeWidth="1.7"
                  />
                  <rect
                    x={left ? labelX - 102 : labelX}
                    y={labelY - 19}
                    width="106"
                    height="43"
                    rx="7"
                    fill={active ? '#e8f0d5' : '#1b362a'}
                    stroke={active ? '#d5e7b3' : '#52734a'}
                    strokeWidth="1"
                  />
                  <text
                    x={left ? labelX - 49 : labelX + 53}
                    y={labelY - 2}
                    textAnchor="middle"
                    className={active ? 'hs-pin-label active' : 'hs-pin-label'}
                  >
                    {s.name}
                  </text>
                  <text
                    x={left ? labelX - 49 : labelX + 53}
                    y={labelY + 13}
                    textAnchor="middle"
                    className={
                      active ? 'hs-pin-caption active' : 'hs-pin-caption'
                    }
                  >
                    {mode === 'impact'
                      ? `${percentage}% demo funded`
                      : 'Meet the dogs'}
                  </text>
                </g>
              );
            })}
          {dogMarkers?.map((dog) => {
            const point = prepared.projection(dog.coordinates);
            if (!point) return null;
            const x = (point[0] - cx) * zoom + cx + pan.x;
            const y = (point[1] - cy) * zoom + cy + pan.y;
            if (x < 0 || x > size.width || y < 45 || y > size.height - 30)
              return null;
            const active = dog.shelterId === selectedId;
            const funded = dog.amountOre > 0;
            const width = size.width < 500 ? 138 : 164;
            const left = dog.shelterId === 'alingsas';
            const cardX = Math.max(
              12,
              Math.min(size.width - width - 12, x + (left ? -width - 34 : 36)),
            );
            const cardY = Math.max(
              60,
              Math.min(
                size.height - 132,
                y +
                  (dog.shelterId === 'stockholm'
                    ? -140
                    : left
                      ? size.width < 500
                        ? -148
                        : -95
                      : 16),
              ),
            );
            const allocation = careAllocation(dog.amountOre);
            return (
              <g
                key={dog.id}
                className="donation-dog-pin"
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`Select ${dog.name} in ${dog.location}, ${kronor(dog.amountOre)} SEK in demo support`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelect(dog.shelterId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(dog.shelterId);
                  }
                }}
              >
                <path
                  d={`M${x} ${y} L${left ? cardX + width : cardX} ${cardY + 30}`}
                  fill="none"
                  stroke={active ? '#d4f6a0' : '#617166'}
                  strokeWidth="1"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 29 : 24}
                  fill={active ? '#d4f6a014' : '#000'}
                  stroke={active ? '#d4f6a0' : '#839184'}
                  strokeWidth="1"
                />
                <clipPath id={`dog-photo-${dog.id}`}>
                  <circle cx={x} cy={y} r="20" />
                </clipPath>
                <image
                  href={dog.photos[0].src}
                  x={x - 20}
                  y={y - 20}
                  width="40"
                  height="40"
                  clipPath={`url(#dog-photo-${dog.id})`}
                  preserveAspectRatio="xMidYMid slice"
                />
                <rect
                  className="donation-pin-card"
                  x={cardX}
                  y={cardY}
                  width={width}
                  height={funded ? 110 : 60}
                  rx="10"
                  fill={active ? '#20271c' : '#101310'}
                  stroke={active ? '#b6d88c' : '#3c443d'}
                />
                <text
                  x={cardX + 13}
                  y={cardY + 24}
                  className="donation-pin-name"
                >
                  {dog.name}
                </text>
                <text
                  x={cardX + 13}
                  y={cardY + 43}
                  className="donation-pin-place"
                >
                  {dog.location}
                </text>
                {funded && (
                  <>
                    <text
                      x={cardX + 13}
                      y={cardY + 68}
                      className="donation-pin-value"
                    >
                      {kronor(dog.amountOre)} SEK
                    </text>
                    {careKinds.map((kind, index) => (
                      <g key={kind.id} opacity={allocation[kind.id] ? 1 : 0.3}>
                        <title>
                          {kind.label}: {kronor(allocation[kind.id])} SEK (demo)
                        </title>
                        <PixelCareIcon
                          kind={kind.id}
                          x={cardX + 13 + index * 35}
                          y={cardY + 78}
                          width="24"
                          height="24"
                        />
                      </g>
                    ))}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
