import type { Metadata } from 'next';
import StaffWorkspace from '@/components/platform/staff-workspace';

export const metadata: Metadata = {
  title: 'Hundstallet staff — Care & receipts',
  description:
    'Local staff prototype for donor portfolios, receipt allocations and dog photo updates.',
};
export default function StaffPage() {
  return <StaffWorkspace />;
}
