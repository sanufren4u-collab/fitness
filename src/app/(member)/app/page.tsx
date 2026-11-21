import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { MemberPassCard } from '@/components/member/MemberPassCard';
import { ClassSessionCard } from '@/components/member/ClassSessionCard';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { T } from '@/components/shared/LocaleProvider';

export default async function MemberHomePage() {
  const user = await requireRole([UserRole.MEMBER, UserRole.ADMIN]);
  if (user.isPlatformAdmin) redirect('/admin/dashboard');
  if (!user.vendorId) redirect('/admin/vendors');

  const [membership, upcomingSessions, workoutPlan] = await Promise.all([
    user.memberProfile
      ? prisma.membership.findFirst({
          where: { memberId: user.memberProfile.id, vendorId: user.vendorId },
          orderBy: { endDate: 'desc' },
          include: { plan: true },
        })
      : null,
    prisma.classSession.findMany({
      where: { vendorId: user.vendorId, startTime: { gte: new Date() }, isCancelled: false },
      include: {
        trainer: { include: { user: true } },
        bookings: { where: { vendorId: user.vendorId, status: 'CONFIRMED' } },
      },
      orderBy: { startTime: 'asc' },
      take: 4,
    }),
    user.memberProfile
      ? prisma.workoutPlan.findFirst({
          where: { memberId: user.memberProfile.id, vendorId: user.vendorId, isActive: true },
        })
      : null,
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <div className="mx-auto max-w-lg space-y-6 pb-16">
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-white"><T message="{name} Member" values={{ name: user.vendor?.name ?? '' }} /></span>
          <SignOutButton />
        </div>

        <MemberPassCard
          memberName={user.name}
          qrSecretToken={user.qrSecretToken}
          planName={membership?.plan.name ?? 'No Active Plan'}
          status={membership?.status ?? 'EXPIRED'}
          endDateFormatted={membership ? new Date(membership.endDate).toISOString() : null}
          remainingCredits={membership?.remainingCredits ?? null}
        />

        {workoutPlan && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-rose-400"><T message="Assigned Routine" /></span>
            <h2 className="mt-1 text-lg font-bold text-white">{workoutPlan.title}</h2>
            <p className="text-xs text-zinc-400">{workoutPlan.goal}</p>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white"><T message="Upcoming Classes" /></h2>
          {upcomingSessions.map((s) => {
            const myBooking = s.bookings.find((b) => b.userId === user.id);
            return (
              <ClassSessionCard
                key={s.id}
                session={{
                  id: s.id,
                  title: s.title,
                  category: s.category,
                  room: s.room,
                  trainerName: s.trainer.user.name,
                  startTime: new Date(s.startTime).toISOString(),
                  endTime: new Date(s.endTime).toISOString(),
                  capacity: s.capacity,
                  confirmedCount: s.bookings.length,
                  userBookingId: myBooking?.id ?? null,
                  userBookingStatus: myBooking ? 'CONFIRMED' : null,
                }}
              />
            );
          })}
        </section>
      </div>
    </div>
  );
}
