'use client';
import { CareImage } from './care-image';
import { useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  ImagePlus,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareCarePhoto } from '@/lib/platform/photo-preview';
import { DogName } from '@/components/dog-name';
import { profileDogs } from '@/lib/donation-shell';
import { uploadCareFile, type CareStore } from '@/hooks/use-care-workspace';
import { categories, categoryFor, money, stages } from '@/lib/platform/model';
import type { Category, FileRecord, Stage } from '@/lib/platform/types';
import { Modal, Notice, Primary, CategoryIcon } from './shared';
const localDateTime = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
export function PhotoComposer({
  store,
  initialProductId,
  initialPublishDay,
  milestone = false,
  onClose,
  onSaved,
}: {
  store: CareStore;
  initialProductId?: string;
  initialPublishDay?: string;
  milestone?: boolean;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const products = store
    .state!.receipts.filter((r) => r.state === 'funded')
    .flatMap((receipt) =>
      receipt.products
        .filter((p) => !p.id.endsWith(':unitemized'))
        .map((product) => ({ product, receipt })),
    );
  const first = products.find(
    (p) => p.product.id === initialProductId,
  )?.product;
  const [category, setCategory] = useState<Category>(
    first?.category ?? (milestone ? 'comfort' : 'food'),
  );
  const [productIds, setProductIds] = useState<string[]>(
    first ? [first.id] : [],
  );
  const [dogIds, setDogIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [photo, setPhoto] = useState<FileRecord | null>(null);
  const [demoPhoto, setDemoPhoto] = useState<string>();
  const [stage, setStage] = useState<Stage | ''>(milestone ? 'confidence' : '');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(localDateTime());
  const [scheduled, setScheduled] = useState(
    !!initialPublishDay && initialPublishDay > localDateTime().slice(0, 10),
  );
  const [publishAt, setPublishAt] = useState(
    initialPublishDay ? `${initialPublishDay}T10:00` : localDateTime(),
  );
  const [hours, setHours] = useState<1 | 2>(2);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const visible = profileDogs.filter(
    (d) =>
      !d.group &&
      `${d.name} ${d.breed} ${d.location}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const chosen = profileDogs.filter((d) => dogIds.includes(d.id));
  const defaultTitle = chosen.length
    ? `${chosen.map((d) => d.name).join(' & ')} · ${stage ? stages.find((s) => s.id === stage)!.label : categoryFor(category).station}`
    : '';
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    setDemoPhoto(undefined);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
        throw new Error('Choose a JPEG, PNG or WebP photo.');
      setPhoto(await uploadCareFile(await prepareCarePhoto(file)));
    } catch (e) {
      setPhoto(null);
      setError(
        e instanceof Error ? e.message : 'The photo could not be uploaded.',
      );
    } finally {
      setUploading(false);
    }
  }
  function toggleDog(id: string) {
    setDogIds((previous) =>
      previous.includes(id)
        ? previous.filter((d) => d !== id)
        : [...previous, id],
    );
    if (demoPhoto) setDemoPhoto(undefined);
  }
  async function publish() {
    setError('');
    if (
      !dogIds.length ||
      (!photo && !demoPhoto) ||
      (!productIds.length && !stage)
    )
      return;
    const time = scheduled
      ? new Date(publishAt).toISOString()
      : new Date().toISOString();
    if (scheduled && Date.parse(time) <= Date.now()) {
      setError('Choose a future publication time, or publish now.');
      return;
    }
    const success = await store.send({
      type: 'publish',
      post: {
        title: title.trim() || defaultTitle,
        note:
          note.trim() ||
          (demoPhoto
            ? 'Demonstration using a public profile photo. This is not a reported care event.'
            : ''),
        dogIds,
        productIds,
        category,
        stage: stage || null,
        photo,
        demoPhoto,
        occurredAt: new Date(occurredAt).toISOString(),
        publishAt: time,
        liveHours: hours,
      },
    });
    if (success) {
      onSaved(
        scheduled
          ? 'Photo scheduled. It will appear automatically at the selected time.'
          : 'Care moment published. Connected shelters will update within a few seconds.',
      );
      onClose();
    }
  }
  const valid =
    !!(photo || demoPhoto) &&
    dogIds.length > 0 &&
    dogIds.length <= 20 &&
    (productIds.length > 0 || !!stage) &&
    !!occurredAt &&
    (!scheduled || !!publishAt);
  return (
    <Modal
      wide
      open
      onClose={() => {
        if (!uploading && !store.busy) onClose();
      }}
      title={milestone ? 'Publish a new chapter' : 'Add a care photo'}
      description={
        milestone
          ? 'A photo and a milestone tell the next chapter of a dog’s story.'
          : 'Choose the purchased products and the dogs in the photo. The activity category comes from the products.'
      }
    >
      <div className="cp-photo-composer-grid">
        <div>
          <div
            className={`cp-photo-upload ${photo || demoPhoto ? 'has-photo' : ''}`}
          >
            {photo || demoPhoto ? (
              <CareImage
                src={photo?.url ?? demoPhoto}
                alt="Selected care moment"
              />
            ) : (
              <>
                <Camera size={36} />
                <strong>A moment of real care</strong>
                <span>Take a photo or choose one from your device.</span>
              </>
            )}
            <label className="cp-file-picker">
              {uploading ? (
                <>
                  <LoaderCircle className="cp-spin" size={16} />
                  Saving photo…
                </>
              ) : (
                <>
                  <ImagePlus size={17} />
                  {photo || demoPhoto ? 'Change photo' : 'Choose photo'}
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                disabled={uploading}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          </div>
          {demoPhoto && (
            <Notice>
              This public profile photo is labelled as a demo story. It does not
              document an actual care event.
            </Notice>
          )}
          {!photo && !demoPhoto && dogIds.length === 1 && (
            <button
              className="cp-text-link"
              onClick={() => setDemoPhoto(chosen[0].photos[0].src)}
            >
              Use {chosen[0].name}’s profile photo for a demo
            </button>
          )}
          <label className="cp-field">
            Caption <span>Optional; the title is filled in for you.</span>
            <input
              value={title}
              maxLength={100}
              placeholder={defaultTitle || 'Choose the dogs first'}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="cp-field">
            A small update{' '}
            <span>What would their supporters love to know?</span>
            <textarea
              rows={3}
              value={note}
              maxLength={1600}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A little more confidence today…"
            />
          </label>
        </div>
        <div>
          <div className="cp-section-title">
            <h3>Who is in the photo?</h3>
            <span>{dogIds.length} selected</span>
          </div>
          <label className="cp-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a dog"
              aria-label="Find dogs for this photo"
            />
          </label>
          <div className="cp-dog-picker">
            {visible.map((d) => (
              <button
                key={d.id}
                className={dogIds.includes(d.id) ? 'selected' : ''}
                aria-pressed={dogIds.includes(d.id)}
                onClick={() => toggleDog(d.id)}
              >
                <CareImage src={d.photos[0].src} alt="" />
                <span>
                  <DogName name={d.name} />
                  <small>{d.location}</small>
                </span>
                {dogIds.includes(d.id) && <Check size={17} />}
              </button>
            ))}
            {!visible.length && <p>No matching dogs.</p>}
          </div>
          {!milestone && (
            <>
              <div className="cp-section-title">
                <h3>Products being used</h3>
              </div>
              <label className="cp-field">
                Find by category
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as Category);
                    setProductIds([]);
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="cp-purchased-picker">
                {products
                  .filter((p) => p.product.category === category)
                  .map(({ product, receipt }) => (
                    <label key={product.id}>
                      <input
                        type="checkbox"
                        checked={productIds.includes(product.id)}
                        onChange={(e) =>
                          setProductIds(
                            e.target.checked
                              ? [...productIds, product.id]
                              : productIds.filter((id) => id !== product.id),
                          )
                        }
                      />
                      <CategoryIcon category={product.category} />
                      <span>
                        <strong>{product.description}</strong>
                        <small>
                          {receipt.reference} · {money(product.amountOre)} SEK
                        </small>
                      </span>
                    </label>
                  ))}
                {!products.some((p) => p.product.category === category) && (
                  <p>
                    No funded products in this category. Add and allocate a
                    receipt first.
                  </p>
                )}
              </div>
              <div className="cp-inherited-category">
                <Check size={14} /> Activity: {categoryFor(category).station} ·
                inherited from the selected products
              </div>
            </>
          )}
        </div>
      </div>
      <details className="cp-details" open={milestone}>
        <summary>
          <Clock size={15} /> Milestone, timing & visibility
        </summary>
        <div className="cp-receipt-fields">
          <label className="cp-field">
            Journey milestone
            <select
              value={stage}
              onChange={(e) => {
                setStage(e.target.value as Stage | '');
                if (milestone) setCategory('comfort');
              }}
            >
              <option value="">Everyday care update</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="cp-field">
            Photo taken
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </label>
          <label className="cp-field">
            Show in live shelter for
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value) as 1 | 2)}
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
            </select>
          </label>
        </div>
        <label className="cp-review-check">
          <input
            type="checkbox"
            checked={scheduled}
            onChange={(e) => setScheduled(e.target.checked)}
          />
          Schedule this update
        </label>
        {scheduled && (
          <label className="cp-field">
            Publish at <span>Your device’s local time</span>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </label>
        )}
        <p className="cp-fine-print">
          After its live window, the photo remains in the dog’s journey. “Home
          at last” moves the companion into their homecoming keepsake.
        </p>
      </details>
      {(error || store.error) && (
        <Notice kind="error">{error || store.error}</Notice>
      )}
      <div className="cp-modal-actions">
        <Button
          variant="ghost"
          disabled={uploading || store.busy}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Primary
          disabled={!valid || uploading || store.busy}
          onClick={() => void publish()}
        >
          {store.busy ? (
            <LoaderCircle className="cp-spin" size={17} />
          ) : (
            <Camera size={17} />
          )}{' '}
          {scheduled ? 'Schedule photo' : 'Publish care moment'}
        </Primary>
      </div>
    </Modal>
  );
}
