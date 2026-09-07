'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoDistance,
  geoCentroid,
  geoCircle,
} from 'd3-geo';
import {
  buildWorld,
  type CountryMeta,
  type GeoFeature,
  type WorldTopology,
} from '@/lib/world-model';
import {
  Droplets,
  HeartPulse,
  Wheat,
  House,
  GraduationCap,
  Heart,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  territories as defaultTerritories,
  cities as defaultCities,
  continents,
  needColor,
  categoryScore,
  impactColor,
  type Territory,
  type MapMode,
  type MapLevel,
  type CategoryId,
} from '@/lib/earth-data';

export const categoryIcons = {
  water: Droplets,
  food: Wheat,
  health: HeartPulse,
  shelter: House,
  education: GraduationCap,
};
export type GlobeProps = {
  mode: MapMode;
  level: MapLevel;
  category: CategoryId | 'all';
  selected: Territory;
  zoom: number;
  onZoom: (value: number) => void;
  focus: { coords: [number, number]; key: number };
  onSelect: (territory: Territory) => void;
  onCategory: (category: CategoryId, territory: Territory) => void;
  raised: Record<string, number>;
  onCountries?: (countries: Territory[]) => void;
  locations?: { countries: Territory[]; points: Territory[] };
  markerIcon?: LucideIcon;
};

export default function EarthGlobe({
  mode,
  level,
  category,
  selected,
  zoom,
  onZoom,
  focus,
  onSelect,
  onCategory,
  raised,
  onCountries,
  locations,
  markerIcon,
}: GlobeProps) {
  const territories = locations?.countries ?? defaultTerritories;
  const cities = locations?.points ?? defaultCities;
  const [world, setWorld] = useState<ReturnType<typeof buildWorld> | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [rotation, setRotation] = useState<[number, number, number]>([
    -19, -12, 0,
  ]);
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    rotation: [number, number, number];
    moved: boolean;
  } | null>(null);
  const pointerMoved = useRef(false);
  const callbacks = useRef({ onZoom, zoom, onCountries });
  callbacks.current = { onZoom, zoom, onCountries };
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    Promise.all([
      fetch('/data/world.json', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<WorldTopology>;
      }),
      fetch('/data/countries.json', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<CountryMeta>;
      }),
    ])
      .then(([topology, meta]: [WorldTopology, CountryMeta]) => {
        const preparedWorld = buildWorld(topology, meta);
        const { features } = preparedWorld;
        setWorld(preparedWorld);
        callbacks.current.onCountries?.(
          features
            .filter((f) => f.id !== undefined)
            .map((f) => {
              const id = String(f.id).padStart(3, '0');
              return (
                territories.find((t) => t.id === id) ?? {
                  id,
                  name: meta[id]?.name ?? f.properties.name,
                  continent: meta[id]?.continent ?? 'World',
                  coordinates:
                    meta[id]?.coords ?? (geoCentroid(f) as [number, number]),
                  score: -1,
                  raised: 0,
                  goal: 0,
                  people: 0,
                }
              );
            }),
        );
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    setRotation([-focus.coords[0], -focus.coords[1], 0]);
  }, [focus]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      callbacks.current.onZoom(
        Math.max(
          0.82,
          Math.min(22, callbacks.current.zoom * Math.exp(-e.deltaY * 0.0015)),
        ),
      );
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [world]);
  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([420, 380])
        .scale(286 * zoom)
        .rotate(rotation)
        .clipAngle(90)
        .precision(0.45),
    [zoom, rotation],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const isVisible = (coords: [number, number]) =>
    geoDistance(coords, [-rotation[0], -rotation[1]]) < 1.43;
  const resolve = (f: GeoFeature): Territory => {
    const id = String(f.id).padStart(3, '0');
    return (
      territories.find((t) => t.id === id) ?? {
        id,
        name: world?.meta[id]?.name ?? f.properties.name,
        continent: world?.meta[id]?.continent ?? 'World',
        coordinates:
          world?.meta[id]?.coords ?? (geoCentroid(f) as [number, number]),
        score: -1,
        raised: 0,
        goal: 0,
        people: 0,
      }
    );
  };
  const color = (t: Territory | undefined) =>
    !t || t.score < 0
      ? '#f1f1e9'
      : mode === 'impact'
        ? impactColor((raised[t.id] ?? t.raised) / t.goal)
        : needColor(
            category === 'all' ? t.score : categoryScore(t.score, category),
          );
  const markers = locations
    ? zoom > 2.5
      ? cities
      : territories
    : level === 'continents'
      ? continents
      : level === 'cities'
        ? cities
        : territories.filter((t) =>
            ['729', '180', '004', '804', '332', '076', '404'].includes(t.id),
          );
  function pick(t: Territory) {
    if (!pointerMoved.current) onSelect(t);
  }
  function endDrag(e: React.PointerEvent<SVGSVGElement>) {
    if (drag.current) {
      pointerMoved.current = drag.current.moved;
      drag.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }
  return (
    <div className="globe-render">
      {!world && !error && (
        <div className="map-loading">
          <LoaderCircle className="spin" size={28} />
          <span>The world is taking shape.</span>
        </div>
      )}
      {error && (
        <div className="map-loading">
          <p>The map could not be loaded.</p>
          <button
            className="light-button"
            onClick={() => setRetry((v) => v + 1)}
          >
            Retry
          </button>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox="0 0 840 760"
        className="globe-svg"
        role="group"
        aria-label="Interactive globe. Drag to rotate; use plus and minus to zoom. You can also find territories using the Search button."
        tabIndex={0}
        onKeyDown={(e) => {
          if (
            [
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
              '+',
              '-',
            ].includes(e.key)
          ) {
            e.preventDefault();
            if (e.key === '+') onZoom(Math.min(22, zoom * 1.3));
            else if (e.key === '-') onZoom(Math.max(0.82, zoom / 1.3));
            else
              setRotation(([x, y, z]) => [
                x +
                  (e.key === 'ArrowLeft' ? 8 : e.key === 'ArrowRight' ? -8 : 0),
                Math.max(
                  -85,
                  Math.min(
                    85,
                    y +
                      (e.key === 'ArrowUp'
                        ? 8
                        : e.key === 'ArrowDown'
                          ? -8
                          : 0),
                  ),
                ),
                z,
              ]);
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pointerMoved.current = false;
          drag.current = { x: e.clientX, y: e.clientY, rotation, moved: false };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 5) {
            drag.current.moved = true;
            pointerMoved.current = true;
            if (!e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.setPointerCapture(e.pointerId);
            setRotation([
              drag.current.rotation[0] + (dx * 0.3) / zoom,
              Math.max(
                -85,
                Math.min(85, drag.current.rotation[1] - (dy * 0.3) / zoom),
              ),
              0,
            ]);
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <radialGradient id="ocean" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="73%" stopColor="#f3f5ef" />
            <stop offset="100%" stopColor="#cad6d0" />
          </radialGradient>
          <radialGradient id="limb" cx="40%" cy="32%" r="69%">
            <stop offset="55%" stopColor="#112322" stopOpacity="0" />
            <stop offset="88%" stopColor="#1c3430" stopOpacity=".05" />
            <stop offset="100%" stopColor="#0b2420" stopOpacity=".31" />
          </radialGradient>
          <filter
            id="planet-shadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="18"
              stdDeviation="30"
              floodColor="#000"
              floodOpacity=".5"
            />
          </filter>
          <clipPath id="map-clip">
            <rect width="840" height="760" />
          </clipPath>
        </defs>
        <g
          aria-hidden="true"
          className="orbit-grid"
          fill="none"
          stroke="#a7c3b5"
        >
          <circle
            cx="420"
            cy="380"
            r="352"
            strokeOpacity=".10"
            strokeDasharray="2 7"
          />
          <circle cx="420" cy="380" r="328" strokeOpacity=".07" />
          <path
            d="M420 17v17 M420 726v17 M58 380h17 M765 380h17"
            strokeOpacity=".5"
          />
          <text
            x="420"
            y="57"
            textAnchor="middle"
            fill="#8b9f94"
            stroke="none"
            fontSize="10"
            letterSpacing="2"
          >
            N
          </text>
        </g>
        {world && (
          <g clipPath="url(#map-clip)">
            <path
              d={path({ type: 'Sphere' }) ?? ''}
              fill="url(#ocean)"
              stroke="#bdcfc3"
              strokeWidth="1.4"
              filter={zoom < 1.6 ? 'url(#planet-shadow)' : undefined}
            />
            <path
              d={path(geoGraticule10()) ?? ''}
              fill="none"
              stroke="#687b73"
              strokeWidth=".55"
              opacity=".18"
              pointerEvents="none"
            />
            {level === 'continents' ? (
              <>
                {world.features.map((f, i) => (
                  <path
                    key={f.id === undefined ? i : String(f.id)}
                    d={path(f) ?? ''}
                    fill="#f1f1e9"
                    stroke="#1d2725"
                    strokeWidth=".5"
                  />
                ))}
                {world.continents.map((c) => (
                  <path
                    key={c.id}
                    d={path(c.geometry) ?? ''}
                    fill={color(continents.find((t) => t.id === c.id))}
                    stroke="#202925"
                    strokeWidth="2.2"
                    className="country-path"
                    onClick={() => pick(continents.find((t) => t.id === c.id)!)}
                  >
                    <title>{c.id} — demo data</title>
                  </path>
                ))}
              </>
            ) : (
              world.features.map((f, i) => {
                const t = resolve(f);
                const active = t.id === (selected.countryId ?? selected.id);
                return (
                  <path
                    key={f.id === undefined ? i : String(f.id)}
                    d={path(f) ?? ''}
                    fill={color(territories.find((x) => x.id === t.id))}
                    stroke={active ? '#1c2420' : '#27332e'}
                    strokeWidth={active ? 2.9 : 1.45}
                    strokeLinejoin="round"
                    className={`country-path ${hover === t.id ? 'hovered' : ''}`}
                    onPointerEnter={() => setHover(t.id)}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => pick(t)}
                  >
                    <title>
                      {t.name} —{' '}
                      {t.score < 0
                        ? 'data unavailable'
                        : `demo index ${t.score}/100`}
                    </title>
                  </path>
                );
              })
            )}
            <path
              d={path({ type: 'Sphere' }) ?? ''}
              fill="url(#limb)"
              pointerEvents="none"
            />
            {level === 'cities' &&
              cities
                .filter((c) => isVisible(c.coordinates))
                .map((c) => (
                  <path
                    key={c.id}
                    d={
                      path(geoCircle().center(c.coordinates).radius(0.38)()) ??
                      ''
                    }
                    fill={color(c)}
                    stroke="#1e2924"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    opacity=".86"
                    onClick={() => pick(c)}
                    className="country-path"
                  >
                    <title>
                      {c.name} — approximate project area, not a municipal
                      boundary
                    </title>
                  </path>
                ))}
            {markers
              .filter((t) => isVisible(t.coordinates))
              .map((t) => {
                const p = projection(t.coordinates);
                if (!p || p[0] < 30 || p[0] > 810 || p[1] < 80 || p[1] > 690)
                  return null;
                const active = t.id === selected.id;
                const cat =
                  category === 'all'
                    ? t.id === '180'
                      ? 'health'
                      : t.id === '004'
                        ? 'food'
                        : 'water'
                    : category;
                const Icon =
                  markerIcon ??
                  (mode === 'impact' ? Heart : categoryIcons[cat]);
                return (
                  <g
                    key={t.id}
                    transform={`translate(${p[0]},${p[1]})`}
                    className={`map-pin ${active ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${t.name}, ${mode === 'needs' ? 'view needs' : 'view aid'}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(t);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(t);
                      }
                    }}
                  >
                    {active && (
                      <circle
                        r="31"
                        fill="#dfffaa"
                        opacity=".22"
                        className="pin-pulse"
                      />
                    )}
                    <circle
                      r={active ? 22 : 17}
                      fill={active ? '#e4ffb8' : '#fffef8'}
                      stroke="#26352a"
                      strokeWidth="1.5"
                    />
                    <Icon
                      x={active ? -10 : -8}
                      y={active ? -10 : -8}
                      width={active ? 20 : 16}
                      height={active ? 20 : 16}
                      stroke="#253a2e"
                      strokeWidth="1.8"
                    />
                    {(active || level !== 'countries') && (
                      <g transform="translate(0,35)">
                        <rect
                          x={-Math.max(45, t.name.length * 4.7)}
                          y="0"
                          width={Math.max(90, t.name.length * 9.4)}
                          height="29"
                          rx="7"
                          fill="#122321"
                          stroke="#5b7064"
                          strokeWidth=".7"
                        />
                        <text
                          y="19"
                          textAnchor="middle"
                          fill="#f3f5ea"
                          fontSize="13"
                          fontWeight="550"
                        >
                          {t.name}
                        </text>
                      </g>
                    )}
                    {active && level === 'countries' && (
                      <g
                        transform="translate(47,-20)"
                        role="button"
                        aria-label={
                          locations
                            ? `Support dogs in ${t.name}`
                            : `Clean water in ${t.name}`
                        }
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCategory(cat, t);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            onCategory(cat, t);
                          }
                        }}
                      >
                        <rect
                          width="34"
                          height="34"
                          rx="10"
                          fill="#fffef8"
                          stroke="#26352a"
                        />
                        <Icon
                          x="9"
                          y="9"
                          width="16"
                          height="16"
                          stroke="#294232"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
          </g>
        )}
      </svg>
    </div>
  );
}
