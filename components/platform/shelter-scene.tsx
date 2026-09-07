'use client';
import { CareImage } from './care-image';
import { useEffect, useState } from 'react';
import { Camera, Moon, Pause, Play, Sun, Home } from 'lucide-react';
import { profileDogs } from '@/lib/donation-shell';
import {
  activePhoto,
  categoryFor,
  dogStage,
  supportedDogs,
} from '@/lib/platform/model';
import type { CarePost, Workspace, Category } from '@/lib/platform/types';
import { DogName } from '@/components/dog-name';
import { Button } from '@/components/ui/button';
import { useClock } from './shared';
export function ShelterScene({
  state,
  donorId,
  onDog,
  onPhoto,
  previewIds = [],
  previewCategory,
  previewCount = 0,
  onExitPreview,
}: {
  state: Workspace;
  donorId: string;
  onDog: (id: string) => void;
  onPhoto: (p: CarePost) => void;
  previewIds?: string[];
  previewCategory?: Category;
  previewCount?: number;
  onExitPreview?: () => void;
}) {
  const now = useClock();
  const clock = now ?? Date.parse(state.createdAt);
  const [paused, setPaused] = useState(false);
  const [previewArrived, setPreviewArrived] = useState(false);
  const previewKey = `${previewCategory ?? ''}:${previewIds.join(',')}`;
  useEffect(() => {
    const start = setTimeout(() => setPreviewArrived(false), 0);
    const arrive = setTimeout(() => setPreviewArrived(true), 1800);
    return () => {
      clearTimeout(start);
      clearTimeout(arrive);
    };
  }, [previewKey]);
  const ids = supportedDogs(state, donorId, clock);
  const residents = ids.filter((id) => dogStage(state, id, clock) !== 'home');
  const home = ids.filter((id) => dogStage(state, id, clock) === 'home');
  const stations = [
    'walk',
    'food',
    'rehabilitation',
    'vaccination',
    'play',
  ] as const;
  const hour = now
    ? Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Stockholm',
          hour: '2-digit',
          hourCycle: 'h23',
        }).format(now),
      )
    : 12;
  const night = hour >= 21 || hour < 7;
  const clockLabel = now
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Stockholm',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now)
    : '…';
  const date = now
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Stockholm',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(now)
    : 'Today';
  const previews = previewIds.filter((id) => !ids.includes(id));
  const show = [...residents, ...previews].slice(0, 18);
  const targetFor = (id: string) => {
    const cat = previews.includes(id)
      ? previewArrived
        ? previewCategory
        : undefined
      : activePhoto(state, id, clock)?.category;
    return cat === 'medicine' ? 'rehabilitation' : cat;
  };
  return (
    <section
      className={`cp-shelter ${night ? 'cp-night' : ''} ${paused ? 'cp-paused' : ''}`}
      aria-label="Your personal shelter"
    >
      <div className="cp-shelter-toolbar">
        <div className="cp-date">
          {night ? <Moon size={23} /> : <Sun size={23} />}
          <span>
            <strong>{date}</strong>
            <small>
              {new Intl.DateTimeFormat('en-GB', {
                year: 'numeric',
                timeZone: 'Europe/Stockholm',
              }).format(clock)}{' '}
              · {clockLabel} Stockholm
            </small>
          </span>
        </div>
        <div className="cp-shelter-controls">
          <span className="cp-resident-count">
            <i />
            {residents.length} companions
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              paused ? 'Resume shelter motion' : 'Pause shelter motion'
            }
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}
          </Button>
        </div>
      </div>
      {onExitPreview && (
        <div className="cp-preview-banner">
          <span>
            Donation preview · {previewCount} possible care recipients
          </span>
          <button onClick={onExitPreview}>Exit preview ×</button>
        </div>
      )}
      <div className="cp-scene-scroll">
        <div className="cp-scene">
          <div className="cp-kennel">
            <CareImage
              src="/shelters/pixel-big-kennel.png"
              alt="A spacious illustrated kennel"
            />
          </div>
          {!show.length && (
            <div className="cp-empty-shelter">
              <Home size={26} />
              <strong>A little shelter, ready to grow.</strong>
              <p>
                Your supported companions appear when staff links funded care to
                a dog.
              </p>
            </div>
          )}
          <div className="cp-stations">
            <span className="cp-stations-title">LIVE UPDATES</span>
            {stations.map((category) => {
              const present = residents.filter((id) => {
                const p = activePhoto(state, id, clock);
                return (
                  p &&
                  (p.category === 'medicine'
                    ? 'rehabilitation'
                    : p.category) === category
                );
              });
              return (
                <div
                  className={`cp-station ${present.length ? 'cp-station-active' : ''} ${previewCategory === category ? 'cp-preview-station' : ''}`}
                  key={category}
                >
                  <h3>{categoryFor(category).station}</h3>
                  <CareImage src={categoryFor(category).asset} alt="" />
                  <small>
                    {previewCategory === category
                      ? 'Donation preview'
                      : present.length
                        ? `${present.length} photo ${present.length === 1 ? 'moment' : 'moments'}`
                        : 'Waiting for a photo'}
                  </small>
                </div>
              );
            })}
          </div>
          {show.map((id, index) => {
            const dog = profileDogs.find((d) => d.id === id)!;
            const preview = previews.includes(id);
            const current = preview ? undefined : activePhoto(state, id, clock);
            const category = targetFor(id);
            const station = stations.findIndex((c) => c === category);
            const occupants = show.filter(
              (other) => targetFor(other) === category,
            );
            const seat = occupants.indexOf(id);
            const crowded = station >= 0 && occupants.length > 3;
            const x =
              station >= 0
                ? (station + 0.5) * 20 +
                  ((seat % 3) - (Math.min(occupants.length, 3) - 1) / 2) * 5
                : 35 + (seat % 4) * 10;
            const y =
              station >= 0
                ? `calc(100% - ${145 + Math.floor(seat / 3) * 34}px)`
                : 153 + Math.floor(seat / 4) * 19;
            return (
              <div
                className={`cp-scene-dog ${preview ? 'cp-ghost' : ''} ${station >= 0 ? 'cp-at-station' : ''} ${crowded ? 'cp-dog-crowded' : ''}`}
                key={id}
                style={{
                  left: `${x}%`,
                  top: y,
                  animationDelay: `${index * -0.9}s`,
                }}
              >
                {night && station < 0 && !preview && (
                  <span className="cp-sleep" aria-label="Sleeping">
                    z z Z
                  </span>
                )}
                <button
                  className="cp-dog-sprite"
                  onClick={() => onDog(id)}
                  aria-label={`Meet ${dog.name}`}
                >
                  <CareImage src={dog.sprite} alt={dog.name} />
                  <span className="cp-name-label">
                    <DogName name={dog.name} />
                  </span>
                </button>
                {current && station >= 0 && (
                  <small className="cp-name-label cp-activity-label">
                    {
                      {
                        walk: 'Walking',
                        food: 'Eating',
                        rehabilitation: 'Recovery',
                        vaccination: 'At the vet',
                        play: 'Playing',
                      }[stations[station]]
                    }
                  </small>
                )}
                {current && (
                  <button
                    className="cp-camera"
                    onClick={() => onPhoto(current)}
                  >
                    <Camera size={13} /> Photo
                  </button>
                )}
                {preview && <small className="cp-name-label">Preview</small>}
              </div>
            );
          })}
          {residents.length + previewCount > show.length && (
            <span className="cp-scene-overflow">
              Showing {show.length} of {residents.length + previewCount}{' '}
              illustrated companions
            </span>
          )}
        </div>
      </div>
      <div className="cp-shelter-note">
        <span>
          <Camera size={14} /> Staff photo updates guide the activities.
        </span>
        <span>New moments stay live for 1–2 hours.</span>
      </div>
      {home.length > 0 && (
        <div className="cp-home-at-last">
          <CareImage src="/shelters/pixel-shelter.png" alt="" />
          <div>
            <strong>Home at last</strong>
            <p>A new chapter. Always part of your story.</p>
          </div>
          {home.map((id) => {
            const dog = profileDogs.find((d) => d.id === id)!;
            return (
              <button onClick={() => onDog(id)} key={id}>
                <CareImage src={dog.sprite} alt="" />
                {dog.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
