'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { useDogCare } from '@/hooks/use-dog-care';
import { DogName } from '@/components/dog-name';
import { DogPortrait } from '@/components/dog-portrait';
import { DogNeedBadge } from '@/components/dog-need-badge';
import { Button } from '@/components/ui/button';
import { kronor, profileDogs, type fundingSummary } from '@/lib/donation-shell';
import { carePlan, type CareProjection } from '@/lib/care-impact';
import type { ExpenseReplay } from '@/lib/donation-spending';
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
  replay,
  onExitReplay,
  fullImpact,
  onFullImpact,
  previewActive,
  onExitPreview,
}: {
  funding: ReturnType<typeof fundingSummary>;
  residentIds: string[];
  previewIds: string[];
  projection: CareProjection;
  confirmed: boolean;
  shelterName: string;
  onSelectDog: (id: string) => void;
  children?: ReactNode;
  replay: ExpenseReplay | null;
  onExitReplay: () => void;
  fullImpact: boolean;
  onFullImpact: (full: boolean) => void;
  previewActive: boolean;
  onExitPreview: () => void;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (replay) setPaused(false);
  }, [replay?.key]);
  const { inspected, openDog } = useDogCare();
  const residents = profileDogs.filter(
    (dog) =>
      residentIds.includes(dog.id) && funding.byDog[dog.id].amountOre > 0,
  );
  const visiblePreviewIds = replay || !previewActive ? [] : previewIds;
  const waitingIds = waitingDogIds(profileDogs, residentIds, visiblePreviewIds);
  const waitingDogs = waitingIds.map((id) =>
    profileDogs.find((item) => item.id === id)!,
  );
  const previewDogs = visiblePreviewIds.map((id) =>
    profileDogs.find((dog) => dog.id === id)!,
  );
  const population = [
    ...previewDogs.map((item) => ({
      dog: item,
      preview: !confirmed,
      visitor: true,
    })),
    ...residents
      .filter((item) => !visiblePreviewIds.includes(item.id))
      .map((item) => ({ dog: item, preview: false, visitor: false })),
  ];
  const unmatchedCount =
    replay || confirmed || !previewActive
      ? 0
      : Math.max(0, projection.dogCount - visiblePreviewIds.length);
  const companions: ShelterCompanion[] = [
    ...population.map(({ dog: item, preview, visitor }, index) => ({
      key: item.id,
      profileId: item.id,
      name: item.name,
      breed: item.breed,
      sprite: item.sprite,
      preview,
      careScheduled:
        !fullImpact &&
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
        !fullImpact &&
        previewDogs.length + index >= projection.activeStartIndex &&
        previewDogs.length + index <
          projection.activeStartIndex + projection.activeDogs,
    })),
  ];
  const plan = carePlan(projection.careId);

  return (
    <>
      <section
        className="virtual-shelter"
        aria-label={`${shelterName} activities`}
      >
        {visiblePreviewIds.length > 0 && (
          <div
            className="virtual-shelter-legend"
            aria-live="polite"
            aria-atomic="true"
          >
            {visiblePreviewIds.length > 0 && (
              <span>
                <i className="virtual-preview-dot" />{' '}
                {confirmed ? visiblePreviewIds.length : projection.dogCount}{' '}
                {confirmed
                  ? 'dogs in this demo gift'
                  : 'estimated care recipients in preview'}
              </span>
            )}
          </div>
        )}

        {!replay && previewActive && (
          <div className="shelter-impact-summary">
            <div
              className="shelter-impact-switch"
              aria-label="Donation preview view"
            >
              <Button
                variant="outline"
                aria-pressed={fullImpact}
                onClick={() => onFullImpact(true)}
              >
                Full impact
              </Button>
              <Button
                variant="outline"
                aria-pressed={!fullImpact}
                onClick={() => onFullImpact(false)}
              >
                Selected forecast day
              </Button>
              <Button variant="ghost" onClick={onExitPreview}>
                Exit donation preview
              </Button>
            </div>
            {fullImpact && (
              <p aria-live="polite">
                <strong>
                  After your {kronor(projection.committedOre)} SEK{' '}
                  {projection.contributions > 1
                    ? 'in projected gifts is'
                    : 'gift is'}{' '}
                  used
                </strong>
                <span>
                  {projection.dogCount} estimated{' '}
                  {projection.dogCount === 1 ? 'dog' : 'dogs'} helped ·{' '}
                  {projection.totalUnits} {plan.unit} of{' '}
                  {plan.name.toLowerCase()}.
                </span>
                <span>
                  {kronor(projection.allocatedOre)} SEK converted into care
                  {projection.reserveOre > 0
                    ? ` · ${kronor(projection.reserveOre)} SEK remains toward the next care unit`
                    : ''}
                  . Preview only; your recorded balance stays unchanged.
                </span>
              </p>
            )}
          </div>
        )}
        <div className="shelter-with-roster">
          <ShelterLifeScene
            residentCount={residents.length}
            motionPaused={paused}
            onTogglePause={() => setPaused((current) => !current)}
            fullImpact={fullImpact}
            previewActive={previewActive}
            companions={companions}
            projection={projection}
            paused={paused || inspected !== null}
            replay={replay}
            onExitReplay={onExitReplay}
            onInspect={(id, preview) => {
              openDog(id, preview ? 'preview' : 'supported');
              onSelectDog(id);
            }}
          />
          <aside
            className="shelter-roster"
            aria-labelledby="shelter-roster-title"
          >
            <div className="shelter-roster-heading">
              <h3 id="shelter-roster-title">Shelter dogs</h3>
              <span aria-label={`${companions.length} dogs shown`}>
                {companions.length}
              </span>
            </div>
            <ul className="shelter-roster-list">
              {companions.map((companion) => {
                const dog = profileDogs.find(
                  (item) => item.id === companion.profileId,
                );
                return (
                  <li key={companion.key}>
                    {dog ? (
                      <button
                        type="button"
                        className="shelter-roster-dog"
                        data-preview={companion.preview}
                        aria-current={
                          replay?.expense.dogId === dog.id ? 'true' : undefined
                        }
                        aria-label={`Open ${dog.name}’s profile${companion.preview ? ', donation preview' : ''}`}
                        onClick={() => {
                          openDog(
                            dog.id,
                            companion.preview ? 'preview' : 'supported',
                          );
                          onSelectDog(dog.id);
                        }}
                      >
                        <DogPortrait dog={dog} />
                        <span className="shelter-roster-details">
                          <DogName name={dog.name} />
                          <span>{dog.breed}</span>
                          <small>{dog.location}</small>
                          {companion.preview && (
                            <span className="shelter-roster-preview">
                              Preview
                            </span>
                          )}
                        </span>
                      </button>
                    ) : (
                      <div className="shelter-roster-dog" data-preview="true">
                        <img
                          className="shelter-roster-future"
                          src={companion.sprite}
                          width="62"
                          height="62"
                          alt=""
                          loading="lazy"
                        />
                        <span className="shelter-roster-details">
                          <strong>Future dog</strong>
                          <span>Not matched yet</span>
                          <span className="shelter-roster-preview">
                            Preview
                          </span>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {companions.length === 0 && (
              <p className="shelter-roster-empty">
                Your dogs will appear here when your first donation provides
                care.
              </p>
            )}
          </aside>
        </div>
        <p className="virtual-shelter-note">
          {replay
            ? 'Replaying a recorded demo expense. '
            : !previewActive
              ? 'Your shelter companions have recorded demo care expenses. '
              : fullImpact
                ? 'Showing the estimated shelter after the selected gift has funded all complete care units. '
                : projection.activeDogs
                  ? `${projection.activeDogs} ${projection.activeDogs === 1 ? 'dog has' : 'dogs have'} ${plan.name.toLowerCase()} scheduled on this forecast day. `
                  : 'No care use scheduled on this forecast day. '}
          Published calendar activities guide the scene; unscheduled routines
          and need labels are illustrative. Faded dogs preview possible care;
          they are not verified recipients.
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
          {!confirmed && visiblePreviewIds.length > 0 && (
            <span className="dogs-in-need-transfer" role="status">
              <ArrowUp size={16} />{' '}
              {
                visiblePreviewIds.filter((id) => !residentIds.includes(id))
                  .length
              }{' '}
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
            <button
              key={item.id}
              type="button"
              className="dog-in-need-card"
              data-matching={matchesCareNeed(item.id, projection.careId)}
              onClick={() => {
                openDog(item.id, 'waiting');
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
            </button>
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
    </>
  );
}
