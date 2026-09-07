'use client';

import { useState, type ChangeEvent } from 'react';
import { Camera, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CarePhoto } from '@/components/dog-profile-dialog';
import { useDogCare } from '@/hooks/use-dog-care';
import {
  calendarActivities,
  careExpenseMatches,
  livePhotoExpiry,
  livePhotoUpdates,
  type CareUpdate,
} from '@/lib/care-calendar';
import { profileDogs, kronor } from '@/lib/donation-shell';
import { expenseDateLabel, expenseLabel } from '@/lib/donation-spending';

export function StaffPhotoComposer() {
  const {
    events,
    expenses,
    now,
    ready,
    error: storageError,
    saveEvent,
    deleteEvent,
  } = useDogCare();
  const [dogId, setDogId] = useState(expenses[0]?.dogId ?? 'ake');
  const [activity, setActivity] = useState<CareUpdate['activity']>('food');
  const [expenseId, setExpenseId] = useState('');
  const [hours, setHours] = useState<1 | 2>(2);
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dog = profileDogs.find((item) => item.id === dogId)!;
  const category = calendarActivities.find((item) => item.id === activity)!;
  const live = livePhotoUpdates(events, now);
  const matchingExpenses = expenses
    .filter((expense) => careExpenseMatches({ dogId, activity }, expense))
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
  const linkedExpense = matchingExpenses.find(
    (expense) => expense.id === expenseId,
  );

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 1_000_000
    ) {
      setError('Choose a JPG, PNG or WebP photo up to 1 MB.');
      return;
    }
    setReading(true);
    try {
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === 'string'
            ? resolve(reader.result)
            : reject(new Error());
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPhoto(src);
    } catch {
      setError('The photo could not be read. Try another file.');
    } finally {
      setReading(false);
    }
  }

  function publish(timestamp: number) {
    setError('');
    setMessage('');
    if (!photo) {
      setError('Add a photo before publishing.');
      return;
    }
    if (!linkedExpense) {
      setError('Choose the transaction that paid for this care.');
      return;
    }
    const publishedAt = new Date(timestamp).toISOString();
    const failure = saveEvent({
      id: crypto.randomUUID(),
      dogId,
      activity,
      title: `${dog.name} · ${category.label}`,
      note: note.trim(),
      startsAt: publishedAt,
      endsAt: new Date(timestamp + hours * 3_600_000).toISOString(),
      publishedAt,
      completedAt: publishedAt,
      expenseId: linkedExpense.id,
      liveHours: hours,
      photos: [
        {
          src: photo,
          caption: note.trim() || `${dog.name} · ${category.label}`,
        },
      ],
    });
    if (failure) {
      setError(failure);
      return;
    }
    setPhoto(null);
    setNote('');
    setMessage(
      `Photo posted for ${hours} ${hours === 1 ? 'hour' : 'hours'}. It is now in ${dog.name}’s timeline${expenses.some((expense) => expense.dogId === dogId) ? ' and your shelter’s live updates' : ''}.`,
    );
  }

  return (
    <div className="staff-photo-workspace">
      <form
        className="staff-care-form staff-photo-form"
        onSubmit={(event) => {
          event.preventDefault();
          publish(now);
        }}
      >
        <label className="staff-photo-upload">
          <Camera size={28} />
          <strong>
            {reading
              ? 'Reading photo…'
              : photo
                ? 'Change photo'
                : 'Take or choose a photo'}
          </strong>
          <span>JPG, PNG or WebP · up to 1 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={reading}
            onChange={choosePhoto}
          />
        </label>
        {photo && (
          <div className="staff-photo-preview">
            <CarePhoto src={photo} caption={category.label} />
            <Button
              type="button"
              variant="ghost"
              aria-label="Remove selected photo"
              onClick={() => setPhoto(null)}
            >
              <X size={17} />
            </Button>
          </div>
        )}
        <div className="care-editor-two">
          <label>
            Dog
            <select
              value={dogId}
              onChange={(event) => {
                setDogId(event.target.value);
                setExpenseId('');
              }}
            >
              {profileDogs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.location}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={activity}
              onChange={(event) => {
                setActivity(event.target.value as CareUpdate['activity']);
                setExpenseId('');
              }}
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
          Transaction
          <select
            required
            value={expenseId}
            onChange={(event) => setExpenseId(event.target.value)}
          >
            <option value="">Choose the transaction for this photo</option>
            {matchingExpenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expenseLabel(expense)} · {kronor(expense.amountOre)} SEK ·{' '}
                {expenseDateLabel(expense)}
              </option>
            ))}
          </select>
        </label>
        {!matchingExpenses.length && (
          <p className="care-field-hint">
            No recorded transactions for this dog and category yet.
          </p>
        )}
        <fieldset className="staff-photo-duration">
          <legend>Keep in live updates for</legend>
          <div>
            {([1, 2] as const).map((value) => (
              <Button
                type="button"
                variant="outline"
                key={value}
                aria-pressed={hours === value}
                onClick={() => setHours(value)}
              >
                {value} {value === 1 ? 'hour' : 'hours'}
              </Button>
            ))}
          </div>
        </fieldset>
        <label>
          A few words <span className="care-field-optional">Optional</span>
          <textarea
            rows={2}
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="How was this little moment?"
          />
        </label>
        {!expenses.some((expense) => expense.dogId === dogId) && (
          <p className="care-field-hint">
            This dog is not in your personal shelter. Its post will appear in
            its profile.
          </p>
        )}
        {(storageError || error) && (
          <p className="care-editor-error" role="alert">
            {error || storageError}
          </p>
        )}
        {message && <output className="care-editor-success">{message}</output>}
        <Button
          type="submit"
          className="donation-primary"
          disabled={!ready || reading || !photo || !linkedExpense}
        >
          <Send size={16} /> Post photo
        </Button>
        <p className="care-field-hint">
          Local prototype only. The photo leaves the live feed after its chosen
          time and stays with its transaction in the dog’s timeline.
        </p>
      </form>
      <aside className="staff-photo-published">
        <h3>
          Live now <span>{live.length}</span>
        </h3>
        {live.length ? (
          <ul>
            {live.map((post) => (
              <li key={post.id}>
                <CarePhoto {...post.photos[0]} />
                <div>
                  <strong>
                    {profileDogs.find((item) => item.id === post.dogId)!.name}
                  </strong>
                  <span>
                    {
                      calendarActivities.find(
                        (item) => item.id === post.activity,
                      )!.label
                    }
                  </span>
                  <small>
                    Until{' '}
                    {new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'Europe/Stockholm',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(livePhotoExpiry(post))}
                  </small>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove ${post.title}`}
                  onClick={() => {
                    const failure = deleteEvent(post.id);
                    if (failure) setError(failure);
                  }}
                >
                  <X size={16} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Published photos will appear here.</p>
        )}
      </aside>
    </div>
  );
}
