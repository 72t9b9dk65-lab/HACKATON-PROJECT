'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PawPrint, Heart, LoaderCircle } from 'lucide-react';
import { prepareSwedenMap, type SwedenBoundary } from '@/lib/sweden-map';
import { shelters, sek } from '@/lib/hundstallet-data';
import type { MapMode } from '@/lib/earth-data';

export default function SwedenMap({
  selectedId,
  mode,
  zoom,
  onZoom,
  resetKey,
  raised,
  onSelect,
}: {
  selectedId: string;
  mode: MapMode;
  zoom: number;
  onZoom: (value: number) => void;
  resetKey: number;
  raised: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 770 });
  const [boundary, setBoundary] = useState<SwedenBoundary | null>(null);
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
    fetch('/data/sweden.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error('Map unavailable');
        return r.json() as Promise<SwedenBoundary>;
      })
      .then((data: SwedenBoundary) => {
        prepareSwedenMap(data, 800, 770);
        setBoundary(data);
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
          Math.min(3, zoomRef.current.zoom * Math.exp(-e.deltaY * 0.001)),
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
      boundary ? prepareSwedenMap(boundary, size.width, size.height) : null,
    [boundary, size],
  );
  const cx = size.width * 0.56,
    cy = size.height * 0.49;
  const limit = (x: number, y: number) => ({
    x: Math.max(-size.width * 0.65, Math.min(size.width * 0.65, x)),
    y: Math.max(-size.height * 0.65, Math.min(size.height * 0.65, y)),
  });
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
          aria-label="Map of Sweden and three Hundstallet shelters. Drag to pan, use arrow keys to move, and plus or minus to zoom."
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
              if (e.key === '+') onZoom(Math.min(3, zoom * 1.25));
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
              <title>Sweden · Natural Earth boundary</title>
            </path>
          </g>
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
          {shelters.map((s) => {
            const point = prepared.projection(s.coordinates);
            if (!point) return null;
            const x = (point[0] - cx) * zoom + cx + pan.x,
              y = (point[1] - cy) * zoom + cy + pan.y;
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
        </svg>
      )}
    </div>
  );
}
