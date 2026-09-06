'use client';
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  MapPin,
  FileText,
  Users,
  Sprout,
  Trophy,
  ShieldCheck,
  CircleCheck,
  Package,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Avatar } from './donation-flow';
import {
  categories,
  money,
  number,
  type Profile,
  type Donation,
  type Territory,
} from '@/lib/earth-data';
import { estimate, stages, rankedSeedDonors } from '@/lib/donation-model';
import { categoryIcons } from './earth-globe';

export function ImpactProfile({
  profile,
  donations,
  onCreate,
  onExplore,
  onDocument,
  onLocate,
}: {
  profile: Profile | null;
  donations: Donation[];
  onCreate: () => void;
  onExplore: () => void;
  onDocument: (d: Donation) => void;
  onLocate: (id: string) => void;
}) {
  const total = donations.reduce((s, d) => s + d.amount, 0);
  const people = donations
    .filter((d) => d.stage === 3)
    .reduce((s, d) => s + estimate(d.amount, d.category).people, 0);
  const countries = new Set(donations.map((d) => d.countryId)).size;
  if (!profile)
    return (
      <section className="profile-welcome">
        <div className="welcome-orbit">
          <Sprout size={57} />
        </div>
        <span className="eyebrow">IL TUO IMPATTO COMINCIA QUI</span>
        <h2>
          Non serve un grande nome.
          <br />
          Basta un piccolo gesto.
        </h2>
        <p>
          Crea un profilo anonimo, scegli chi aiutare e segui ogni contributo.
          Il tuo primo viaggio può iniziare oggi.
        </p>
        <button className="primary-button" onClick={onCreate}>
          Crea il tuo profilo anonimo
          <ArrowUpRight size={18} />
        </button>
        <span className="welcome-note">
          <ShieldCheck size={15} />
          Profilo locale · Donazioni simulate · Nessun addebito
        </span>
      </section>
    );
  return (
    <section className="profile-dashboard">
      <div className="profile-banner">
        <Avatar index={profile.avatar} size={76} />
        <div>
          <span className="eyebrow">UN NOME ANONIMO, UN GESTO CONCRETO</span>
          <h2>@{profile.username}</h2>
          <p>Il tuo percorso, un aiuto alla volta.</p>
        </div>
        <span className="profile-device">
          <ShieldCheck size={16} />
          Profilo demo su questo dispositivo
        </span>
      </div>
      <div className="personal-stats">
        <div>
          <Heart />
          <span>Il tuo contributo totale</span>
          <strong>{money(total)}</strong>
          <small>Donazioni simulate</small>
        </div>
        <div>
          <MapPin />
          <span>Territori raggiunti</span>
          <strong>{countries.toString().padStart(2, '0')}</strong>
          <small>Destinazioni dei tuoi contributi</small>
        </div>
        <div>
          <Users />
          <span>Persone potenzialmente aiutate</span>
          <strong>{number(people)}</strong>
          <small>Stima demo delle consegne simulate</small>
        </div>
      </div>
      <div className="ledger-heading">
        <div>
          <h3>Il viaggio delle tue donazioni</h3>
          <p>Dal primo gesto alla destinazione. Tutto, in un unico posto.</p>
        </div>
        <button className="outline-button" onClick={onExplore}>
          Trova una nuova causa
          <ArrowUpRight size={17} />
        </button>
      </div>
      {donations.length === 0 ? (
        <div className="empty-ledger">
          <Heart size={38} />
          <h3>Ogni viaggio comincia con un gesto.</h3>
          <p>
            Non hai ancora effettuato donazioni di prova. Esplora il globo e
            scegli una causa che senti vicina.
          </p>
          <button className="primary-button" onClick={onExplore}>
            Esplora i bisogni del mondo
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <div className="donation-cards">
          {donations.map((d) => {
            const c = categories.find((c) => c.id === d.category)!;
            const Icon = categoryIcons[d.category];
            const prediction = estimate(d.amount, d.category);
            return (
              <article className="donation-card" key={d.id}>
                <div className="donation-card-heading">
                  <span
                    className="cause-icon"
                    style={{ background: c.color + '30' }}
                  >
                    <Icon size={24} />
                  </span>
                  <div>
                    <span>{c.label}</span>
                    <h3>{d.territoryName}</h3>
                  </div>
                  <strong>{money(d.amount)}</strong>
                </div>
                <p className="donation-date">
                  {new Date(d.createdAt).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  <span>Donazione demo</span>
                </p>
                <div className="donation-card-stage">
                  <span>{stages[d.stage]}</span>
                  <span>{d.stage + 1}/4</span>
                </div>
                <Progress
                  value={(d.stage + 1) * 25}
                  aria-label={`Avanzamento demo: ${stages[d.stage]}`}
                />
                <p className="donation-card-impact">
                  <Package size={15} />
                  {prediction.units} {prediction.unit}{' '}
                  {d.stage >= 2
                    ? 'in acquisto simulato'
                    : 'previsti nello scenario'}
                </p>
                <div className="donation-card-actions">
                  <button onClick={() => onDocument(d)}>
                    <FileText size={15} />
                    Segui e documenta
                    <ArrowRight size={15} />
                  </button>
                  <button
                    aria-label={`Mostra ${d.territoryName} sul globo`}
                    title="Mostra sul globo"
                    onClick={() => onLocate(d.territoryId)}
                  >
                    <MapPin size={17} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="profile-transparency">
        <ShieldCheck size={23} />
        <div>
          <h3>La trasparenza fa parte del viaggio.</h3>
          <p>
            Apri «Segui e documenta» per avanzare tra i passaggi della
            simulazione, vedere gli acquisti di esempio e scaricare il
            rendiconto. Importi, consegne e stime non corrispondono a
            transazioni o aiuti reali.
          </p>
        </div>
      </div>
    </section>
  );
}
export function CommunityPanel({
  profile,
  donations,
  onCreate,
  onExplore,
}: {
  profile: Profile | null;
  donations: Donation[];
  onCreate: () => void;
  onExplore: () => void;
}) {
  const donors = [
    ...rankedSeedDonors,
    ...(profile
      ? [
          {
            username: profile.username,
            avatar: profile.avatar,
            total: donations.reduce((s, d) => s + d.amount, 0),
            territories: new Set(donations.map((d) => d.countryId)).size,
          },
        ]
      : []),
  ].sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));
  return (
    <aside className="territory-panel community-panel">
      <div className="panel-breadcrumb">
        <Users size={15} />
        <span>La community earthealth</span>
      </div>
      <span className="overline">IL BENE HA TANTI NOMI</span>
      <h2>
        Anonimi.
        <br />
        Insieme, visibili<span>.</span>
      </h2>
      <p className="territory-description">
        Dietro ogni username c’è qualcuno che ha scelto di esserci.
      </p>
      <div className="leaderboard-heading">
        <Trophy size={17} />
        <h3>La classifica dei gesti</h3>
        <span>DEMO</span>
      </div>
      <Table className="leaderboard-table">
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Donatore</TableHead>
            <TableHead>Totale</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donors.map((d, i) => (
            <TableRow
              key={d.username}
              className={d.username === profile?.username ? 'your-rank' : ''}
            >
              <TableCell>
                <span className={`rank rank-${i + 1}`}>{i + 1}</span>
              </TableCell>
              <TableCell>
                <div className="rank-person">
                  <Avatar index={d.avatar} size={31} />
                  <div>
                    <strong>{d.username}</strong>
                    <span>
                      {d.username === profile?.username ? 'Tu · ' : ''}
                      {d.territories} territori
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{money(d.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="ranking-note">
        Totali di esempio, dal primo contributo. Solo lo username è visibile.
      </p>
      <div className="community-note">
        <span>
          <Heart size={20} />
        </span>
        <h3>
          Non è una gara.
          <br />È un mondo che si avvicina.
        </h3>
        <p>Ogni importo ha valore. Anche il tuo.</p>
        <button
          className="donate-button"
          onClick={profile ? onExplore : onCreate}
        >
          {profile ? 'Trova la tua prossima causa' : 'Entra nella community'}
          <ArrowUpRight size={18} />
        </button>
      </div>
    </aside>
  );
}
