import Link from 'next/link';
import { requireVendorAdmin } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { ScheduleManagerClient } from '@/components/admin/ScheduleManagerClient';
import { T } from '@/components/shared/LocaleProvider';

export default async function AdminSchedulePage() {
  const admin = await requireVendorAdmin();

  const [sessions, trainers] = await Promise.all([
    prisma.classSession.findMany({
      where: { vendorId: admin.vendorId },
      include: {
        trainer: { include: { user: true } },
        bookings: { where: { vendorId: admin.vendorId, status: 'CONFIRMED' } },
      },
      orderBy: { startTime: 'desc' },
      take: 20,
    }),
    prisma.trainerProfile.findMany({ where: { vendorId: admin.vendorId }, include: { user: true } }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← <T message="Back to Dashboard" /></Link>
            <h1 className="mt-1 text-2xl font-bold text-white"><T message="Master Class Schedule" /></h1>
          </div>
          <SignOutButton />
        </div>
        <ScheduleManagerClient
          sessions={sessions.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category,
            room: s.room,
            trainerName: s.trainer.user.name,
            startTime: new Date(s.startTime).toISOString(),
            capacity: s.capacity,
            bookedCount: s.bookings.length,
            isCancelled: s.isCancelled,
          }))}
          trainers={trainers.map((t) => ({ id: t.id, name: t.user.name }))}
        />
      </div>
    </div>
  );
}
