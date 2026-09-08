'use client';
import { useState } from 'react';
import { balances, money, parseMoney } from '@/lib/platform/model';
import type { CareStore } from '@/hooks/use-care-workspace';
import { Modal, Notice, Primary } from './shared';
export function ReceivedGiftDialog({
  store,
  onClose,
  onSaved,
}: {
  store: CareStore;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const donors = balances(store.state!);
  const [donorId, setDonorId] = useState(donors[0]?.id || '');
  const [amount, setAmount] = useState(''),
    [reference, setReference] = useState(''),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<'swish' | 'bank' | 'other'>('swish'),
    [checked, setChecked] = useState(false);
  const ore = parseMoney(amount);
  async function save() {
    if (!ore || !checked) return;
    if (
      await store.send({
        type: 'record-gift',
        donorId,
        amountOre: ore,
        reference,
        receivedAt: date,
        method,
      })
    ) {
      onSaved(`${money(ore)} SEK added to the donor’s available balance.`);
      onClose();
    }
  }
  return (
    <Modal
      open
      title="Record a received donation"
      description="Match a received payment to a registered donor. Payment references prevent duplicates."
      onClose={onClose}
    >
      {!donors.length ? (
        <Notice>
          No registered donors yet. A donor appears here after creating an
          account.
        </Notice>
      ) : (
        <>
          <label className="cp-field">
            Donor
            <select
              value={donorId}
              onChange={(e) => setDonorId(e.target.value)}
            >
              {donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.email ? ' · ' + d.email : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="cp-field">
            Received amount · SEK
            <input
              value={amount}
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="cp-field">
            Payment method
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
            >
              <option value="swish">Swish</option>
              <option value="bank">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="cp-field">
            Unique payment reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={120}
            />
          </label>
          <label className="cp-field">
            Received on
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="cp-review-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            I checked this payment against the organization’s received funds.
          </label>
          {store.error && <Notice kind="error">{store.error}</Notice>}
          <Primary
            disabled={
              !ore || !donorId || !reference.trim() || !checked || store.busy
            }
            onClick={() => void save()}
          >
            {store.busy ? 'Saving…' : 'Record received donation'}
          </Primary>
        </>
      )}
    </Modal>
  );
}
