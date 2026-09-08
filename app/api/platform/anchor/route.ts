import {
  readWorkspace,
  saveWorkspace,
  localOnly,
} from '@/lib/platform/storage';
import { verifyProof } from '@/lib/platform/proofs';
import { validateAnchorResponse } from '@/lib/platform/anchor-validation';
import { applyAction } from '@/lib/platform/model';
async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch('https://ethereum-sepolia-rpc.publicnode.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await response.json()) as { result?: unknown; error?: unknown };
  if (!response.ok || data.error)
    throw new Error(
      'The testnet is unavailable. No confirmation was recorded.',
    );
  return data.result;
}
export async function POST(request: Request) {
  try {
    localOnly(request);
    const { proofId, txHash: input } = (await request.json()) as {
      proofId: string;
      txHash: string;
    };
    if (typeof input !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(input))
      throw new Error('Enter a valid testnet transaction hash.');
    const txHash = input.toLowerCase(),
      current = await readWorkspace(),
      proof = current.proofs.find((p) => p.id === proofId);
    if (!proof || !(await verifyProof(proof)))
      throw new Error('The local proof is missing or invalid.');
    const [chain, tx, receipt] = await Promise.all([
      rpc('eth_chainId', []),
      rpc('eth_getTransactionByHash', [txHash]),
      rpc('eth_getTransactionReceipt', [txHash]),
    ]);
    const blockNumber = validateAnchorResponse(
      proof.hash,
      txHash,
      String(chain),
      tx as Record<string, string> | null,
      receipt as Record<string, string> | null,
    );
    const latest = await readWorkspace(),
      latestProof = latest.proofs.find((p) => p.id === proofId);
    if (
      !latestProof ||
      latestProof.hash !== proof.hash ||
      !(await verifyProof(latestProof))
    )
      throw new Error('The local proof changed during verification.');
    if (latestProof.anchors.some((a) => a.txHash.toLowerCase() === txHash))
      return Response.json(latest);
    const next = applyAction(
      latest,
      { type: 'anchor', proofId, txHash, chainId: '0xaa36a7', blockNumber },
      new Date().toISOString(),
      [],
    );
    return Response.json(await saveWorkspace(next, latest.revision));
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Could not verify the network record.';
    return Response.json(
      {
        error:
          message === 'CONFLICT'
            ? 'The workspace changed. Retry confirmation.'
            : message,
      },
      { status: message === 'CONFLICT' ? 409 : 400 },
    );
  }
}
