'use client';
import { CareImage } from './care-image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Heart, ShieldCheck, WifiOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CareStore } from '@/hooks/use-care-workspace';
import { categoryFor, money } from '@/lib/platform/model';
import type { Category, CarePost, Workspace } from '@/lib/platform/types';
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent
        className={`care-platform cp-dialog ${wide ? 'cp-dialog-wide' : ''}`}
      >
        <div className="cp-dialog-heading">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? 'Your care, connected to real dogs.'}
          </DialogDescription>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function Primary({
  children,
  className = '',
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={`cp-button ${typeof className === 'string' ? className : ''}`}
      {...props}
    >
      {children}
    </Button>
  );
}
export function Notice({
  children,
  kind = 'info',
}: {
  children: ReactNode;
  kind?: 'info' | 'error' | 'success';
}) {
  return (
    <div
      className={`cp-notice cp-notice-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {kind === 'success' && <Check size={17} />}
      <span>{children}</span>
    </div>
  );
}
export function SyncState({ online }: { online: boolean }) {
  return (
    <span className={`cp-sync ${online ? '' : 'cp-offline'}`}>
      {online ? <i /> : <WifiOff size={14} />}{' '}
      {online ? 'Updates connected' : 'Reconnecting…'}
    </span>
  );
}
export function Header({
  staff = false,
  online = true,
  showSync = true,
  heading,
  children,
}: {
  staff?: boolean;
  online?: boolean;
  showSync?: boolean;
  heading?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="cp-header">
      <a className="cp-brand" href={staff ? '/staff' : '/'}>
        <CareImage src="/shelters/pixel-shelter.png" alt="" />
        <span>
          HUNDSTALLET
          <small>{staff ? 'Care workspace' : 'Your growing shelter'}</small>
        </span>
      </a>
      {heading ?? (
        <span className="cp-demo-pill">Local demo · no payments</span>
      )}
      <div className="cp-header-actions">
        {showSync && <SyncState online={online} />}
        {children}
        <a
          className="cp-text-link"
          href={staff ? '/' : '/staff'}
          target="_blank"
          rel="noreferrer"
        >
          {staff ? 'Donor shelter' : 'Staff workspace'}{' '}
          <ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  );
}
export function LoadingWorkspace({ store }: { store: CareStore }) {
  return (
    <div className="care-platform">
      <Header online={store.online} />
      <main className="cp-loading">
        <CareImage src="/shelters/pixel-shelter.png" alt="" />
        <h1>Opening your shelter</h1>
        {store.error ? (
          <>
            <Notice kind="error">{store.error}</Notice>
            <Primary onClick={() => void store.refresh()}>Try again</Primary>
          </>
        ) : (
          <p>Getting the latest care records.</p>
        )}
      </main>
    </div>
  );
}
export function CategoryIcon({
  category,
  className = '',
}: {
  category: Category;
  className?: string;
}) {
  return (
    <CareImage
      className={`cp-category-icon ${className}`}
      src={categoryFor(category).asset}
      alt=""
    />
  );
}
export function dateLabel(value: string, time = true) {
  const dated = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(!dated && time ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Europe/Stockholm',
  }).format(new Date(value));
}
export function useClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const start = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    const sync = () => setNow(Date.now());
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return now;
}
export function Photo({
  post,
  onClick,
}: {
  post: CarePost;
  onClick?: () => void;
}) {
  return (
    <button
      className="cp-photo-button"
      onClick={onClick}
      aria-label={`Open photo: ${post.title}`}
    >
      <CareImage
        src={post.photo?.url ?? post.demoPhoto}
        alt={post.title}
        loading="lazy"
      />
      {post.source === 'demo' && (
        <span className="cp-photo-label">Demo story</span>
      )}
    </button>
  );
}
export function Footer() {
  return (
    <footer className="cp-footer">
      <span>
        <Heart size={15} /> Built around real dogs and the people who care for
        them.
      </span>
      <a
        href="https://hundstallet.se/stod-oss/"
        target="_blank"
        rel="noreferrer"
      >
        Hundstallet’s official giving page <ArrowUpRight size={14} />
      </a>
      <Link className="cp-text-link" href="/verify">
        Verify a care record <ShieldCheck size={14} />
      </Link>
      <small>
        Independent local prototype. Public profiles are a 7 September 2026
        snapshot. Contributions and sample care stories are illustrative.
      </small>
    </footer>
  );
}
export function GoalSummary({
  state,
  onDonate,
  onShare,
}: {
  state: Workspace;
  onDonate: () => void;
  onShare: () => void;
}) {
  const gifts = state.gifts.filter((g) => g.goalId === 'shared-care');
  const raised = gifts.reduce((n, g) => n + g.amountOre, 0);
  const target = 500_000;
  const count = new Set(gifts.map((g) => g.donorId)).size;
  return (
    <section className="cp-community">
      <div className="cp-community-art">
        <CareImage
          src="/care/pixel/food-enrichment.png"
          alt="Food and enrichment supplies"
        />
      </div>
      <div>
        <span className="cp-eyebrow">A LITTLE CARE, TOGETHER</span>
        <h2>One community. More second chances.</h2>
        <p>
          Help build a 5,000 SEK care fund for meals, enrichment and everyday
          comfort.
        </p>
        <div className="cp-goal-values">
          <strong>
            {money(raised)} <small>/ 5,000 SEK contributed</small>
          </strong>
          <span>{count} supporters</span>
        </div>
        <progress
          className="cp-goal-progress"
          max={target}
          value={Math.min(target, raised)}
          aria-label="Shared care fund"
        />
        <small>
          Demo contributions to shared care. Spending is shown in the care
          records.
        </small>
        <div className="cp-inline-actions">
          <Primary onClick={onDonate}>
            Be part of it <Heart size={16} />
          </Primary>
          <Button variant="ghost" onClick={onShare}>
            Invite a friend <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
    </section>
  );
}
export function EvidenceLabel({ anchored = false }: { anchored?: boolean }) {
  return (
    <span className="cp-evidence-label">
      <ShieldCheck size={13} />
      {anchored ? 'Testnet anchor verified' : 'Record fingerprint'}
    </span>
  );
}
