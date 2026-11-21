import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { StaffManagerClient } from '@/components/admin/StaffManagerClient';
import { T } from '@/components/shared/LocaleProvider';

export default async function AdminStaffPage() {
  await requireRole([UserRole.ADMIN]);
  const users = await prisma.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.TRAINER] } },
    include: { trainerProfile: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← <T message="Back to Dashboard" /></Link>
            <h1 className="mt-1 text-2xl font-bold text-white"><T message="Staff & Coaches" /></h1>
          </div>
          <SignOutButton />
        </div>
        <StaffManagerClient
          staff={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            specialties: u.trainerProfile?.specialties ?? [],
          }))}
        />
      </div>
    </div>
  );
}
