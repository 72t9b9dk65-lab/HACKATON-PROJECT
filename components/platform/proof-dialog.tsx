'use client';
import { useState } from 'react';
import {
  Download,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Link2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { Proof, Receipt } from '@/lib/platform/types';
import { anchorData, sha256, verifyProof } from '@/lib/platform/proofs';
import { Modal, Notice, Primary, dateLabel } from './shared';
import { Button } from '@/components/ui/button';
type Wallet = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
export function ProofDialog({
  proof,
  receipt,
  onClose,
  onRefresh,
}: {
  proof: Proof | null;
  receipt?: Receipt;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [txHash, setTxHash] = useState('');
  async function checkRecord() {
    if (!proof) return;
    setError('');
    setStatus(
      (await verifyProof(proof))
        ? 'The record matches its original SHA-256 fingerprint.'
        : '',
    );
    if (!(await verifyProof(proof)))
      setError('This record does not match its fingerprint.');
  }
  async function checkFile(file: File) {
    if (!proof) return;
    setError('');
    setStatus('');
    const expected = proof.payload.documentHash;
    if (!expected) {
      setError(
        'This sample record has no original receipt attached. Uploads receive a document fingerprint when the receipt is confirmed.',
      );
      return;
    }
    if ((await sha256(await file.arrayBuffer())) === expected)
      setStatus('Document verified: its bytes match the recorded receipt.');
    else
      setError(
        'Document changed: its fingerprint does not match the registered receipt.',
      );
  }
  function download() {
    if (!proof) return;
    const blob = new Blob(
      [JSON.stringify({ format: 'hundstallet-proof-v1', proof }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `care-proof-${proof.seq}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function anchor() {
    if (!proof) return;
    setError('');
    setStatus('');
    setWorking(true);
    try {
      const wallet = (window as Window & { ethereum?: Wallet }).ethereum;
      if (!wallet)
        throw new Error(
          'Open this page in a browser with an Ethereum wallet to anchor on Sepolia. Local verification works without a wallet.',
        );
      const accounts = (await wallet.request({
        method: 'eth_requestAccounts',
      })) as string[];
      if (!accounts[0]) throw new Error('No wallet account selected.');
      await wallet.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
      const hash = (await wallet.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: accounts[0],
            to: accounts[0],
            value: '0x0',
            data: anchorData(proof.hash),
          },
        ],
      })) as string;
      setTxHash(hash);
      setStatus(
        'Submitted on Sepolia. Once confirmed, click “Check testnet confirmation”. No real donation was transferred.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet request cancelled.');
    } finally {
      setWorking(false);
    }
  }
  async function confirm() {
    if (!proof) return;
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/platform/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId: proof.id, txHash }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      setStatus('Confirmed on Sepolia. This record’s fingerprint is anchored.');
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setWorking(false);
    }
  }
  return (
    <Modal
      open={!!proof}
      onClose={onClose}
      title="Follow the evidence"
      description="Check the record, its document and any testnet anchor."
    >
      {proof && (
        <>
          <div className="cp-proof-header">
            <div className="cp-proof-symbol">
              <Fingerprint size={32} />
            </div>
            <div>
              <strong>Care record #{proof.seq}</strong>
              <p>{dateLabel(proof.at)}</p>
              <span className="cp-tag">
                {proof.anchors.length
                  ? 'Sepolia anchor confirmed'
                  : 'Local fingerprint · not yet on-chain'}
              </span>
            </div>
          </div>
          <div className="cp-proof-steps">
            <p>
              <FileCheck2 size={19} />
              <span>
                <strong>Document</strong>
                {receipt?.file ? (
                  <a href={receipt.file.url} target="_blank" rel="noreferrer">
                    Open {receipt.file.name} <ExternalLink size={12} />
                  </a>
                ) : (
                  <small>No original document attached to this sample.</small>
                )}
              </span>
            </p>
            <p>
              <ShieldCheck size={19} />
              <span>
                <strong>Record integrity</strong>
                <small>Recompute the fingerprint to detect changes.</small>
              </span>
              <Button variant="outline" onClick={() => void checkRecord()}>
                Verify
              </Button>
            </p>
            <p>
              <Link2 size={19} />
              <span>
                <strong>Independent timestamp</strong>
                <small>
                  {proof.anchors.length
                    ? 'Recorded on the Sepolia test network.'
                    : 'A testnet anchor is optional and requires a wallet.'}
                </small>
              </span>
            </p>
          </div>
          <label className="cp-verify-file">
            <Upload size={18} />
            <span>Check a receipt file against this record</span>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) void checkFile(e.target.files[0]);
              }}
            />
          </label>
          {status && <Notice kind="success">{status}</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
          <details className="cp-details">
            <summary>Fingerprint & verification details</summary>
            <code className="cp-hash">{proof.hash}</code>
            <small>
              SHA-256 of the canonical record, including the previous
              fingerprint.
            </small>
            <pre className="cp-code">
              {JSON.stringify(proof.payload, null, 2)}
            </pre>
            <Button variant="outline" onClick={download}>
              <Download size={15} /> Download proof
            </Button>
          </details>
          <details className="cp-details">
            <summary>Anchor on the Sepolia test network</summary>
            <p>
              Your wallet approves a zero-value transaction containing only this
              fingerprint. Test ETH is needed for the network fee.
            </p>
            <Primary
              disabled={working || proof.anchors.length > 0}
              onClick={() => void anchor()}
            >
              <Link2 size={16} />
              {proof.anchors.length
                ? 'Already anchored'
                : 'Connect wallet & anchor'}
            </Primary>
            <label className="cp-field">
              Transaction hash
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x…"
              />
            </label>
            <Button
              variant="outline"
              disabled={working || !/^0x[a-fA-F0-9]{64}$/.test(txHash)}
              onClick={() => void confirm()}
            >
              Check testnet confirmation
            </Button>
            {proof.anchors.map((a) => (
              <a
                key={a.txHash}
                className="cp-text-link"
                href={`https://sepolia.etherscan.io/tx/${a.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View confirmed transaction <ExternalLink size={14} />
              </a>
            ))}
          </details>
          <p className="cp-fine-print">
            Verification proves that the registered record has not changed.
            Staff remain responsible for the accuracy of the purchase and care
            information.
          </p>
        </>
      )}
    </Modal>
  );
}
