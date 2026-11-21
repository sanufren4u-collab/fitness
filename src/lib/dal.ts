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
    include: { memberProfile: true, trainerProfile: true },
  });

  if (!user || !user.isActive) return null;
  return user;
});

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!allowedRoles.includes(user.role)) redirect('/unauthorized');
  return user;
}
