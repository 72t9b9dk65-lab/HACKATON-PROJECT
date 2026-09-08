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
import {
  anchorData,
  sha256,
  verifyProof,
  verifyReceipt,
  documentHashOf,
} from '@/lib/platform/proofs';
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
  allowAnchor = false,
}: {
  proof: Proof | null;
  receipt?: Receipt;
  onClose: () => void;
  onRefresh: () => void;
  allowAnchor?: boolean;
}) {
  const [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [working, setWorking] = useState(false),
    [txHash, setTxHash] = useState('');
  async function checkRecord() {
    if (!proof) return;
    setError('');
    setStatus('');
    const result = receipt
      ? await verifyReceipt(proof, receipt)
      : (await verifyProof(proof))
        ? 'match'
        : 'invalid';
    if (result === 'match')
      setStatus(
        'Verified: the saved fingerprint and the receipt currently displayed match, including products and donor allocations.',
      );
    else if (result === 'legacy')
      setStatus(
        'The original fingerprint is intact. This legacy proof does not cover all current receipt details; staff can register a complete snapshot.',
      );
    else
      setError(
        result === 'mismatch'
          ? 'The displayed receipt differs from the saved proof. Its integrity cannot be confirmed.'
          : 'This proof does not match its own fingerprint.',
      );
  }
  async function checkFile(file: File) {
    if (!proof) return;
    setError('');
    setStatus('');
    const expected = documentHashOf(proof);
    if (!expected) {
      setError('No original document was registered for this record.');
      return;
    }
    if ((await sha256(await file.arrayBuffer())) === expected)
      setStatus('Document verified: its bytes match the registered file.');
    else setError('The document does not match the registered fingerprint.');
  }
  async function confirm(hash = txHash) {
    if (!proof) return;
    setWorking(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/platform/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId: proof.id, txHash: hash }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setStatus(
        'Network verified: this fingerprint is included in a successful Sepolia transaction.',
      );
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification unavailable.');
    } finally {
      setWorking(false);
    }
  }
  async function anchor() {
    if (!proof || !allowAnchor) return;
    setWorking(true);
    setError('');
    setStatus('');
    try {
      if (!(await verifyProof(proof)))
        throw new Error('Cannot anchor a damaged proof.');
      if (receipt && (await verifyReceipt(proof, receipt)) !== 'match')
        throw new Error(
          'Register a complete current snapshot before anchoring.',
        );
      const wallet = (window as unknown as { ethereum?: Wallet }).ethereum;
      if (!wallet)
        throw new Error(
          'Open this page in a browser with an Ethereum wallet to anchor on Sepolia.',
        );
      const accounts = (await wallet.request({
        method: 'eth_requestAccounts',
      })) as string[];
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
        'Submitted to Sepolia. Check confirmation once the network includes it.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet request failed.');
    } finally {
      setWorking(false);
    }
  }
  function download() {
    if (!proof) return;
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ format: 'hundstallet-proof-v1', proof }, null, 2)],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'care-proof-' + proof.seq + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Verify this transaction"
      description="Check the receipt, its allocations and the independent record."
    >
      {!proof ? (
        <Notice>
          This imported record has no registered fingerprint yet. Staff can
          register its current details; this cannot recover a missing original
          receipt.
        </Notice>
      ) : (
        <>
          <div className="cp-proof-summary">
            <Fingerprint size={30} />
            <div>
              <strong>Record #{proof.seq}</strong>
              <p>{dateLabel(proof.at)}</p>
              <span className="cp-tag">
                {proof.anchors.length
                  ? 'Sepolia inclusion confirmed'
                  : 'Local fingerprint · not on-chain'}
              </span>
            </div>
          </div>
          {receipt?.source === 'workbook' && (
            <Notice>
              Imported spreadsheet data
              {!receipt.file ? ' · original receipt unavailable' : ''}.
            </Notice>
          )}
          <div className="cp-proof-steps">
            <p>
              <FileCheck2 size={20} />
              <span>
                <strong>Original receipt</strong>
                {receipt?.file && !receipt.file.restricted ? (
                  <a href={receipt.file.url} target="_blank" rel="noreferrer">
                    Open {receipt.file.name} ↗
                  </a>
                ) : (
                  <small>
                    {receipt?.file?.restricted
                      ? 'Original document held privately by staff. Its fingerprint is included below.'
                      : 'No original document attached.'}
                  </small>
                )}
              </span>
            </p>
            <p>
              <ShieldCheck size={20} />
              <span>
                <strong>Products & allocations</strong>
                <small>
                  Compare the displayed details with their fingerprint.
                </small>
              </span>
              <Button variant="outline" onClick={() => void checkRecord()}>
                Verify
              </Button>
            </p>
          </div>
          <label className="cp-verify-file">
            <Upload size={18} />
            <span>Check a receipt file</span>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) void checkFile(e.target.files[0]);
              }}
            />
          </label>
          {status && <Notice kind="success">{status}</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
          {proof.anchors.map((a) => (
            <div className="gs-anchor" key={a.txHash}>
              <a
                href={'https://sepolia.etherscan.io/tx/' + a.txHash}
                target="_blank"
                rel="noreferrer"
              >
                Sepolia transaction <ExternalLink size={14} />
              </a>
              <Button
                variant="outline"
                disabled={working}
                onClick={() => void confirm(a.txHash)}
              >
                Recheck network
              </Button>
            </div>
          ))}
          {allowAnchor && (
            <details className="cp-details" open={!proof.anchors.length}>
              <summary>Blockchain registration · Sepolia testnet</summary>
              <p>
                Register only the fingerprint. Your wallet approves a zero-value
                transaction; the network fee uses test ETH.
              </p>
              <Primary
                disabled={working || !!proof.anchors.length}
                onClick={() => void anchor()}
              >
                <Link2 size={16} />
                {working
                  ? 'Working…'
                  : proof.anchors.length
                    ? 'Already registered'
                    : 'Connect wallet & anchor'}
              </Primary>
              <label className="cp-field">
                Submitted transaction hash
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
                Check confirmation
              </Button>
            </details>
          )}
          <details className="cp-details">
            <summary>Fingerprint & downloadable proof</summary>
            <code className="cp-hash">{proof.hash}</code>
            <pre className="cp-code">
              {JSON.stringify(proof.payload, null, 2)}
            </pre>
            <Button variant="outline" onClick={download}>
              <Download size={16} /> Download proof
            </Button>
          </details>
          <p className="cp-fine-print">
            A blockchain record proves inclusion of a fingerprint, not that a
            purchase or care event occurred. Staff access and blockchain
            transaction signatures are separate checks.
          </p>
        </>
      )}
    </Modal>
  );
}
