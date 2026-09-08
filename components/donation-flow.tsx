'use client';
import { useState, useRef } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Sprout,
  Leaf,
  Sun,
  Waves,
  Flower2,
  Check,
  Heart,
  Shuffle,
  FileText,
  CircleCheck,
  MapPin,
  Download,
  PackageCheck,
  ChevronLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  categories,
  money,
  number,
  type Profile,
  type Donation,
  type CategoryId,
  type Territory,
} from '@/lib/earth-data';
import {
  estimate,
  validUsername,
  validAmount,
  stages,
} from '@/lib/donation-model';
import { categoryIcons } from '@/components/earth-globe';

const avatars = [Sprout, Leaf, Waves, Sun, Flower2];
export function Avatar({
  index = 0,
  size = 40,
}: {
  index?: number;
  size?: number;
}) {
  const Icon = avatars[index % avatars.length];
  return (
    <span
      className={`anonymous-avatar avatar-${index}`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.46} />
    </span>
  );
}
export function CreateProfileForm({
  onCreate,
  onCancel,
}: {
  onCreate: (profile: Profile) => void;
  onCancel?: () => void;
}) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('0');
  const [error, setError] = useState('');
  function suggest() {
    const a = ['seed', 'ray', 'wave', 'step', 'sprout'];
    const b = ['kind', 'free', 'calm', 'bright', 'green'];
    const rnd = crypto.getRandomValues(new Uint32Array(3));
    setUsername(
      `${a[rnd[0] % a.length]}_${b[rnd[1] % b.length]}${rnd[2] % 100}`,
    );
    setError('');
  }
  return (
    <form
      className="profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = username.trim();
        if (!validUsername(clean)) {
          setError(
            'Use 3–24 letters, numbers, or underscores. Choose a name different from the existing profiles.',
          );
          return;
        }
        onCreate({
          username: clean,
          avatar: Number(avatar),
          createdAt: new Date().toISOString(),
        });
      }}
    >
      <div className="avatar-options">
        <RadioGroup
          aria-label="Choose your profile symbol"
          value={avatar}
          onValueChange={(v) => setAvatar(String(v))}
        >
          {avatars.map((_, i) => (
            <label key={i} className={Number(avatar) === i ? 'chosen' : ''}>
              <RadioGroupItem
                value={String(i)}
                aria-label={`Symbol ${['sprout', 'leaf', 'wave', 'sun', 'flower'][i]}`}
              />
              <Avatar index={i} size={48} />
            </label>
          ))}
        </RadioGroup>
      </div>
      <label className="field-label" htmlFor="anonymous-name">
        What would you like to be called?
      </label>
      <div className="username-field">
        <span>@</span>
        <input
          id="anonymous-name"
          required
          minLength={3}
          maxLength={24}
          placeholder="Your anonymous name"
          autoComplete="off"
          value={username}
          aria-describedby="username-hint"
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
          }}
        />
        <button type="button" onClick={suggest} aria-label="Suggest a username">
          <Shuffle size={19} />
        </button>
      </div>
      <p className="fine-print" id="username-hint">
        Do not use your real name, email, or other personal details. Use 3–24
        letters, numbers, or underscores.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="local-profile-note">
        <ShieldCheck size={19} />
        <p>
          Your shelter profile stays in this browser. Only your username is
          displayed. This is not an online account and does not sync across
          devices.
        </p>
      </div>
      <button className="primary-button wide" type="submit">
        Create profile and continue
        <ArrowRight size={17} />
      </button>
      {onCancel && (
        <button type="button" className="subtle-button" onClick={onCancel}>
          Go back
        </button>
      )}
    </form>
  );
}
export function AccountDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (p: Profile) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="eh-dialog">
        <span className="dialog-symbol">
          <Sprout size={30} />
        </span>
        <DialogTitle>
          Your name can stay anonymous.
          <br />
          Your impact can be seen.
        </DialogTitle>
        <DialogDescription>
          Create your profile to try a donation and follow every step.
        </DialogDescription>
        <CreateProfileForm
          onCreate={(p) => {
            onCreate(p);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DonationDialog({
  territory,
  category,
  profile,
  onClose,
  onCreate,
  onDonate,
  onShowProfile,
}: {
  territory: Territory;
  category: CategoryId;
  profile: Profile | null;
  onClose: () => void;
  onCreate: (p: Profile) => void;
  onDonate: (amount: number) => Donation;
  onShowProfile: () => void;
}) {
  const [step, setStep] = useState<'cause' | 'account' | 'success'>('cause');
  const [amount, setAmount] = useState('25');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Donation | null>(null);
  const submitting = useRef(false);
  const cat = categories.find((c) => c.id === category)!;
  const Icon = categoryIcons[category];
  const numeric = Number(amount);
  const prediction = validAmount(numeric) ? estimate(numeric, category) : null;
  function submit() {
    if (!validAmount(numeric)) {
      setError(
        'Enter an amount between €1 and €25,000, with up to two decimal places.',
      );
      return;
    }
    if (!profile) {
      setStep('account');
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    try {
      const donation = onDonate(numeric);
      setCreated(donation);
      setStep('success');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to save the contribution.',
      );
      submitting.current = false;
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="eh-dialog donation-dialog">
        {step === 'account' ? (
          <>
            <span className="dialog-symbol">
              <Sprout size={27} />
            </span>
            <DialogTitle>One small step before helping.</DialogTitle>
            <DialogDescription>
              Create an anonymous profile. You will return to the contribution
              summary for {money(numeric)} for {territory.name}.
            </DialogDescription>
            <CreateProfileForm
              onCreate={(p) => {
                onCreate(p);
                setStep('cause');
              }}
              onCancel={() => setStep('cause')}
            />
          </>
        ) : step === 'success' && created ? (
          <>
            <span className="success-symbol">
              <Check size={34} />
            </span>
            <span className="dialog-eyebrow">TEST DONATION RECORDED</span>
            <DialogTitle>Your kindness has a destination.</DialogTitle>
            <DialogDescription>
              You simulated a contribution of{' '}
              <strong>{money(created.amount)}</strong> for{' '}
              {cat.label.toLowerCase()} in {territory.name}. No money was
              charged.
            </DialogDescription>
            <div className="success-ticket">
              <div>
                <MapPin size={20} />
                <span>
                  {territory.name}
                  <small>{cat.project}</small>
                </span>
                <strong>{money(created.amount)}</strong>
              </div>
              <p>Status: contribution recorded</p>
              <code>{created.id}</code>
            </div>
            <button
              className="primary-button wide"
              onClick={() => {
                onClose();
                onShowProfile();
              }}
            >
              Follow your contribution’s journey
              <ArrowRight size={18} />
            </button>
            <button className="subtle-button" onClick={onClose}>
              Keep exploring
            </button>
          </>
        ) : (
          <>
            <div className="cause-heading">
              <span
                className="cause-icon"
                style={{ background: cat.color + '35' }}
              >
                <Icon size={26} />
              </span>
              <span className="dialog-eyebrow">
                {territory.name.toUpperCase()} · CARE SCENARIO
              </span>
            </div>
            <DialogTitle>{cat.project}</DialogTitle>
            <DialogDescription>{cat.description}</DialogDescription>
            <div className="cause-callout">
              <Heart size={17} />
              <span>
                {cat.label} · {territory.countryName ?? territory.continent}
              </span>
              <span className="mini-demo">Example</span>
            </div>
            <div className="amount-heading">
              <h3>Every contribution is a beginning.</h3>
              <span>One-time donation</span>
            </div>
            <RadioGroup
              aria-label="Test donation amount"
              className="amount-options"
              value={amount}
              onValueChange={(v) => {
                setAmount(String(v));
                setError('');
              }}
            >
              {[10, 25, 50, 100].map((a) => (
                <label
                  className={amount === String(a) ? 'selected' : ''}
                  key={a}
                >
                  <RadioGroupItem value={String(a)} aria-label={money(a)} />
                  <span>{money(a)}</span>
                </label>
              ))}
            </RadioGroup>
            <label className="custom-amount">
              <span>Another amount</span>
              <input
                aria-label="Custom amount in euros"
                type="number"
                min="1"
                max="25000"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
              />
              <span>€</span>
            </label>
            {prediction && (
              <div className="impact-estimate">
                <span className="estimate-icon">
                  <PackageCheck size={24} />
                </span>
                <div>
                  <strong>
                    {prediction.units > 0
                      ? `${prediction.units} ${prediction.unit}`
                      : `A contribution towards ${cat.unit}`}
                  </strong>
                  <p>
                    {prediction.units > 0
                      ? `Illustrative estimate: ${money(cat.unitCost)} per kit. ${prediction.remainder > 0 ? `${money(prediction.remainder)} remains unallocated.` : ''}`
                      : `The contribution would cover ${Math.round((numeric / cat.unitCost) * 100)}% of a kit costing ${money(cat.unitCost)}.`}
                  </p>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="primary-button wide" onClick={submit}>
              {profile
                ? `Simulate a donation of ${validAmount(numeric) ? money(numeric) : '…'}`
                : 'Create a profile to contribute'}
              <ArrowUpRight size={18} />
            </button>
            <p className="payment-note">
              <ShieldCheck size={13} />
              Secure giving
            </p>
            <div className="official-channel">
              <div>
                <strong>Want to make a real contribution?</strong>
                <p>Visit the organization’s official donation page.</p>
              </div>
              <a href={cat.url} target="_blank" rel="noopener noreferrer">
                {cat.organization}
                <ArrowUpRight size={16} />
              </a>
              <small>
                General external link, with no affiliation. Check the available
                destinations. External donations are not tracked by this
                prototype.
              </small>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DonationDocument({
  donation,
  username,
  onClose,
  onAdvance,
}: {
  donation: Donation;
  username: string;
  onClose: () => void;
  onAdvance: () => void;
}) {
  const cat = categories.find((c) => c.id === donation.category)!;
  const prediction = estimate(donation.amount, donation.category);
  function download() {
    const text = [
      'EARTHEALTH — CONTRIBUTION REPORT',
      'This is not a tax receipt, a payment, or proof of delivery.',
      `ID: ${donation.id}`,
      `Profile: @${username}`,
      `Date: ${new Date(donation.createdAt).toLocaleString('en-GB')}`,
      `Destination: ${donation.territoryName}`,
      `Category: ${cat.label}`,
      `Simulated amount: ${money(donation.amount)}`,
      `Simulated status: ${stages[donation.stage]}`,
      `Illustrative model: ${money(donation.amount)} / ${money(prediction.unitCost)} = ${prediction.units} ${prediction.unit}; ${money(prediction.remainder)} unallocated.`,
      `People potentially reached (fictional estimate): ${prediction.people}.`,
      'No goods were purchased and no aid was actually delivered.',
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `earthealth-report-${donation.id}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="eh-dialog document-dialog">
        <span className="dialog-eyebrow">
          YOUR CONTRIBUTION’S JOURNEY · SIMULATION
        </span>
        <DialogTitle>
          {money(donation.amount)}, towards {donation.territoryName}.
        </DialogTitle>
        <DialogDescription>
          {cat.label} ·{' '}
          {new Date(donation.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </DialogDescription>
        <div className="donation-timeline">
          {stages.map((stage, i) => (
            <div className={i <= donation.stage ? 'complete' : ''} key={stage}>
              <span>{i <= donation.stage ? <Check size={14} /> : i + 1}</span>
              <div>
                <strong>{stage}</strong>
                <p>
                  {
                    [
                      'The contribution is saved in the local ledger.',
                      'Budget allocated to the project.',
                      'An example report is available below.',
                      'Simulated delivery; no real aid.',
                    ][i]
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="document-breakdown">
          <div>
            <strong>
              {donation.stage >= 2
                ? 'Simulated purchase'
                : 'Planned purchase in this scenario'}
            </strong>
            <span className="mini-demo">CARE</span>
          </div>
          <p>
            {prediction.units} {prediction.unit}
            <span>{money(prediction.units * prediction.unitCost)}</span>
          </p>
          <p>
            Budget still to be allocated
            <span>{money(prediction.remainder)}</span>
          </p>
          <p className="breakdown-total">
            Total<span>{money(donation.amount)}</span>
          </p>
        </div>
        <div className="impact-estimate">
          <UsersIcon />
          <div>
            <strong>
              {number(prediction.people)} people: illustrative estimate
            </strong>
            <p>
              {prediction.units} kit ×{' '}
              {prediction.units ? prediction.people / prediction.units : 0}{' '}
              people per kit. An illustrative assumption, not a verified measure
              of impact.
            </p>
          </div>
        </div>
        {donation.stage < 3 ? (
          <button className="primary-button wide" onClick={onAdvance}>
            Advance to the next step
            <ArrowRight size={17} />
          </button>
        ) : (
          <p className="document-complete">
            <CircleCheck size={18} />
            Journey completed
          </p>
        )}
        <button className="outline-button wide" onClick={download}>
          <Download size={16} />
          Download the report
        </button>
        <p className="fine-print">
          This document is neither a tax receipt nor proof of delivery. No
          organization has received money through this prototype.
        </p>
      </DialogContent>
    </Dialog>
  );
}
function UsersIcon() {
  return (
    <span className="estimate-icon">
      <Heart size={23} />
    </span>
  );
}
