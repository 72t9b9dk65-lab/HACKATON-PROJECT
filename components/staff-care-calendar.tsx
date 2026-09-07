'use client';
/* oxlint-disable next/no-img-element -- Keep pixel sprites crisp using the same native image rendering as the shelter. */

import { useState, type ChangeEvent } from 'react';
import {
  CalendarDays,
  Plus,
  ImagePlus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CarePhoto } from '@/components/dog-profile-dialog';
import { useDogCare } from '@/hooks/use-dog-care';
import {
  calendarActivities,
  careUpdateStatus,
  safeCarePhoto,
  stockholmInput,
  stockholmInstant,
  type CareUpdate,
} from '@/lib/care-calendar';
import { expenseDateLabel, expenseLabel } from '@/lib/donation-spending';
import { profileDogs, kronor } from '@/lib/donation-shell';

export function StaffCareCalendar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="donation-shell staff-care-calendar">
          <DialogTitle>
            <CalendarDays size={22} /> Care calendar{' '}
            <span>Staff workspace</span>
          </DialogTitle>
          <DialogDescription>
            Add a dog, an activity and its time. Publish the plan, then attach
            photos and confirm care when it happens. The shelter and dog
            profiles follow automatically.
          </DialogDescription>
          <CalendarEditor />
        </DialogContent>
      )}
    </Dialog>
  );
}

function CalendarEditor() {
  const {
    events,
    expenses,
    now,
    ready,
    error: storageError,
    saveEvent,
    deleteEvent,
  } = useDogCare();
  const [day, setDay] = useState(() => stockholmInput(Date.now()).slice(0, 10));
  const fresh = (date: string, dogId = 'ake') => {
    const today = stockholmInput(Date.now());
    const start = date === today.slice(0, 10) ? today : `${date}T10:00`;
    return {
      id: '',
      dogId,
      activity: 'food' as CareUpdate['activity'],
      title: 'A nourishing meal',
      note: '',
      startsAt: start,
      endsAt: stockholmInput(Date.parse(stockholmInstant(start)) + 30 * 60_000),
      publishedAt: null as string | null,
      completedAt: null as string | null,
      expenseId: null as string | null,
      photos: [] as CareUpdate['photos'],
    };
  };
  const [form, setForm] = useState(() => fresh(day));
  const [completed, setCompleted] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const dayEvents = events
    .filter((entry) => stockholmInput(new Date(entry.startsAt)).startsWith(day))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dog = profileDogs.find((item) => item.id === form.dogId)!;
  const dogExpenses = expenses.filter((expense) => expense.dogId === dog.id);

  function newUpdate(date = day) {
    setForm(fresh(date, form.dogId));
    setCompleted(false);
    setPhotoUrl('');
    setError('');
    setMessage('');
  }
  function edit(entry: CareUpdate) {
    setForm({
      ...entry,
      startsAt: stockholmInput(new Date(entry.startsAt)),
      endsAt: stockholmInput(new Date(entry.endsAt)),
    });
    setCompleted(!!entry.completedAt);
    setPhotoUrl('');
    setError('');
    setMessage('');
  }
  function save(publish: boolean) {
    setError('');
    setMessage('');
    try {
      if (photoUrl.trim())
        throw new Error('Add the photo link or clear it before saving.');
      const startsAt = stockholmInstant(form.startsAt);
      const endsAt = stockholmInstant(form.endsAt);
      if (Date.parse(endsAt) <= Date.parse(startsAt))
        throw new Error('The end time must be after the start time.');
      if (completed && Date.parse(startsAt) > Date.now())
        throw new Error(
          'Future care must stay planned. Confirm completion after it happens.',
        );
      if (
        publish &&
        !completed &&
        events.some(
          (event) =>
            event.id !== form.id &&
            event.dogId === form.dogId &&
            event.publishedAt &&
            !event.completedAt &&
            Date.parse(event.startsAt) < Date.parse(endsAt) &&
            Date.parse(event.endsAt) > Date.parse(startsAt),
        )
      )
        throw new Error(
          'This dog already has a published activity at that time. Edit it or choose another time.',
        );
      const entry: CareUpdate = {
        ...form,
        id: form.id || crypto.randomUUID(),
        title: form.title.trim(),
        note: form.note.trim(),
        startsAt,
        endsAt,
        publishedAt: publish
          ? (form.publishedAt ?? new Date().toISOString())
          : null,
        completedAt: completed
          ? (form.completedAt ?? new Date().toISOString())
          : null,
      };
      const failure = saveEvent(entry);
      if (failure) throw new Error(failure);
      setForm({ ...entry, startsAt: form.startsAt, endsAt: form.endsAt });
      setDay(form.startsAt.slice(0, 10));
      setMessage(
        publish
          ? 'Published. This dog’s profile and shelter schedule are up to date.'
          : 'Draft saved. It is only visible in the staff calendar.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Check this update before saving.',
      );
    }
  }
  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setError('');
    if (files.length + form.photos.length > 3) {
      setError('Add up to three photos per update.');
      return;
    }
    if (
      files.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 1_000_000,
      )
    ) {
      setError('Choose JPG, PNG or WebP photos up to 1 MB each.');
      return;
    }
    setUploading(true);
    try {
      const photos = await Promise.all(
        files.map(
          (file) =>
            new Promise<{ src: string; caption: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result !== 'string') {
                  reject(new Error('Photo could not be read.'));
                  return;
                }
                resolve({
                  src: reader.result,
                  caption: `${dog.name} · ${form.title}`,
                });
              };
              reader.onerror = () =>
                reject(new Error('Photo could not be read.'));
              reader.readAsDataURL(file);
            }),
        ),
      );
      setForm((current) => ({
        ...current,
        photos: [...current.photos, ...photos],
      }));
    } catch {
      setError('A photo could not be read. Try another file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="staff-calendar-status">
        <span className="care-live-label">
          <i /> Local demo · live updates on this device
        </span>
        <span>All times: Stockholm</span>
      </div>
      {storageError && (
        <p role="alert" className="care-editor-error">
          {storageError}
        </p>
      )}
      <div className="staff-calendar-layout">
        <aside className="staff-calendar-days">
          <Calendar
            mode="single"
            required
            selected={new Date(`${day}T12:00:00`)}
            onSelect={(date) => {
              if (!date) return;
              setDay(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
              );
            }}
            modifiers={{
              hasUpdates: (date) =>
                events.some(
                  (entry) =>
                    stockholmInput(new Date(entry.startsAt)).slice(0, 10) ===
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                ),
            }}
            modifiersClassNames={{ hasUpdates: 'care-calendar-has-updates' }}
          />
          <div className="staff-calendar-day-heading">
            <h3>
              {new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'long',
              }).format(new Date(`${day}T12:00:00`))}
            </h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => newUpdate()}
              disabled={uploading}
            >
              <Plus size={16} /> Add
            </Button>
          </div>
          <div className="staff-day-events">
            {dayEvents.map((entry) => (
              <button
                type="button"
                key={entry.id}
                aria-pressed={entry.id === form.id}
                aria-label={`Edit ${profileDogs.find((item) => item.id === entry.dogId)!.name}: ${entry.title}`}
                onClick={() => edit(entry)}
                disabled={uploading}
              >
                <img
                  src={
                    profileDogs.find((item) => item.id === entry.dogId)!.sprite
                  }
                  width="40"
                  height="40"
                  alt=""
                />
                <span>
                  <strong>
                    {profileDogs.find((item) => item.id === entry.dogId)!.name}
                  </strong>
                  <span>{entry.title}</span>
                  <small>
                    {stockholmInput(new Date(entry.startsAt)).slice(11)} ·{' '}
                    {entry.publishedAt ? careUpdateStatus(entry, now) : 'Draft'}
                  </small>
                </span>
              </button>
            ))}
            {!dayEvents.length && (
              <p className="care-editor-empty">
                A clear day. Add the first care moment.
              </p>
            )}
          </div>
        </aside>
        <form
          className="staff-care-form"
          onSubmit={(event) => {
            event.preventDefault();
            save(true);
          }}
        >
          <div className="dog-care-section-heading">
            <h3>{form.id ? 'Edit care moment' : 'New care moment'}</h3>
            <span>{form.publishedAt ? 'Published' : 'Draft'}</span>
          </div>
          <div className="care-editor-two">
            <label>
              Dog
              <select
                value={form.dogId}
                disabled={uploading}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dogId: event.target.value,
                    expenseId: null,
                  })
                }
              >
                {profileDogs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.location}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Activity
              <select
                value={form.activity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    activity: event.target.value as CareUpdate['activity'],
                  })
                }
              >
                {calendarActivities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Title
            <input
              required
              maxLength={100}
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="A little walk in the park"
            />
          </label>
          <div className="care-editor-two">
            <label>
              Starts · Stockholm
              <input
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
              />
            </label>
            <label>
              Ends · Stockholm
              <input
                required
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) =>
                  setForm({ ...form, endsAt: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Update for supporters
            <textarea
              rows={3}
              maxLength={1600}
              value={form.note}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
              placeholder="What happened? How is the dog doing?"
            />
          </label>
          <label className="care-completion-check">
            <input
              type="checkbox"
              checked={completed}
              onChange={(event) => setCompleted(event.target.checked)}
            />{' '}
            This care has happened
          </label>
          <label>
            Link a recorded expense{' '}
            <span className="care-field-optional">Optional</span>
            <select
              value={form.expenseId ?? ''}
              onChange={(event) =>
                setForm({ ...form, expenseId: event.target.value || null })
              }
            >
              <option value="">No linked expense</option>
              {dogExpenses.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expenseLabel(expense)} · {kronor(expense.amountOre)} SEK ·{' '}
                  {expenseDateLabel(expense)}
                </option>
              ))}
            </select>
          </label>
          <p className="care-field-hint">
            Only recorded expenses go into a supporter’s care basket. Scheduling
            an activity does not spend money.
          </p>
          <fieldset className="care-photo-editor">
            <legend>
              <ImagePlus size={17} /> Photos <span>{form.photos.length}/3</span>
            </legend>
            <label className="care-upload-label">
              {uploading ? 'Reading photos…' : 'Add photos'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading || form.photos.length >= 3}
                onChange={uploadPhotos}
              />
            </label>
            <p className="care-field-hint">
              JPG, PNG or WebP · up to 1 MB each
            </p>
            <div className="care-photo-url">
              <label>
                Or an HTTPS photo link
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  placeholder="https://…"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={form.photos.length >= 3 || uploading}
                onClick={() => {
                  if (
                    !photoUrl.startsWith('https://') ||
                    !safeCarePhoto(photoUrl.trim())
                  ) {
                    setError('Enter a valid HTTPS photo link.');
                    return;
                  }
                  setForm({
                    ...form,
                    photos: [
                      ...form.photos,
                      {
                        src: photoUrl.trim(),
                        caption: `${dog.name} · ${form.title}`,
                      },
                    ],
                  });
                  setPhotoUrl('');
                  setError('');
                }}
              >
                Add
              </Button>
            </div>
            {form.photos.map((photo, index) => (
              <div
                className="care-editor-photo"
                key={`${index}-${photo.src.slice(-30)}`}
              >
                <CarePhoto {...photo} />
                <label>
                  Caption
                  <input
                    maxLength={200}
                    value={photo.caption}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        photos: form.photos.map((item, i) =>
                          i === index
                            ? { ...item, caption: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      photos: form.photos.filter((_, i) => i !== index),
                    })
                  }
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="care-editor-error">
              {error}
            </p>
          )}
          {message && (
            <output className="care-editor-success">{message}</output>
          )}
          <div className="care-editor-actions">
            <Button
              type="button"
              variant="outline"
              disabled={!ready || uploading}
              onClick={() => save(false)}
            >
              <Save size={16} /> Save draft
            </Button>
            <Button
              type="submit"
              className="donation-primary"
              disabled={!ready || uploading}
            >
              <Send size={16} />{' '}
              {form.publishedAt ? 'Publish changes' : 'Publish update'}
            </Button>
          </div>
          {form.id && (
            <Button
              type="button"
              variant="ghost"
              className="care-remove-update"
              onClick={() => {
                const failure = deleteEvent(form.id);
                if (failure) setError(failure);
                else {
                  newUpdate();
                  setMessage(
                    'Update removed from the calendar and dog profile. Recorded expenses are unchanged.',
                  );
                }
              }}
            >
              <Trash2 size={15} /> Remove update
            </Button>
          )}
        </form>
      </div>
    </>
  );
}
