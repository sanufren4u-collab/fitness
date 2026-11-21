import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.isPlatformAdmin && !session.user.vendorId) redirect('/admin/vendors');
  if (session.user.role === 'ADMIN') redirect('/admin/dashboard');
  if (session.user.role === 'TRAINER') redirect('/trainer/dashboard');
  redirect('/app');
}
