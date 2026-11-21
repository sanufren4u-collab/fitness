'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { UserRole, PaymentMethod, InvoiceStatus, MembershipStatus } from '@prisma/client';
import { addDays, differenceInCalendarDays } from 'date-fns';

const posPaymentSchema = z.object({
  memberProfileId: z.string().min(1),
  planId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().max(300).optional(),
});

export async function recordPosMembershipPaymentAction(rawInput: z.infer<typeof posPaymentSchema>) {
  await requireRole([UserRole.ADMIN]);
  const input = posPaymentSchema.parse(rawInput);

  const result = await prisma.$transaction(async (tx) => {
    const [memberProfile, plan, existingActive] = await Promise.all([
      tx.memberProfile.findUnique({ where: { id: input.memberProfileId } }),
      tx.membershipPlan.findUnique({ where: { id: input.planId } }),
      tx.membership.findFirst({
        where: { memberId: input.memberProfileId, status: MembershipStatus.ACTIVE, endDate: { gt: new Date() } },
        orderBy: { endDate: 'desc' },
      }),
    ]);

    if (!memberProfile) throw new Error('Member profile not found.');
    if (!plan || !plan.isActive) throw new Error('Selected plan is unavailable.');

    const now = new Date();
    const startDate = existingActive ? existingActive.endDate : now;
    const endDate = addDays(startDate, plan.durationDays);

    const membership = await tx.membership.create({
      data: {
        memberId: memberProfile.id,
        planId: plan.id,
        status: MembershipStatus.ACTIVE,
        startDate,
        endDate,
        remainingCredits: plan.classCredits,
        autoRenew: false,
      },
    });

    const invoiceCount = await tx.invoice.count();
    const invoiceNumber = `INV-${now.getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;
    const baseAmount = Number(plan.price);

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        userId: memberProfile.userId,
        membershipId: membership.id,
        amount: baseAmount,
        taxAmount: input.taxAmount,
        totalAmount: baseAmount + input.taxAmount,
        status: InvoiceStatus.PAID,
        paymentMethod: input.paymentMethod,
        paidAt: now,
        notes: input.notes,
      },
    });

    return { membership, invoice };
  });

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/members');
  return { success: true, invoiceNumber: result.invoice.invoiceNumber };
}

export async function toggleMembershipFreezeAction(membershipId: string, action: 'PAUSE' | 'RESUME', reason?: string) {
  const actor = await requireRole([UserRole.ADMIN, UserRole.MEMBER]);

  await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { id: membershipId },
      include: { member: true },
    });

    if (!membership) throw new Error('Membership not found.');
    if (actor.role === UserRole.MEMBER && membership.member.userId !== actor.id) throw new Error('Unauthorized.');

    const settings = await tx.gymSettings.findFirst();
    const maxFreezeDays = settings?.maxFreezeDaysPerYr ?? 30;
    const now = new Date();

    if (action === 'PAUSE') {
      if (membership.status !== MembershipStatus.ACTIVE) throw new Error('Only active memberships can be frozen.');
      if (membership.totalPausedDays >= maxFreezeDays) throw new Error('Maximum freeze days reached.');
      await tx.membership.update({
        where: { id: membershipId },
        data: { status: MembershipStatus.PAUSED, pausedAt: now, pauseReason: reason ?? 'Requested freeze' },
      });
    } else {
      if (membership.status !== MembershipStatus.PAUSED || !membership.pausedAt) throw new Error('Not paused.');
      const pausedDays = Math.max(1, differenceInCalendarDays(now, membership.pausedAt));
      await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: MembershipStatus.ACTIVE,
          pausedAt: null,
          pauseReason: null,
          totalPausedDays: { increment: pausedDays },
          endDate: addDays(membership.endDate, pausedDays),
        },
      });
    }
  });

  revalidatePath('/admin/members');
  revalidatePath('/app');
  return { success: true };
}
