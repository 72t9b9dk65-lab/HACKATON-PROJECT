import type { Metadata } from 'next';
import StaffPortal from '@/components/staff-portal';

export const metadata: Metadata = {
  title: 'Hundstallet staff — Care & receipts',
  description:
    'Local staff prototype for donor portfolios, receipt allocations and dog photo updates.',
};
export default function StaffPage() {
  return <StaffPortal />;
}
