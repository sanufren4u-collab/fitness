'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { UserRole, MembershipStatus, BookingStatus } from '@prisma/client';

export async function bookClassAction(sessionId: string) {
  try {
    const user = await requireRole([UserRole.MEMBER, UserRole.ADMIN]);
    if (!user.memberProfile) return { success: false, error: 'Member profile not found.' };
    const memberProfileId = user.memberProfile.id;

    await prisma.$transaction(async (tx) => {
      const lockedSessions = await tx.$queryRaw<
        Array<{ id: string; startTime: Date; endTime: Date; capacity: number; isCancelled: boolean }>
      >`SELECT id, "startTime", "endTime", capacity, "isCancelled" FROM "ClassSession" WHERE id = ${sessionId} FOR UPDATE`;

      const session = lockedSessions[0];
      if (!session) throw new Error('Class session does not exist.');
      if (session.isCancelled) throw new Error('This class session has been cancelled.');
      if (new Date(session.startTime) <= new Date()) throw new Error('Class has already started.');

      const activeMembership = await tx.membership.findFirst({
        where: {
          memberId: memberProfileId,
          status: MembershipStatus.ACTIVE,
          endDate: { gte: session.startTime },
          OR: [{ remainingCredits: null }, { remainingCredits: { gt: 0 } }],
        },
        orderBy: { endDate: 'desc' },
      });

      if (!activeMembership) throw new Error('No active membership or credits valid for this date.');

      const overlapping = await tx.classBooking.findFirst({
        where: {
          userId: user.id,
          status: BookingStatus.CONFIRMED,
          session: { startTime: { lt: session.endTime }, endTime: { gt: session.startTime } },
        },
      });
      if (overlapping) throw new Error('Overlapping class booking detected.');

      const confirmedCount = await tx.classBooking.count({
        where: { sessionId, status: BookingStatus.CONFIRMED },
      });
      if (confirmedCount >= session.capacity) throw new Error('Class reached full capacity.');

      await tx.classBooking.upsert({
        where: { sessionId_userId: { sessionId, userId: user.id } },
        update: { status: BookingStatus.CONFIRMED, bookedAt: new Date() },
        create: { sessionId, userId: user.id, status: BookingStatus.CONFIRMED },
      });

      if (activeMembership.remainingCredits !== null) {
        await tx.membership.update({
          where: { id: activeMembership.id },
          data: { remainingCredits: { decrement: 1 } },
        });
      }
    });

    revalidatePath('/app');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to book class.' };
  }
}

export async function cancelBookingAction(bookingId: string) {
  try {
    const user = await requireRole([UserRole.MEMBER, UserRole.ADMIN]);

    await prisma.$transaction(async (tx) => {
      const booking = await tx.classBooking.findUnique({
        where: { id: bookingId },
        include: { session: true },
      });

      if (!booking) throw new Error('Booking not found.');
      if (booking.userId !== user.id && user.role !== UserRole.ADMIN) throw new Error('Unauthorized.');
      if (booking.status !== BookingStatus.CONFIRMED) throw new Error('Booking not active.');

      const settings = await tx.gymSettings.findFirst();
      const cutoffHours = settings?.cancellationWindowH ?? 4;
      const cutoffTime = new Date(booking.session.startTime.getTime() - cutoffHours * 60 * 60 * 1000);
      const isRefundable = new Date() <= cutoffTime;

      await tx.classBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });

      if (isRefundable && user.memberProfile) {
        const creditMem = await tx.membership.findFirst({
          where: {
            memberId: user.memberProfile.id,
            status: MembershipStatus.ACTIVE,
            remainingCredits: { not: null },
          },
          orderBy: { endDate: 'desc' },
        });
        if (creditMem) {
          await tx.membership.update({
            where: { id: creditMem.id },
            data: { remainingCredits: { increment: 1 } },
          });
        }
      }
    });

    revalidatePath('/app');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel.' };
  }
}
