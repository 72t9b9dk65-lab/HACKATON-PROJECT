'use client';

import { useEffect, useState } from 'react';
import { DogPortrait } from '@/components/dog-portrait';
import { profileDogs } from '@/lib/donation-shell';
import { companionProfileId } from '@/lib/platform/shelter-growth';
import {
  groupCompanions,
  initialAdoptedCompanions,
} from '@/lib/platform/companion-availability';

function readAdoptedCompanions(storageKey: string, residentIds: string[]) {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? 'null',
    );
    if (Array.isArray(saved) && saved.every((id) => typeof id === 'string'))
      return saved as string[];
  } catch {
    // Unavailable browser storage still allows a stable in-session roster.
  }
  return initialAdoptedCompanions(residentIds);
}

export function CompanionRoster({
  storageKey,
  residentIds,
  onSelect,
}: {
  storageKey: string;
  residentIds: string[];
  onSelect: (id: string) => void;
}) {
  const [adoptedIds] = useState(() =>
    readAdoptedCompanions(storageKey, residentIds),
  );
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(adoptedIds));
    } catch {
      // Storage is optional; donations and the shared ledger are unaffected.
    }
  }, [storageKey, adoptedIds]);

  const groups = groupCompanions(residentIds, adoptedIds);
  return (
    <div className="gs-roster">
      <div className="gs-roster-title">
        <strong>Your visual companions</strong>
        <div className="gs-roster-details">
          <div className="gs-roster-legend" aria-label="Companion availability">
            <span className="is-available">Available</span>
            <span className="is-adopted">Adopted</span>
          </div>
          <small>Visual companions · profiles may appear more than once</small>
        </div>
      </div>
      <div className="gs-roster-groups">
        {(['available', 'adopted'] as const).map((status) =>
          groups[status].length ? (
            <section
              key={status}
              className="gs-roster-grid"
              aria-label={
                status === 'available'
                  ? 'Available companions'
                  : 'Adopted companions'
              }
            >
              {groups[status].map((id) => {
                const dog = profileDogs.find(
                  (profile) => profile.id === companionProfileId(id),
                );
                if (!dog) return null;
                const label = status === 'available' ? 'Available' : 'Adopted';
                return (
                  <button
                    key={id}
                    className={`is-${status}`}
                    onClick={() => onSelect(companionProfileId(id))}
                    aria-label={`${dog.name} · ${label}`}
                    title={`${dog.name} · ${label}`}
                  >
                    <DogPortrait dog={dog} />
                    <strong>{dog.name}</strong>
                  </button>
                );
              })}
            </section>
          ) : null,
        )}
        {!residentIds.length && (
          <p>
            Your first companion arrives at 50 SEK donated. Up to 100
            companions.
          </p>
        )}
      </div>
    </div>
  );
}
