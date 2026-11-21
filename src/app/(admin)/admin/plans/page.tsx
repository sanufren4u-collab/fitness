import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { PlansManagerClient } from '@/components/admin/PlansManagerClient';
import { T } from '@/components/shared/LocaleProvider';

export default async function AdminPlansPage() {
  await requireRole([UserRole.ADMIN]);
  const plans = await prisma.membershipPlan.findMany({ orderBy: { price: 'asc' } });

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← <T message="Back to Dashboard" /></Link>
            <h1 className="mt-1 text-2xl font-bold text-white"><T message="Membership Plans & Pricing" /></h1>
          </div>
          <SignOutButton />
        </div>
        <PlansManagerClient
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? '',
            price: Number(p.price),
            interval: p.interval,
            durationDays: p.durationDays,
            classCredits: p.classCredits,
            isActive: p.isActive,
          }))}
        />
      </div>
    </div>
  );
}
