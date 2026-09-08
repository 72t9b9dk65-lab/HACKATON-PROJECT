import type { Metadata } from 'next';
import VerifyWorkspace from '@/components/platform/verify-workspace';
export const metadata: Metadata = {
  title: 'Verify a care record',
  description:
    'Independently check exported care records and original receipt fingerprints.',
};
export default function VerifyPage() {
  return <VerifyWorkspace />;
}
