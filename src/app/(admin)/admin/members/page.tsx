import Link from 'next/link';
import { requireVendorAdmin } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { MembersManagerClient } from '@/components/admin/MembersManagerClient';
import { T } from '@/components/shared/LocaleProvider';

export default async function AdminMembersPage() {
  const admin = await requireVendorAdmin();

  const [members, plans, trainers] = await Promise.all([
    prisma.memberProfile.findMany({
      where: { vendorId: admin.vendorId },
      include: {
        user: true,
        assignedTrainer: { include: { user: true } },
        memberships: {
          where: { vendorId: admin.vendorId },
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.membershipPlan.findMany({ where: { vendorId: admin.vendorId, isActive: true }, orderBy: { price: 'asc' } }),
    prisma.trainerProfile.findMany({ where: { vendorId: admin.vendorId }, include: { user: true } }),
  ]);

  const serializedMembers = members.map((m) => {
    const active = m.memberships[0];
    return {
      userId: m.userId,
      memberProfileId: m.id,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone ?? '',
      isActive: m.user.isActive,
      qrSecretToken: m.user.qrSecretToken,
      fitnessGoal: m.fitnessGoal ?? '',
      emailNotifications: m.emailNotifications,
      whatsappNotifications: m.whatsappNotifications,
      assignedTrainerId: m.assignedTrainerId ?? '',
      assignedTrainerName: m.assignedTrainer?.user.name ?? '',
      latestMembership: active
        ? {
            id: active.id,
            planName: active.plan.name,
            status: active.status,
            endDate: new Date(active.endDate).toISOString(),
          }
        : null,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← <T message="Back to Dashboard" /></Link>
          <SignOutButton />
        </div>

        <MembersManagerClient
          members={serializedMembers}
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            durationDays: p.durationDays,
          }))}
          trainers={trainers.map((t) => ({ id: t.id, name: t.user.name }))}
        />
      </div>
    </div>
  );
}
