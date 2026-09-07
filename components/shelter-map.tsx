'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import {
  ArrowLeft,
  ArrowUpRight,
  LoaderCircle,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import {
  prepareSwedenMap,
  type SwedenBoundary,
  type SwedenDetails,
} from '@/lib/sweden-map';
import { realShelters } from '@/lib/hundstallet-shelters';
import {
  profileDogs,
  kronor,
  careKinds,
  type fundingSummary,
} from '@/lib/donation-shell';
import {
  OVERVIEW_CAMERA,
  interpolateCamera,
  shelterCamera,
  type MapCamera,
} from '@/lib/shelter-camera';
import { PixelCareIcon } from '@/components/pixel-care-icon';
import { DogName } from '@/components/dog-name';

type LocalMap = FeatureCollection<
  Geometry,
  {
    kind: 'building' | 'road' | 'water' | 'park';
    name: string;
    roadType: string;
  }
>;
type Funding = ReturnType<typeof fundingSummary>;

export default function ShelterMap({
  selectedDogId,
  funding,
  onSelectDog,
}: {
  selectedDogId: string;
  funding: Funding;
  onSelectDog: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const directory = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Record<string, SVGGElement | null>>({});
  const [size, setSize] = useState({ width: 800, height: 770 });
  const [geography, setGeography] = useState<{
    boundary: SwedenBoundary;
    details: SwedenDetails;
  }>();
  const [mapError, setMapError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState(false);
  const [localMaps, setLocalMaps] = useState<Record<string, LocalMap>>({});
  const [failedShelterId, setFailedShelterId] = useState<string | null>(null);
  const localError = focusId !== null && failedShelterId === focusId;
  const [localRetry, setLocalRetry] = useState(0);
  const [overviewZoom, setOverviewZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [camera, setCamera] = useState<MapCamera>(OVERVIEW_CAMERA);
  const cameraRef = useRef(camera);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const shelter = realShelters.find((item) => item.id === focusId);
  const selectedDog = profileDogs.find((dog) => dog.id === selectedDogId)!;
  const shelterDogs = profileDogs.filter((dog) => dog.shelterId === focusId);
  const shownDogs = allProfiles ? profileDogs : shelterDogs;
  const selectedFunding = funding.byDog[selectedDogId];

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      ['/data/sweden.json', '/data/sweden-details.json'].map(async (url) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Map unavailable');
        return response.json();
      }),
    )
      .then(([boundaryData, detailsData]) => {
        const boundary = boundaryData as SwedenBoundary;
        const details = detailsData as SwedenDetails;
        prepareSwedenMap(boundary, 800, 770, details, 'donation');
        setGeography({ boundary, details });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setMapError(true);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!focusId || localMaps[focusId]) return;
    const controller = new AbortController();
    fetch(`/data/hundstallet/${focusId}-map.json`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Local map unavailable');
        return response.json() as Promise<LocalMap>;
      })
      .then((data: LocalMap) =>
        setLocalMaps((current) => ({ ...current, [focusId]: data })),
      )
      .catch((error) => {
        if (error.name !== 'AbortError') setFailedShelterId(focusId);
      });
    return () => controller.abort();
  }, [focusId, localMaps, localRetry]);

  const prepared = useMemo(
    () =>
      geography
        ? prepareSwedenMap(
            geography.boundary,
            size.width,
            size.height,
            geography.details,
            'donation',
          )
        : null,
    [geography, size],
  );
  const destination = useMemo(
    () =>
      shelter && prepared
        ? shelterCamera(
            prepared.projection,
            shelter.coordinates,
            size.width,
            size.height,
          )
        : {
            x: size.width * 0.56 * (1 - overviewZoom) + pan.x,
            y: size.height * 0.49 * (1 - overviewZoom) + pan.y,
            scale: overviewZoom,
          },
    [prepared, shelter, size, overviewZoom, pan],
  );

  useEffect(() => {
    const from = cameraRef.current;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const duration = reduced
      ? 0
      : from.scale > 10 || destination.scale > 10
        ? 1250
        : 100;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      const next = interpolateCamera(
        from,
        destination,
        progress,
        size.width,
        size.height,
      );
      cameraRef.current = next;
      setCamera(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [destination, size]);

  useEffect(() => {
    if (focusId) directory.current?.focus({ preventScroll: true });
  }, [focusId]);
  function openShelter(id: string) {
    setFocusId(id);
    setAllProfiles(false);
    if (selectedDog.shelterId !== id) {
      const first = profileDogs.find((dog) => dog.shelterId === id);
      if (first) onSelectDog(first.id);
    }
  }
  function closeShelter() {
    const previous = focusId;
    setFocusId(null);
    setAllProfiles(false);
    setOverviewZoom(1);
    setPan({ x: 0, y: 0 });
    if (previous) markerRefs.current[previous]?.focus();
  }
  const localPaths = useMemo(() => {
    if (!prepared || !focusId || !localMaps[focusId]) return [];
    const path = geoPath(prepared.projection).digits(8);
    return [...localMaps[focusId].features]
      .sort(
        (a, b) =>
          ['park', 'water', 'building', 'road'].indexOf(a.properties.kind) -
          ['park', 'water', 'building', 'road'].indexOf(b.properties.kind),
      )
      .map((feature) => ({
        ...feature.properties,
        id: feature.id,
        path: path(feature) ?? '',
      }));
  }, [prepared, localMaps, focusId]);
  const screenPoint = (coordinates: [number, number]) => {
    const point = prepared!.projection(coordinates)!;
    return [
      point[0] * camera.scale + camera.x,
      point[1] * camera.scale + camera.y,
    ];
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      className={`shelter-explorer ${shelter ? 'shelter-explorer-focused' : ''}`}
      ref={container}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && focusId) {
          event.preventDefault();
          closeShelter();
        }
      }}
    >
      {!prepared ? (
        <div className="map-loading" role="status">
          {mapError ? (
            <>
              <p>The map could not be loaded.</p>
              <button
                onClick={() => {
                  setMapError(false);
                  setRetry((value) => value + 1);
                }}
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <LoaderCircle className="spin" />
              <p>Loading Sweden…</p>
            </>
          )}
        </div>
      ) : (
        <svg
          className="shelter-map-svg"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-label={
            shelter
              ? `Close-up of ${shelter.name} shelter at ${shelter.address}`
              : 'Sweden map. Select a pixel shelter to zoom in and meet its dogs.'
          }
          tabIndex={0}
          onPointerDown={(event) => {
            if (focusId || event.button !== 0) return;
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              panX: pan.x,
              panY: pan.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setPan({
              x: Math.max(
                -size.width * overviewZoom,
                Math.min(
                  size.width * overviewZoom,
                  drag.current.panX + event.clientX - drag.current.x,
                ),
              ),
              y: Math.max(
                -size.height * overviewZoom,
                Math.min(
                  size.height * overviewZoom,
                  drag.current.panY + event.clientY - drag.current.y,
                ),
              ),
            });
          }}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget || focusId) return;
            if (event.key === '+' || event.key === '-') {
              event.preventDefault();
              setOverviewZoom((z) =>
                Math.min(
                  6,
                  Math.max(1, z * (event.key === '+' ? 1.3 : 1 / 1.3)),
                ),
              );
            }
            if (event.key.startsWith('Arrow')) {
              event.preventDefault();
              setPan((p) => ({
                x:
                  p.x +
                  (event.key === 'ArrowRight'
                    ? 30
                    : event.key === 'ArrowLeft'
                      ? -30
                      : 0),
                y:
                  p.y +
                  (event.key === 'ArrowDown'
                    ? 30
                    : event.key === 'ArrowUp'
                      ? -30
                      : 0),
              }));
            }
          }}
        >
          <defs>
            <clipPath id="shelter-sweden-clip">
              <path d={prepared.outline} />
            </clipPath>
          </defs>
          <g
            transform={`translate(${camera.x},${camera.y}) scale(${camera.scale})`}
          >
            <g opacity={Math.max(0, Math.min(1, (25 - camera.scale) / 15))}>
              <path
                d={prepared.outline}
                className="hs-sweden-land"
                vectorEffect="non-scaling-stroke"
              />
              <g clipPath="url(#shelter-sweden-clip)">
                {prepared.counties.map((item, i) => (
                  <path
                    key={item.id}
                    d={item.path}
                    className={`hs-county hs-county-${i % 3}`}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {prepared.rivers.map((item) => (
                  <path
                    key={item.id}
                    d={item.path}
                    className="hs-river"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {prepared.lakes.map((item) => (
                  <path
                    key={item.id}
                    d={item.path}
                    className="hs-lake"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            </g>
            <g opacity={Math.min(1, Math.max(0, (camera.scale - 10) / 40))}>
              {localPaths.map((item) => (
                <path
                  key={item.id}
                  d={item.path}
                  className={`shelter-local-${item.kind} ${['footway', 'path', 'track'].includes(item.roadType) ? 'shelter-local-path' : ''}`}
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{item.name}</title>
                </path>
              ))}
            </g>
          </g>
          {camera.scale < 10 &&
            geography?.details.places
              .filter(
                (place) =>
                  (place.properties.population ?? 0) >
                  (overviewZoom > 1.5 ? 40000 : 150000),
              )
              .map((place) => {
                if (place.geometry.type !== 'Point') return null;
                const [x, y] = screenPoint(
                  place.geometry.coordinates as [number, number],
                );
                return (
                  <text
                    key={place.id}
                    x={x + 7}
                    y={y - 6}
                    className="shelter-city-label"
                    pointerEvents="none"
                  >
                    {place.properties.name}
                  </text>
                );
              })}
          {realShelters.map((item) => {
            if (shelter && shelter.id !== item.id) return null;
            const [x, y] = screenPoint(item.coordinates);
            const count = profileDogs.filter(
              (dog) => dog.shelterId === item.id,
            ).length;
            const total = profileDogs
              .filter((dog) => dog.shelterId === item.id)
              .reduce((sum, dog) => sum + funding.byDog[dog.id].amountOre, 0);
            const iconWidth = shelter ? 150 : 80;
            const labelX = shelter ? -71 : Math.min(44, size.width - x - 152);
            const labelY = shelter ? 12 : -37;
            return (
              <g
                key={item.id}
                ref={(element) => {
                  markerRefs.current[item.id] = element;
                }}
                transform={`translate(${x},${y})`}
                role="button"
                tabIndex={0}
                aria-label={`Explore ${item.name} shelter, ${count} profiles`}
                aria-expanded={focusId === item.id}
                aria-controls={focusId ? 'shelter-directory' : undefined}
                className="shelter-pixel-marker"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => openShelter(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    openShelter(item.id);
                  }
                }}
              >
                <circle r="5" className="shelter-pin-dot" strokeWidth="2" />
                <image
                  href="/shelters/pixel-shelter.png"
                  x={-iconWidth / 2}
                  y={-iconWidth - 4}
                  width={iconWidth}
                  height={iconWidth}
                  className="shelter-pixel-image"
                />
                <rect
                  x={labelX}
                  y={labelY}
                  width="142"
                  height={shelter ? 43 : 55}
                  rx="6"
                  className="shelter-pin-label"
                />
                <text
                  textAnchor="middle"
                  x={labelX + 71}
                  y={labelY + 18}
                  className="shelter-marker-name"
                >
                  {item.name}
                </text>
                <text
                  textAnchor="middle"
                  x={labelX + 71}
                  y={labelY + 34}
                  className="shelter-marker-count"
                >
                  {count} profiles{!shelter && ' · explore ↗'}
                </text>
                {!shelter && (
                  <text
                    textAnchor="middle"
                    x={labelX + 71}
                    y={labelY + 48}
                    className="shelter-marker-amount"
                  >
                    {kronor(total)} SEK demo care
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {!shelter ? (
        <>
          <div className="donation-map-heading">
            <span className="donation-eyebrow">A SECOND CHANCE, MAPPED</span>
            <h2>Your kindness, across Sweden.</h2>
            <p>Tap a shelter to meet the dogs.</p>
          </div>
          <div className="donation-map-region">N ↑ &nbsp; SWEDEN</div>
          <div className="donation-map-key">
            <span />3 shelters · {profileDogs.length} profiles
          </div>
          <div className="donation-map-controls" aria-label="Map controls">
            <button
              aria-label="Zoom in"
              disabled={overviewZoom >= 6}
              onClick={() => setOverviewZoom((z) => Math.min(6, z * 1.3))}
            >
              <Plus size={18} />
            </button>
            <button
              aria-label="Zoom out"
              disabled={overviewZoom <= 1}
              onClick={() => setOverviewZoom((z) => Math.max(1, z / 1.3))}
            >
              <Minus size={18} />
            </button>
            <button
              aria-label="Reset Sweden map"
              onClick={() => {
                setOverviewZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        </>
      ) : (
        <>
          <button className="shelter-back" onClick={closeShelter}>
            <ArrowLeft size={16} /> Sweden
          </button>
          <div className="shelter-location-caption">
            <span>{shelter.address}</span>
            <small>
              {shelter.coordinates[1].toFixed(5)}° N ·{' '}
              {shelter.coordinates[0].toFixed(5)}° E
            </small>
          </div>
          {!localMaps[shelter.id] && (
            <div className="shelter-local-status" role="status">
              {localError ? (
                <button
                  onClick={() => {
                    setFailedShelterId(null);
                    setLocalRetry((value) => value + 1);
                  }}
                >
                  Retry street details
                </button>
              ) : (
                'Loading street details…'
              )}
            </div>
          )}
          <section
            id="shelter-directory"
            className="shelter-directory"
            ref={directory}
            tabIndex={-1}
            aria-label={`Dogs at ${shelter.name}`}
          >
            <div className="shelter-directory-heading">
              <div>
                <span>MEET THE DOGS</span>
                <h2>{shelter.name}</h2>
              </div>
              <button
                aria-label="Close shelter and return to Sweden"
                onClick={closeShelter}
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="shelter-directory-tabs"
              aria-label="Directory scope"
            >
              <button
                aria-pressed={!allProfiles}
                onClick={() => setAllProfiles(false)}
              >
                This shelter <span>{shelterDogs.length}</span>
              </button>
              <button
                aria-pressed={allProfiles}
                onClick={() => setAllProfiles(true)}
              >
                All profiles <span>{profileDogs.length}</span>
              </button>
            </div>
            <div
              className="shelter-dog-grid"
              tabIndex={0}
              aria-label={`${shownDogs.length} published profiles. Scroll to see every dog.`}
            >
              {shownDogs.map((dog) => (
                <button
                  key={dog.id}
                  className="shelter-dog-card"
                  aria-pressed={dog.id === selectedDogId}
                  onClick={() => {
                    onSelectDog(dog.id);
                    if (dog.shelterId && dog.shelterId !== focusId)
                      setFocusId(dog.shelterId);
                  }}
                  aria-label={`Meet ${dog.name}, ${dog.breed}, ${dog.location}`}
                >
                  <img
                    src={dog.sprite}
                    alt={dog.spriteDescription}
                    width="112"
                    height="112"
                    loading="lazy"
                    draggable="false"
                  />
                  <DogName name={dog.name} />
                  <span className="dog-breed-label">{dog.breed}</span>
                  <span>{dog.group ? 'Group profile' : dog.age}</span>
                  {allProfiles && <small>{dog.location}</small>}
                  {dog.status === 'Trial adoption' && (
                    <small>Trial adoption</small>
                  )}
                </button>
              ))}
            </div>
            <div className="shelter-dog-detail" aria-live="polite">
              <img
                src={selectedDog.photos[0].src}
                alt={selectedDog.name}
                width="48"
                height="48"
              />
              <div>
                <DogName name={selectedDog.name} />
                <span className="dog-breed-label">{selectedDog.breed}</span>
                <span>{selectedDog.location}</span>
                <a href={selectedDog.source} target="_blank" rel="noreferrer">
                  Official profile <ArrowUpRight size={12} />
                </a>
              </div>
              <div className="shelter-dog-support">
                <strong>
                  {kronor(selectedFunding.amountOre)} <small>SEK</small>
                </strong>
                <span>
                  {careKinds.map((kind) => (
                    <span
                      key={kind.id}
                      title={`${kind.label}: ${kronor(selectedFunding.allocation[kind.id])} SEK`}
                    >
                      <PixelCareIcon kind={kind.id} width="19" height="19" />
                      <small>
                        {kronor(selectedFunding.allocation[kind.id])}
                      </small>
                    </span>
                  ))}
                </span>
                <small>Demo care</small>
              </div>
            </div>
            <p className="shelter-directory-note">
              Published profiles · 7 Sep 2026 · includes groups. Avatars are
              illustrations.
            </p>
          </section>
        </>
      )}
      <div className="donation-map-credit">
        {shelter ? (
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
        ) : (
          <a
            href="https://www.naturalearthdata.com/"
            target="_blank"
            rel="noreferrer"
          >
            Geography: Natural Earth
          </a>
        )}
      </div>
    </div>
  );
}
