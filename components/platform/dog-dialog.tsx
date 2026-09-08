'use client';
import { CareImage } from './care-image';
import { useState } from 'react';
import { ArrowUpRight, Camera, Heart, MapPin, Check, Home } from 'lucide-react';
import { profileDogs } from '@/lib/donation-shell';
import { DogName } from '@/components/dog-name';
import { DogPortrait } from '@/components/dog-portrait';
import { Button } from '@/components/ui/button';
import {
  categoryFor,
  contributionToDog,
  dogStage,
  donorProducts,
  money,
  publishedPosts,
  stages,
} from '@/lib/platform/model';
import type { CarePost, Workspace } from '@/lib/platform/types';
import { Modal, Photo, Primary, dateLabel } from './shared';
export function DogDialog({
  dogId,
  state,
  donorId,
  onClose,
  onFollow,
  onDonate,
  onPhoto,
}: {
  dogId: string | null;
  state: Workspace;
  donorId: string;
  onClose: () => void;
  onFollow: (id: string) => void;
  onDonate: () => void;
  onPhoto: (post: CarePost) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const dog = profileDogs.find((d) => d.id === dogId);
  const donor = state.donors.find((d) => d.id === donorId)!;
  const posts = publishedPosts(state).filter((p) =>
    p.dogIds.includes(dogId ?? ''),
  );
  const stage = dogStage(state, dogId ?? '');
  const index = posts.some((p) => p.stage)
    ? stages.findIndex((s) => s.id === stage)
    : -1;
  const products = donorProducts(state, donorId).filter((p) =>
    posts.some((post) => post.productIds.includes(p.product.id)),
  );
  return (
    <Modal
      wide
      open={!!dog}
      onClose={onClose}
      title={dog?.name ?? 'Meet a dog'}
      description="The real friend behind the pixels."
    >
      {dog && (
        <>
          <div className="cp-dog-intro">
            <DogPortrait dog={dog} large />
            <div>
              <span className="cp-eyebrow">
                {stage === 'home'
                  ? 'A NEW CHAPTER'
                  : 'A REAL DOG. A REAL CONNECTION.'}
              </span>
              <h2>
                <DogName name={dog.name} />
              </h2>
              <p>
                {dog.breed} · {dog.age}
              </p>
              <p className="cp-muted">
                <MapPin size={14} />
                {dog.location}
              </p>
              <p>{dog.description}</p>
              <div className="cp-inline-actions">
                {!dog.group && (
                  <Primary
                    onClick={() => onFollow(dog.id)}
                    className={
                      donor.following.includes(dog.id) ? 'cp-button-soft' : ''
                    }
                  >
                    <Heart
                      size={16}
                      fill={
                        donor.following.includes(dog.id)
                          ? 'currentColor'
                          : 'none'
                      }
                    />
                    {donor.following.includes(dog.id)
                      ? 'Following this story'
                      : 'Follow this story'}
                  </Primary>
                )}
                <a
                  href={dog.source}
                  target="_blank"
                  rel="noreferrer"
                  className="cp-text-link"
                >
                  Official profile <ArrowUpRight size={16} />
                </a>
              </div>
              <small>
                Public profile photos · undated. Care stories below identify
                care moments.
              </small>
            </div>
          </div>
          <div className="cp-journey-track" aria-label="Care journey">
            {stages.map((s, i) => (
              <div key={s.id} className={i <= index ? 'cp-stage-done' : ''}>
                <span>
                  {i < index ? (
                    <Check size={14} />
                  ) : s.id === 'home' ? (
                    <Home size={14} />
                  ) : (
                    i + 1
                  )}
                </span>
                <strong>{s.label}</strong>
              </div>
            ))}
          </div>
          {posts.some((p) => p.source === 'demo') && (
            <p className="cp-fine-print">
              This timeline contains clearly marked sample milestones. They do
              not describe verified events in {dog.name}’s life.
            </p>
          )}
          <div className="cp-dog-content">
            <section>
              <div className="cp-section-title">
                <h3>{dog.name}’s story</h3>
                <span>{posts.length} moments</span>
              </div>
              {posts.length ? (
                posts.slice(0, showAll ? 100 : 5).map((post) => (
                  <article key={post.id} className="cp-timeline-card">
                    <div className="cp-timeline-date">
                      {dateLabel(post.occurredAt)}{' '}
                      <span>
                        {post.source === 'demo' ? 'Care story' : 'Care update'}
                      </span>
                    </div>
                    <Photo post={post} onClick={() => onPhoto(post)} />
                    <h4>{post.title}</h4>
                    <p>{post.note}</p>
                    <span className="cp-tag">
                      {post.stage
                        ? stages.find((s) => s.id === post.stage)?.label
                        : categoryFor(post.category).label}
                    </span>
                  </article>
                ))
              ) : (
                <div className="cp-empty">
                  <Camera size={24} />
                  <strong>The next chapter starts here.</strong>
                  <p>
                    Follow {dog.name} to keep their story close. Published care
                    moments will appear here.
                  </p>
                </div>
              )}
              {posts.length > 5 && (
                <Button variant="ghost" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Show less' : 'Show every moment'}
                </Button>
              )}
            </section>
            <aside>
              <section className="cp-basket-card">
                <h3>Your care basket</h3>
                <strong className="cp-basket-total">
                  {money(contributionToDog(state, donorId, dog.id))}{' '}
                  <small>SEK</small>
                </strong>
                <div className="cp-basket">
                  {products.length ? (
                    products
                      .slice(0, 6)
                      .map(({ product }) => (
                        <CareImage
                          key={product.id}
                          src={categoryFor(product.category).asset}
                          alt={product.description}
                          title={product.description}
                        />
                      ))
                  ) : (
                    <Heart size={40} />
                  )}
                </div>
                <p>
                  Your share of funded care linked to {dog.name}. Shared
                  products are counted once and attributed across their
                  identified dogs.
                </p>
                {products.slice(0, 5).map((p) => (
                  <div className="cp-basket-row" key={p.product.id}>
                    <span>{p.product.description}</span>
                    <small>
                      {money(p.contribution)} SEK contributed to item
                    </small>
                  </div>
                ))}
                <Primary onClick={onDonate}>
                  Make more care possible <Heart size={16} />
                </Primary>
              </section>
              <section className="cp-dog-help">
                <h3>More ways to help</h3>
                <a href={dog.source} target="_blank" rel="noreferrer">
                  Learn about adopting {dog.name} <ArrowUpRight size={14} />
                </a>
                <a
                  href="https://hundstallet.se/engagera-dig/jourhem/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Become a foster home <ArrowUpRight size={14} />
                </a>
                <a
                  href="https://hundstallet.se/insamlingar/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Start a fundraiser <ArrowUpRight size={14} />
                </a>
              </section>
            </aside>
          </div>
        </>
      )}
    </Modal>
  );
}
