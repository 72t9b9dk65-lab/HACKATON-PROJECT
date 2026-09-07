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
        <span className="eyebrow">YOUR IMPACT STARTS HERE</span>
        <h2>
          You do not need a famous name.
          <br />
          Just a small act of kindness.
        </h2>
        <p>
          Create an anonymous profile, choose who to help, and follow every
          contribution. Your first journey can begin today.
        </p>
        <button className="primary-button" onClick={onCreate}>
          Create your anonymous profile
          <ArrowUpRight size={18} />
        </button>
        <span className="welcome-note">
          <ShieldCheck size={15} />
          Local profile · Simulated donations · No charges
        </span>
      </section>
    );
  return (
    <section className="profile-dashboard">
      <div className="profile-banner">
        <Avatar index={profile.avatar} size={76} />
        <div>
          <span className="eyebrow">AN ANONYMOUS NAME, A MEANINGFUL ACT</span>
          <h2>@{profile.username}</h2>
          <p>Your journey, one contribution at a time.</p>
        </div>
        <span className="profile-device">
          <ShieldCheck size={16} />
          Demo profile on this device
        </span>
      </div>
      <div className="personal-stats">
        <div>
          <Heart />
          <span>Your total contribution</span>
          <strong>{money(total)}</strong>
          <small>Simulated donations</small>
        </div>
        <div>
          <MapPin />
          <span>Territories reached</span>
          <strong>{countries.toString().padStart(2, '0')}</strong>
          <small>Destinations of your contributions</small>
        </div>
        <div>
          <Users />
          <span>People potentially helped</span>
          <strong>{number(people)}</strong>
          <small>Demo estimate of simulated deliveries</small>
        </div>
      </div>
      <div className="ledger-heading">
        <div>
          <h3>Your donations’ journey</h3>
          <p>
            From the first contribution to its destination. Everything in one
            place.
          </p>
        </div>
        <button className="outline-button" onClick={onExplore}>
          Find a new cause
          <ArrowUpRight size={17} />
        </button>
      </div>
      {donations.length === 0 ? (
        <div className="empty-ledger">
          <Heart size={38} />
          <h3>Every journey starts with an act of kindness.</h3>
          <p>
            You have not made any test donations yet. Explore the globe and
            choose a cause that matters to you.
          </p>
          <button className="primary-button" onClick={onExplore}>
            Explore the world’s needs
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
                  {new Date(d.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  <span>Demo donation</span>
                </p>
                <div className="donation-card-stage">
                  <span>{stages[d.stage]}</span>
                  <span>{d.stage + 1}/4</span>
                </div>
                <Progress
                  value={(d.stage + 1) * 25}
                  aria-label={`Demo progress: ${stages[d.stage]}`}
                />
                <p className="donation-card-impact">
                  <Package size={15} />
                  {prediction.units} {prediction.unit}{' '}
                  {d.stage >= 2
                    ? 'in a simulated purchase'
                    : 'planned in this scenario'}
                </p>
                <div className="donation-card-actions">
                  <button onClick={() => onDocument(d)}>
                    <FileText size={15} />
                    Track and document
                    <ArrowRight size={15} />
                  </button>
                  <button
                    aria-label={`Show ${d.territoryName} on the globe`}
                    title="Show on the globe"
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
          <h3>Transparency is part of the journey.</h3>
          <p>
            Open “Track and document” to advance through the simulation, view
            example purchases, and download the report. Amounts, deliveries, and
            estimates do not represent real transactions or aid.
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
        <span>The earthealth community</span>
      </div>
      <span className="overline">KINDNESS HAS MANY NAMES</span>
      <h2>
        Anonymous.
        <br />
        Together, visible<span>.</span>
      </h2>
      <p className="territory-description">
        Behind every username is someone who chose to help.
      </p>
      <div className="leaderboard-heading">
        <Trophy size={17} />
        <h3>The kindness leaderboard</h3>
        <span>DEMO</span>
      </div>
      <Table className="leaderboard-table">
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead>Total</TableHead>
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
                      {d.username === profile?.username ? 'You · ' : ''}
                      {d.territories} territories
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
        Example totals, starting with the first contribution. Only the username
        is visible.
      </p>
      <div className="community-note">
        <span>
          <Heart size={20} />
        </span>
        <h3>
          It is not a competition.
          <br />
          It is a world coming closer together.
        </h3>
        <p>Every amount matters. Yours too.</p>
        <button
          className="donate-button"
          onClick={profile ? onExplore : onCreate}
        >
          {profile ? 'Find your next cause' : 'Join the community'}
          <ArrowUpRight size={18} />
        </button>
      </div>
    </aside>
  );
}
