'use client';

import { useState, type ReactNode } from 'react';
import { ArrowUp, ArrowUpRight, MapPin, Pause, Play } from 'lucide-react';
import { DogName } from '@/components/dog-name';
import { DogNeedBadge } from '@/components/dog-need-badge';
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
import { carePlan, type CareProjection } from '@/lib/care-impact';
import {
  ShelterLifeScene,
  type ShelterCompanion,
} from '@/components/shelter-life-scene';
import {
  dogNeeds,
  matchesCareNeed,
  needKinds,
  waitingDogIds,
} from '@/lib/dog-needs';

export function VirtualShelter({
  funding,
  residentIds,
  previewIds,
  projection,
  confirmed,
  shelterName,
  onSelectDog,
  children,
}: {
  funding: ReturnType<typeof fundingSummary>;
  residentIds: string[];
  previewIds: string[];
  projection: CareProjection;
  confirmed: boolean;
  shelterName: string;
  onSelectDog: (id: string) => void;
  children?: ReactNode;
}) {
  const [paused, setPaused] = useState(false);
  const [inspected, setInspected] = useState<{
    id: string;
    preview: boolean;
    waiting?: boolean;
  } | null>(null);
  const residents = profileDogs.filter((dog) => residentIds.includes(dog.id));
  const waitingIds = waitingDogIds(profileDogs, residentIds, previewIds);
  const waitingDogs = waitingIds.map((id) =>
    profileDogs.find((item) => item.id === id)!,
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
      .filter((item) => !previewIds.includes(item.id))
      .map((item) => ({ dog: item, preview: false, visitor: false })),
  ];
  const unmatchedCount = Math.max(0, projection.dogCount - previewIds.length);
  const companions: ShelterCompanion[] = [
    ...population.map(({ dog: item, preview, visitor }, index) => ({
      key: item.id,
      profileId: item.id,
      name: item.name,
      breed: item.breed,
      sprite: item.sprite,
      preview,
      careScheduled:
        visitor &&
        index >= projection.activeStartIndex &&
        index < projection.activeStartIndex + projection.activeDogs,
    })),
    ...Array.from({ length: unmatchedCount }, (_, index) => ({
      key: `future-${index}`,
      profileId: null,
      name: 'Future dog',
      breed: 'Illustrative companion',
      sprite: '/dogs/pixel-breeds/mixed-medium.png',
      preview: true,
      careScheduled:
        previewDogs.length + index >= projection.activeStartIndex &&
        previewDogs.length + index <
          projection.activeStartIndex + projection.activeDogs,
    })),
  ];
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
            aria-label={
              paused ? 'Resume shelter animation' : 'Pause shelter animation'
            }
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
            <i /> {residents.length} shelter companions
          </span>
          {previewIds.length > 0 && (
            <span>
              <i className="virtual-preview-dot" /> {projection.dogCount}{' '}
              {confirmed
                ? 'dogs in this demo gift'
                : 'estimated care recipients in preview'}
            </span>
          )}
        </div>

        <ShelterLifeScene
          companions={companions}
          projection={projection}
          paused={paused || inspected !== null}
          onInspect={(id, preview) => {
            setInspected({ id, preview });
            onSelectDog(id);
          }}
        />
        <p className="virtual-shelter-note">
          {projection.activeDogs
            ? `${projection.activeDogs} ${projection.activeDogs === 1 ? 'dog has' : 'dogs have'} ${plan.name.toLowerCase()} scheduled on this forecast day. `
            : 'No care use scheduled on this forecast day. '}
          Daily routines and need labels are illustrative. Faded dogs preview
          possible care; they are not verified recipients.
        </p>
      </section>

      {children}

      <section className="dogs-in-need" aria-labelledby="dogs-in-need-title">
        <div className="dogs-in-need-heading">
          <div>
            <h2 id="dogs-in-need-title">
              Dogs in need <span>{waitingDogs.length}</span>
            </h2>
            <p>Real dog profiles with illustrative care needs.</p>
          </div>
          {!confirmed && previewIds.length > 0 && (
            <span className="dogs-in-need-transfer" role="status">
              <ArrowUp size={16} />{' '}
              {previewIds.filter((id) => !residentIds.includes(id)).length}{' '}
              moved into your preview
            </span>
          )}
        </div>
        <div className="dogs-in-need-legend" aria-label="Demo need labels">
          {needKinds.map((need) => (
            <DogNeedBadge key={need.id} need={need.id} showLabel />
          ))}
        </div>
        <p className="dogs-in-need-hint">
          Your amount brings matching dogs into the shelter above. Reduce it to
          return them here.
        </p>
        <div
          className="dogs-in-need-grid"
          tabIndex={0}
          aria-label="Dogs waiting for shared care"
        >
          {waitingDogs.map((item) => (
            <DialogTrigger
              key={item.id}
              render={<button type="button" />}
              className="dog-in-need-card"
              data-matching={matchesCareNeed(item.id, projection.careId)}
              onClick={() => {
                setInspected({ id: item.id, preview: false, waiting: true });
                onSelectDog(item.id);
              }}
              aria-label={`Meet ${item.name}, ${item.breed}. Demo needs: ${dogNeeds(
                item.id,
              )
                .map((id) => needKinds.find((kind) => kind.id === id)!.label)
                .join(', ')}`}
            >
              <span className="dog-in-need-art">
                <img
                  src={item.sprite}
                  alt=""
                  width="100"
                  height="100"
                  loading="lazy"
                  draggable="false"
                />
                <span className="dog-in-need-badges">
                  {dogNeeds(item.id).map((need) => (
                    <DogNeedBadge key={need} need={need} />
                  ))}
                </span>
              </span>
              <DogName name={item.name} />
              <span className="dog-in-need-breed">{item.breed}</span>
              <small>Demo needs</small>
            </DialogTrigger>
          ))}
          {waitingDogs.length === 0 && (
            <p className="dogs-in-need-empty">
              All individual profiles are in your shelter or its preview. Extra
              care can support them again.
            </p>
          )}
        </div>
        <p className="dogs-in-need-note">
          Badges are demo scenarios, including urgency; they are not medical
          reports from Hundstallet. Group listings remain on the Sweden map.
        </p>
      </section>

      {dog && inspected && (
        <DialogContent className="donation-shell virtual-dog-dialog">
          <DogPortrait dog={dog} />
          <span className="donation-eyebrow">
            {inspected.waiting
              ? 'DOGS IN NEED · DEMO SCENARIO'
              : inspected.preview
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
          <div className="dogs-in-need-legend">
            {dogNeeds(dog.id).map((need) => (
              <DogNeedBadge key={need} need={need} showLabel />
            ))}
          </div>
          <p className="dogs-in-need-note">
            Illustrative needs, not verified health information. See the
            official profile for details.
          </p>
          {inspected.waiting ? (
            <p className="virtual-profile-preview-note">
              Choose an amount to preview shared care for matching dogs. This
              dog is currently in the waiting grid.
            </p>
          ) : inspected.preview ? (
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
