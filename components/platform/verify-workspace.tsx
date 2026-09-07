'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileCheck2,
  Fingerprint,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { verifyChain, verifyProof, sha256 } from '@/lib/platform/proofs';
import type { Proof } from '@/lib/platform/types';
import { Header, Footer, Notice, dateLabel } from './shared';
export default function VerifyWorkspace() {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [documentResult, setDocumentResult] = useState('');
  async function read(file: File | undefined) {
    if (!file) return;
    setChecking(true);
    setError('');
    setMessage('');
    setProofs([]);
    setDocumentResult('');
    try {
      if (file.size > 4_000_000)
        throw new Error('Use a proof file smaller than 4 MB.');
      const parsed = JSON.parse(await file.text()) as {
        proof?: Proof;
        proofs?: Proof[];
      };
      const records = parsed.proof ? [parsed.proof] : parsed.proofs;
      if (!Array.isArray(records) || !records.length || records.length > 3000)
        throw new Error(
          'Choose an exported care proof or care-records JSON file.',
        );
      if (
        records.some(
          (p) =>
            !p ||
            typeof p.hash !== 'string' ||
            typeof p.previousHash !== 'string' ||
            !p.payload ||
            typeof p.payload !== 'object' ||
            !Array.isArray(p.anchors),
        )
      )
        throw new Error('The proof file is incomplete.');
      const verified =
        records.length === 1
          ? await verifyProof(records[0])
          : await verifyChain(records);
      if (!verified)
        throw new Error(
          'Verification failed. A record, amount or fingerprint chain has changed.',
        );
      setProofs(records);
      setMessage(
        records.length === 1
          ? 'The exported record matches its SHA-256 fingerprint.'
          : 'Every record matches, and the complete fingerprint chain is intact.',
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'This proof could not be verified.',
      );
    } finally {
      setChecking(false);
    }
  }
  async function checkDocument(file: File | undefined) {
    if (!file) return;
    setError('');
    setDocumentResult('');
    if (file.size > 12_000_000) {
      setError('Use a document smaller than 12 MB.');
      return;
    }
    const hash = await sha256(await file.arrayBuffer());
    const match = proofs.find((p) => p.payload.documentHash === hash);
    if (match) setDocumentResult(`Document matches care record #${match.seq}.`);
    else
      setError(
        'The document does not match any receipt fingerprint in this export.',
      );
  }
  return (
    <div className="care-platform">
      <Header showSync={false} />
      <main className="cp-verifier">
        <Link href="/" className="cp-text-link">
          <ArrowLeft size={16} /> Back to my shelter
        </Link>
        <div className="cp-verify-intro">
          <Fingerprint size={43} />
          <span className="cp-eyebrow">EVIDENCE YOU CAN TAKE WITH YOU</span>
          <h1>Trust, with a way to check.</h1>
          <p>
            Verify an exported care record and compare it with an original
            receipt. The checks run on your device; these files are not
            uploaded.
          </p>
        </div>
        <div className="cp-verifier-card">
          <label className="cp-upload-zone">
            <UploadCloud size={29} />
            <strong>
              {checking
                ? 'Checking the fingerprint…'
                : 'Choose an exported care proof'}
            </strong>
            <span>Care proof or care-records JSON · up to 4 MB</span>
            <span className="cp-file-picker">
              Choose proof file
              <input
                aria-label="Exported care proof JSON"
                type="file"
                accept="application/json,.json"
                disabled={checking}
                onChange={(e) => void read(e.target.files?.[0])}
              />
            </span>
          </label>
          {message && <Notice kind="success">{message}</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
          {proofs.length > 0 && (
            <>
              <div className="cp-proof-result">
                <ShieldCheck size={30} />
                <div>
                  <h2>
                    {proofs.length} verified{' '}
                    {proofs.length === 1 ? 'record' : 'records'}
                  </h2>
                  <p>Latest entry: {dateLabel(proofs.at(-1)!.at)}</p>
                </div>
              </div>
              <label className="cp-verify-file">
                <FileCheck2 size={19} />
                <span>Compare an original receipt document</span>
                <input
                  type="file"
                  aria-label="Original receipt to verify"
                  onChange={(e) => void checkDocument(e.target.files?.[0])}
                />
              </label>
              {documentResult && (
                <Notice kind="success">{documentResult}</Notice>
              )}
              <details className="cp-details">
                <summary>Inspect the verified records</summary>
                {proofs.map((p) => (
                  <div className="cp-verified-record" key={p.id}>
                    <strong>
                      #{p.seq} · {String(p.payload.kind)}
                    </strong>
                    <code className="cp-hash">{p.hash}</code>
                    <span>{dateLabel(p.at)}</span>
                    {p.anchors.map((anchor) => (
                      <a
                        key={anchor.txHash}
                        target="_blank"
                        rel="noreferrer"
                        href={`https://sepolia.etherscan.io/tx/${anchor.txHash}`}
                      >
                        Inspect claimed Sepolia anchor ↗
                      </a>
                    ))}
                  </div>
                ))}
              </details>
            </>
          )}
          <p className="cp-fine-print">
            Matching fingerprints check the export’s internal integrity. To
            detect a rewritten export independently, compare its fingerprint
            with a trusted external anchor. It does not independently prove that
            care took place. An external testnet anchor provides a separately
            checkable timestamp; anchor claims in an imported file need to be
            checked on the network.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
