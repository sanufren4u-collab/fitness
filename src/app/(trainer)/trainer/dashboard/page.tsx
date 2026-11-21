import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { LocaleDate, T } from '@/components/shared/LocaleProvider';

export default async function TrainerDashboardPage() {
  const user = await requireRole([UserRole.TRAINER, UserRole.ADMIN]);

  const trainer = user.trainerProfile
    ? await prisma.trainerProfile.findUnique({
        where: { id: user.trainerProfile.id },
        include: {
          assignedMembers: { include: { user: true } },
          classesTaught: {
            where: { startTime: { gte: new Date() } },
            include: { bookings: { where: { status: 'CONFIRMED' } } },
            orderBy: { startTime: 'asc' },
          },
        },
      })
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white"><T message="Trainer Coaching Workspace" /></h1>
            <p className="text-sm text-zinc-400"><T message="Coach {name}" values={{ name: user.name }} /></p>
          </div>
          <SignOutButton />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold text-white"><T message="Assigned Clients ({count})" values={{ count: trainer?.assignedMembers.length ?? 0 }} /></h2>
            <ul className="mt-4 space-y-3">
              {trainer?.assignedMembers.map((c) => (
                <li key={c.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
                  <p className="font-semibold text-white">{c.user.name}</p>
                  <p className="text-xs text-zinc-400">{c.fitnessGoal ? <T message="Goal: {goal}" values={{ goal: c.fitnessGoal }} /> : <><T message="Goal:" /> <T message="General Fitness" /></>}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold text-white"><T message="Upcoming Classes Taught" /></h2>
            <ul className="mt-4 space-y-3">
              {trainer?.classesTaught.map((cls) => (
                <li key={cls.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
                  <p className="font-semibold text-white">{cls.title}</p>
                  <p className="text-xs text-zinc-400">
                    <LocaleDate value={cls.startTime.toISOString()} /> · <T message="{count}/{capacity} booked" values={{ count: cls.bookings.length, capacity: cls.capacity }} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
