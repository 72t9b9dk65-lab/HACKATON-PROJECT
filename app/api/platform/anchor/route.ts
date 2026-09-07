import {
  readWorkspace,
  saveWorkspace,
  localOnly,
} from '@/lib/platform/storage';
import { anchorData } from '@/lib/platform/proofs';
import { applyAction } from '@/lib/platform/model';
async function rpc(method: string, params: unknown[]) {
  const response = await fetch('https://ethereum-sepolia-rpc.publicnode.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json()) as {
    result?: Record<string, string>;
    error?: unknown;
  };
  if (!response.ok || data.error)
    throw new Error(
      'The testnet could not be reached. Your local record is safe.',
    );
  return data.result;
}
export async function POST(request: Request) {
  try {
    localOnly(request);
    const { proofId, txHash } = (await request.json()) as {
      proofId: string;
      txHash: string;
    };
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash))
      throw new Error('Enter a valid testnet transaction hash.');
    const current = await readWorkspace();
    const proof = current.proofs.find((p) => p.id === proofId);
    if (!proof) throw new Error('Record not found.');
    const [tx, receipt] = await Promise.all([
      rpc('eth_getTransactionByHash', [txHash]),
      rpc('eth_getTransactionReceipt', [txHash]),
    ]);
    if (
      !tx ||
      !receipt ||
      receipt.status !== '0x1' ||
      tx.input?.toLowerCase() !== anchorData(proof.hash) ||
      !receipt.blockNumber
    )
      throw new Error(
        'The transaction is not confirmed or does not contain this record’s fingerprint.',
      );
    const next = applyAction(
      current,
      {
        type: 'anchor',
        proofId,
        txHash,
        chainId: '0xaa36a7',
        blockNumber: parseInt(receipt.blockNumber, 16),
      },
      new Date().toISOString(),
      [],
    );
    return Response.json(await saveWorkspace(next, current.revision));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not verify the testnet record.',
      },
      { status: 400 },
    );
  }
}
