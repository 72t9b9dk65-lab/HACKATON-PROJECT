'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, MapPin, Pause, Play } from 'lucide-react';
import { DogName } from '@/components/dog-name';
import { DogPortrait } from '@/components/dog-portrait';
import { PixelCareIcon } from '@/components/pixel-care-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  careKinds,
  kronor,
  profileDogs,
  type fundingSummary,
} from '@/lib/donation-shell';
import { carePlans, carePlan, type CareProjection } from '@/lib/care-impact';
import { shelterSceneLayout } from '@/lib/shelter-scene';

export function VirtualShelter({
  funding,
  previewIds,
  projection,
  confirmed,
  shelterName,
  onSelectDog,
}: {
  funding: ReturnType<typeof fundingSummary>;
  previewIds: string[];
  projection: CareProjection;
  confirmed: boolean;
  shelterName: string;
  onSelectDog: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const yardRef = useRef<HTMLDivElement>(null);
  const [yardWidth, setYardWidth] = useState(900);
  useEffect(() => {
    const yard = yardRef.current;
    if (!yard) return;
    const observer = new ResizeObserver(([entry]) =>
      setYardWidth(entry.contentRect.width),
    );
    observer.observe(yard);
    return () => observer.disconnect();
  }, []);
  const previewKey = previewIds.join(',');
  useEffect(() => {
    if (previewKey && yardRef.current) yardRef.current.scrollTop = 0;
  }, [previewKey]);
  const [inspected, setInspected] = useState<{
    id: string;
    preview: boolean;
  } | null>(null);
  const residents = profileDogs.filter(
    (dog) => funding.byDog[dog.id].amountOre > 0,
  );
  const previewDogs = previewIds.map((id) =>
    profileDogs.find((dog) => dog.id === id)!,
  );
  const dog = inspected
    ? profileDogs.find((item) => item.id === inspected.id)!
    : null;
  const population = [
    ...previewDogs.map((item) => ({
      dog: item,
      preview: !confirmed,
      visitor: true,
    })),
    ...residents
      .filter((item) => !confirmed || !previewIds.includes(item.id))
      .map((item) => ({ dog: item, preview: false, visitor: false })),
  ];
  const unmatchedCount = Math.max(0, projection.dogCount - previewIds.length);
  const stationIndex = carePlans.findIndex(
    (plan) => plan.id === projection.careId,
  );
  const scene = shelterSceneLayout(
    yardWidth,
    population.length + unmatchedCount,
    stationIndex,
  );
  const plan = carePlan(projection.careId);

  return (
    <Dialog
      open={inspected !== null}
      onOpenChange={(open) => {
        if (!open) setInspected(null);
      }}
    >
      <section
        className="virtual-shelter"
        aria-labelledby="virtual-shelter-title"
      >
        <div className="virtual-shelter-heading">
          <img
            src="/shelters/pixel-shelter.png"
            width="80"
            height="80"
            alt=""
            aria-hidden="true"
          />
          <div>
            <span className="donation-eyebrow">CONNECTED TO REAL DOGS</span>
            <h2 id="virtual-shelter-title">{shelterName}</h2>
            <p>Watch care take shape. Click a dog to meet them.</p>
          </div>
          <Button
            variant="outline"
            className="virtual-motion-toggle"
            onClick={() => setPaused((current) => !current)}
            aria-label={paused ? 'Resume dog movement' : 'Pause dog movement'}
            aria-pressed={paused}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </Button>
        </div>

        <div
          className="virtual-shelter-legend"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>
            <i /> {residents.length} supported profiles
          </span>
          {previewIds.length > 0 && (
            <span>
              <i className="virtual-preview-dot" /> {projection.dogCount}{' '}
              {confirmed
                ? 'dogs in this demo gift'
                : 'estimated care recipients'}
            </span>
          )}
        </div>

        <div
          ref={yardRef}
          className="virtual-shelter-yard virtual-service-yard"
          data-paused={paused || inspected !== null}
          aria-label="Your virtual shelter. Choose a dog to see its profile."
          tabIndex={0}
        >
          <div
            className="virtual-service-scene"
            style={{ height: scene.height }}
          >
            <div className="care-stations">
              {carePlans.map((station) => (
                <div
                  className="care-station"
                  data-active={
                    projection.careId === station.id &&
                    projection.totalUnits > 0
                  }
                  key={station.id}
                >
                  <strong>{station.name}</strong>
                  <span>
                    {projection.careId === station.id
                      ? projection.totalUnits
                      : 0}{' '}
                    {station.unit} planned
                  </span>
                  <img
                    src={station.asset}
                    alt={station.name}
                    width="148"
                    height="148"
                  />
                </div>
              ))}
            </div>
            {population.length ? (
              population.map(({ dog: item, preview, visitor }, index) => (
                <div
                  className="virtual-dog-space virtual-service-dog-space"
                  style={{
                    left: scene.positions[index].x,
                    top: scene.positions[index].y,
                  }}
                  key={`${preview ? 'preview' : 'resident'}-${item.id}`}
                >
                  <DialogTrigger
                    render={<button type="button" />}
                    className={`virtual-roaming-dog ${preview ? 'virtual-roaming-preview' : ''} ${visitor && index >= projection.activeStartIndex && index < projection.activeStartIndex + projection.activeDogs ? 'virtual-service-visitor' : ''}`}
                    style={
                      {
                        '--roam-duration': `${8 + (index % 5) * 2}s`,
                        '--roam-delay': `${-index * 1.7}s`,
                        '--roam-x': `${index % 2 ? -12 : 12}px`,
                        '--roam-y': `${index % 3 ? 8 : -8}px`,
                        '--service-x': `${scene.positions[index].dx}px`,
                        '--service-y': `${scene.positions[index].dy}px`,
                      } as CSSProperties
                    }
                    onClick={() => {
                      setInspected({ id: item.id, preview });
                      onSelectDog(item.id);
                    }}
                    aria-label={`${preview ? 'Preview care for' : 'Meet'} ${item.name}, ${item.breed}`}
                  >
                    <img
                      src={item.sprite}
                      width="72"
                      height="72"
                      alt=""
                      draggable="false"
                      loading="lazy"
                    />
                    {visitor &&
                      index >= projection.activeStartIndex &&
                      index <
                        projection.activeStartIndex + projection.activeDogs && (
                        <span className="virtual-dog-activity">
                          {plan.activity}
                        </span>
                      )}
                    <span className="virtual-dog-name">
                      <DogName name={item.name} />
                    </span>
                    {preview && <small>Preview</small>}
                  </DialogTrigger>
                </div>
              ))
            ) : (
              <p className="virtual-shelter-empty">
                Choose a care example to welcome your first companions.
              </p>
            )}
            {Array.from({ length: unmatchedCount }, (_, index) => {
              const position = scene.positions[population.length + index];
              const visiting =
                previewDogs.length + index >= projection.activeStartIndex &&
                previewDogs.length + index <
                  projection.activeStartIndex + projection.activeDogs;
              return (
                <div
                  className="virtual-service-dog-space"
                  key={`future-${index}`}
                  style={{ left: position.x, top: position.y }}
                >
                  <div
                    className={`virtual-roaming-dog virtual-roaming-preview virtual-service-future-dog ${visiting ? 'virtual-service-visitor' : ''}`}
                    style={
                      {
                        '--service-x': `${position.dx}px`,
                        '--service-y': `${position.dy}px`,
                        '--roam-duration': '14s',
                        '--roam-delay': `${-index * 2}s`,
                        '--roam-x': '8px',
                        '--roam-y': '6px',
                      } as CSSProperties
                    }
                  >
                    <img
                      src="/dogs/pixel-breeds/mixed-medium.png"
                      alt="Illustrative future dog, not yet matched to a real profile"
                      width="72"
                      height="72"
                    />
                    <span>Future dog</span>
                    <small>Not yet matched</small>
                    {visiting && (
                      <span className="virtual-dog-activity">
                        {plan.activity}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="virtual-shelter-note">
          {projection.activeDogs
            ? `${projection.activeDogs} ${projection.activeDogs === 1 ? 'dog uses' : 'dogs use'} ${plan.name.toLowerCase()} on this forecast day. `
            : 'No care use scheduled on this forecast day. '}
          Named dogs link to real profiles; matching and care timing are
          simulated. Faded dogs are estimates, not verified recipients.
        </p>
      </section>

      {dog && inspected && (
        <DialogContent className="donation-shell virtual-dog-dialog">
          <DogPortrait dog={dog} />
          <span className="donation-eyebrow">
            {inspected.preview
              ? 'CARE PREVIEW · NOT YET ADDED'
              : 'A REAL DOG BEHIND YOUR CARE'}
          </span>
          <DialogTitle>
            <DogName name={dog.name} />
          </DialogTitle>
          <p className="virtual-profile-breed">
            {dog.breed} · {dog.group ? 'Group profile' : dog.age}
          </p>
          <p className="virtual-profile-location">
            <MapPin size={15} /> {dog.location} · {dog.status}
          </p>
          <DialogDescription>{dog.description}</DialogDescription>
          {inspected.preview ? (
            <p className="virtual-profile-preview-note">
              This is an illustrative match for your chosen amount. No donation
              has been added for this preview. The selected plan could
              contribute to {plan.name.toLowerCase()}.
            </p>
          ) : (
            <div className="virtual-profile-care">
              <strong>
                {kronor(funding.byDog[dog.id].amountOre)} SEK{' '}
                <small>in shared demo care</small>
              </strong>
              <div>
                {careKinds.map((kind) => (
                  <span key={kind.id}>
                    <PixelCareIcon kind={kind.id} width="24" height="24" />
                    {kronor(funding.byDog[dog.id].allocation[kind.id])} SEK{' '}
                    <small>{kind.label}</small>
                  </span>
                ))}
              </div>
            </div>
          )}
          <a
            className="virtual-profile-link"
            href={dog.source}
            target="_blank"
            rel="noreferrer"
          >
            Meet {dog.name} on Hundstallet <ArrowUpRight size={17} />
          </a>
        </DialogContent>
      )}
    </Dialog>
  );
}
