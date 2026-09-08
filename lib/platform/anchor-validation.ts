import { anchorData } from './proofs.ts';
type ChainRecord = Record<string, string> | null;
export function validateAnchorResponse(
  hash: string,
  txHash: string,
  chainId: string,
  tx: ChainRecord,
  receipt: ChainRecord,
) {
  const lower = (value: string | undefined) => value?.toLowerCase();
  if (BigInt(chainId) !== BigInt(11155111))
    throw new Error('The RPC returned the wrong network.');
  if (!tx || !receipt)
    throw new Error('The transaction is still pending or was not found.');
  if (
    !/^0x[0-9a-f]+$/i.test(receipt.status ?? '') ||
    BigInt(receipt.status) !== BigInt(1)
  )
    throw new Error('The blockchain transaction did not succeed.');
  if (
    lower(tx.hash) !== lower(txHash) ||
    lower(receipt.transactionHash) !== lower(txHash)
  )
    throw new Error('The network returned a different transaction.');
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(tx.blockHash ?? '') ||
    !/^0x[0-9a-fA-F]{64}$/.test(receipt.blockHash ?? '') ||
    lower(tx.blockHash) !== lower(receipt.blockHash)
  )
    throw new Error(
      'The transaction and receipt do not identify the same block.',
    );
  if (lower(tx.input) !== anchorData(hash))
    throw new Error(
      'The transaction does not contain this record’s fingerprint.',
    );
  if (
    !/^0x[0-9a-f]+$/i.test(receipt.blockNumber ?? '') ||
    BigInt(receipt.blockNumber) < BigInt(1) ||
    BigInt(receipt.blockNumber) > BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error('The confirmed block number is invalid.');
  if (!tx.blockNumber || BigInt(tx.blockNumber) !== BigInt(receipt.blockNumber))
    throw new Error('The transaction block number does not match its receipt.');
  return Number(BigInt(receipt.blockNumber));
}
