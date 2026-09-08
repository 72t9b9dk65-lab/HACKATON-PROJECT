import { notFound, redirect } from 'next/navigation';
import { pageAccess } from '@/lib/platform/page-access';
export const dynamic = 'force-dynamic';
export default async function StaffPage() {
  if ((await pageAccess()).site !== 'staff') notFound();
  redirect('/');
}
