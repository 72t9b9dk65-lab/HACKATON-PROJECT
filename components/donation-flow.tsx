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
    const a = ['seme', 'raggio', 'onda', 'passo', 'germoglio'];
    const b = ['gentile', 'libero', 'sereno', 'luminoso', 'verde'];
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
            'Usa 3–24 lettere, numeri o trattini bassi. Scegli un nome diverso dai profili demo.',
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
          aria-label="Scegli il simbolo del tuo profilo"
          value={avatar}
          onValueChange={(v) => setAvatar(String(v))}
        >
          {avatars.map((_, i) => (
            <label key={i} className={Number(avatar) === i ? 'chosen' : ''}>
              <RadioGroupItem
                value={String(i)}
                aria-label={`Simbolo ${['germoglio', 'foglia', 'onda', 'sole', 'fiore'][i]}`}
              />
              <Avatar index={i} size={48} />
            </label>
          ))}
        </RadioGroup>
      </div>
      <label className="field-label" htmlFor="anonymous-name">
        Come vuoi farti chiamare?
      </label>
      <div className="username-field">
        <span>@</span>
        <input
          id="anonymous-name"
          required
          minLength={3}
          maxLength={24}
          placeholder="Il tuo nome anonimo"
          autoComplete="off"
          value={username}
          aria-describedby="username-hint"
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
          }}
        />
        <button
          type="button"
          onClick={suggest}
          aria-label="Suggerisci uno username"
        >
          <Shuffle size={19} />
        </button>
      </div>
      <p className="fine-print" id="username-hint">
        Non usare nome, email o altri dati personali. Bastano 3–24 lettere,
        numeri o trattini bassi.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="local-profile-note">
        <ShieldCheck size={19} />
        <p>
          Il tuo profilo demo rimane su questo browser. Gli altri vedono solo lo
          username. Non è un account online e non si sincronizza tra
          dispositivi.
        </p>
      </div>
      <button className="primary-button wide" type="submit">
        Crea profilo e continua
        <ArrowRight size={17} />
      </button>
      {onCancel && (
        <button type="button" className="subtle-button" onClick={onCancel}>
          Torna indietro
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
          Il tuo nome può restare anonimo.
          <br />
          Il tuo impatto, no.
        </DialogTitle>
        <DialogDescription>
          Crea il tuo profilo per provare una donazione e seguirne ogni passo.
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
        'Inserisci un importo tra 1 € e 25.000 €, con massimo due decimali.',
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
        e instanceof Error ? e.message : 'Impossibile salvare il contributo.',
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
            <DialogTitle>Un piccolo passo prima di aiutare.</DialogTitle>
            <DialogDescription>
              Crea un profilo anonimo. Tornerai al riepilogo del contributo di{' '}
              {money(numeric)} per {territory.name}.
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
            <span className="dialog-eyebrow">
              DONAZIONE DI PROVA REGISTRATA
            </span>
            <DialogTitle>Il tuo gesto ha una destinazione.</DialogTitle>
            <DialogDescription>
              Hai simulato un contributo di{' '}
              <strong>{money(created.amount)}</strong> per{' '}
              {cat.label.toLowerCase()} in {territory.name}. Nessun denaro è
              stato addebitato.
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
              <p>Stato: contributo demo registrato</p>
              <code>{created.id}</code>
            </div>
            <button
              className="primary-button wide"
              onClick={() => {
                onClose();
                onShowProfile();
              }}
            >
              Segui il viaggio del tuo aiuto
              <ArrowRight size={18} />
            </button>
            <button className="subtle-button" onClick={onClose}>
              Continua a esplorare
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
                {territory.name.toUpperCase()} · SCENARIO DEMO
              </span>
            </div>
            <DialogTitle>{cat.project}</DialogTitle>
            <DialogDescription>{cat.description}</DialogDescription>
            <div className="cause-callout">
              <Heart size={17} />
              <span>
                {cat.label} · {territory.countryName ?? territory.continent}
              </span>
              <span className="mini-demo">Esempio</span>
            </div>
            <div className="amount-heading">
              <h3>Ogni contributo è un inizio.</h3>
              <span>Donazione singola</span>
            </div>
            <RadioGroup
              aria-label="Importo della donazione di prova"
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
              <span>Un altro importo</span>
              <input
                aria-label="Importo personalizzato in euro"
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
                      : `Una quota per ${cat.unit}`}
                  </strong>
                  <p>
                    {prediction.units > 0
                      ? `Stima illustrativa: ${money(cat.unitCost)} per kit. ${prediction.remainder > 0 ? `${money(prediction.remainder)} restano da assegnare.` : ''}`
                      : `Il contributo coprirebbe il ${Math.round((numeric / cat.unitCost) * 100)}% di un kit da ${money(cat.unitCost)}.`}
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
                ? `Simula una donazione di ${validAmount(numeric) ? money(numeric) : '…'}`
                : 'Crea un profilo per contribuire'}
              <ArrowUpRight size={18} />
            </button>
            <p className="payment-note">
              <ShieldCheck size={13} />
              Modalità demo · Nessun pagamento reale
            </p>
            <div className="official-channel">
              <div>
                <strong>Vuoi aiutare davvero?</strong>
                <p>Vai al canale ufficiale dell’organizzazione.</p>
              </div>
              <a href={cat.url} target="_blank" rel="noopener noreferrer">
                {cat.organization}
                <ArrowUpRight size={16} />
              </a>
              <small>
                Link generale esterno, senza affiliazione. Verifica le
                destinazioni disponibili. Le donazioni esterne non sono
                tracciate da questo prototipo.
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
      'EARTHHEALTH — DOCUMENTO DIMOSTRATIVO',
      'Non è una ricevuta fiscale, un pagamento o una prova di consegna.',
      `ID: ${donation.id}`,
      `Profilo: @${username}`,
      `Data: ${new Date(donation.createdAt).toLocaleString('it-IT')}`,
      `Destinazione: ${donation.territoryName}`,
      `Categoria: ${cat.label}`,
      `Importo simulato: ${money(donation.amount)}`,
      `Stato simulato: ${stages[donation.stage]}`,
      `Modello illustrativo: ${money(donation.amount)} / ${money(prediction.unitCost)} = ${prediction.units} ${prediction.unit}; ${money(prediction.remainder)} non assegnati.`,
      `Persone potenzialmente raggiunte (stima inventata): ${prediction.people}.`,
      'Nessun bene è stato acquistato e nessun aiuto è stato realmente consegnato.',
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `EarthHealth-DEMO-${donation.id}.txt`;
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
          IL VIAGGIO DEL TUO AIUTO · SIMULAZIONE
        </span>
        <DialogTitle>
          {money(donation.amount)}, verso {donation.territoryName}.
        </DialogTitle>
        <DialogDescription>
          {cat.label} ·{' '}
          {new Date(donation.createdAt).toLocaleDateString('it-IT', {
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
                      'Il contributo è salvato nel registro locale.',
                      'Budget destinato al progetto dimostrativo.',
                      'Rendiconto di esempio disponibile qui sotto.',
                      'Consegna simulata; nessun aiuto reale.',
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
                ? 'Acquisto simulato'
                : 'Acquisto previsto nello scenario'}
            </strong>
            <span className="mini-demo">DEMO</span>
          </div>
          <p>
            {prediction.units} {prediction.unit}
            <span>{money(prediction.units * prediction.unitCost)}</span>
          </p>
          <p>
            Budget ancora da assegnare<span>{money(prediction.remainder)}</span>
          </p>
          <p className="breakdown-total">
            Totale<span>{money(donation.amount)}</span>
          </p>
        </div>
        <div className="impact-estimate">
          <UsersIcon />
          <div>
            <strong>
              {number(prediction.people)} persone: stima illustrativa
            </strong>
            <p>
              {prediction.units} kit ×{' '}
              {prediction.units ? prediction.people / prediction.units : 0}{' '}
              persone per kit. Ipotesi di esempio, non una misura di impatto
              verificata.
            </p>
          </div>
        </div>
        {donation.stage < 3 ? (
          <button className="primary-button wide" onClick={onAdvance}>
            Avanza al prossimo passo demo
            <ArrowRight size={17} />
          </button>
        ) : (
          <p className="document-complete">
            <CircleCheck size={18} />
            Percorso dimostrativo completato
          </p>
        )}
        <button className="outline-button wide" onClick={download}>
          <Download size={16} />
          Scarica il rendiconto demo
        </button>
        <p className="fine-print">
          Questo documento non è una ricevuta fiscale né una prova di consegna.
          Nessuna organizzazione ha ricevuto denaro attraverso questo prototipo.
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
