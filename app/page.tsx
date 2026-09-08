import DonationShell from '@/components/platform/donor-workspace';
import StaffWorkspace from '@/components/platform/staff-workspace';
import { pageAccess } from '@/lib/platform/page-access';
import { bindings } from '@/lib/platform/storage';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const access = await pageAccess();
  if (!access.principal && (!access.demo || access.site === 'staff'))
    redirect('/signin');
  return access.site === 'staff' ? (
    <StaffWorkspace />
  ) : (
    <DonationShell
      staffWorkspaceUrl={
        bindings().CARE_STAFF_ORIGIN || 'http://127.0.0.1:3002'
      }
    />
  );
}
