import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberProfile: true, trainerProfile: true, vendor: true },
  });

  if (!user || !user.isActive || (!user.isPlatformAdmin && !user.vendor?.isActive)) return null;
  return user;
});

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!allowedRoles.includes(user.role)) redirect('/unauthorized');
  return user;
}

type ScopedVendorAdmin = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & {
  vendorId: string;
  vendor: NonNullable<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>['vendor']>;
};

export async function requireVendorAdmin(): Promise<ScopedVendorAdmin> {
  const user = await requireRole([UserRole.ADMIN]);
  const vendorId = user.vendorId;
  const vendor = user.vendor;
  if (!vendorId || !vendor?.isActive) redirect('/unauthorized');
  return { ...user, vendorId, vendor };
}

export async function requirePlatformAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isPlatformAdmin) redirect('/unauthorized');
  return user;
}
