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

export function VirtualShelter({
  funding,
  previewIds,
  onSelectDog,
}: {
  funding: ReturnType<typeof fundingSummary>;
  previewIds: string[];
  onSelectDog: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const yardRef = useRef<HTMLDivElement>(null);
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
    ...previewDogs.map((item) => ({ dog: item, preview: true })),
    ...residents.map((item) => ({ dog: item, preview: false })),
  ];

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
            <h2 id="virtual-shelter-title">Your virtual shelter</h2>
            <p>Click a dog to meet the real friend behind the pixels.</p>
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
              <i className="virtual-preview-dot" /> +{previewIds.length} care
              previews
            </span>
          )}
        </div>

        <div
          ref={yardRef}
          className="virtual-shelter-yard"
          data-paused={paused || inspected !== null}
          aria-label="Your virtual shelter. Choose a dog to see its profile."
          tabIndex={0}
        >
          {population.length ? (
            population.map(({ dog: item, preview }, index) => (
              <div
                className="virtual-dog-space"
                key={`${preview ? 'preview' : 'resident'}-${item.id}`}
              >
                <DialogTrigger
                  render={<button type="button" />}
                  className={`virtual-roaming-dog ${preview ? 'virtual-roaming-preview' : ''}`}
                  style={
                    {
                      '--roam-duration': `${8 + (index % 5) * 2}s`,
                      '--roam-delay': `${-index * 1.7}s`,
                      '--roam-x': `${index % 2 ? -12 : 12}px`,
                      '--roam-y': `${index % 3 ? 8 : -8}px`,
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
                  <span className="virtual-dog-name">
                    <DogName name={item.name} />
                  </span>
                  {preview && <small>Preview</small>}
                </DialogTrigger>
              </div>
            ))
          ) : (
            <p className="virtual-shelter-empty">
              Choose an amount below to imagine your first care companions.
            </p>
          )}
        </div>
        <p className="virtual-shelter-note">
          Every companion links to a real Hundstallet profile. Faded dogs
          preview possible shared care, including extra care for dogs already
          here.
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
              has been added for this preview.
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
