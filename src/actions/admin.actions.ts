'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import {
  UserRole,
  BillingInterval,
  MembershipStatus,
  PaymentMethod,
  InvoiceStatus,
} from '@prisma/client';
import { addDays } from 'date-fns';

// 1. CREATE MEMBER + INITIAL PLAN + POS INVOICE
const createMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).default('Password123!'),
  fitnessGoal: z.string().optional(),
  emailNotifications: z.boolean().default(true),
  whatsappNotifications: z.boolean().default(true),
  assignedTrainerId: z.string().optional(),
  planId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.UPI),
});

export async function createMemberAction(raw: z.infer<typeof createMemberSchema>) {
  try {
    await requireRole([UserRole.ADMIN]);
    const input = createMemberSchema.parse(raw);
    const email = input.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, error: 'A user with this email already exists.' };

    const passwordHash = await hash(input.password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name.trim(),
          email,
          phone: input.phone?.trim() || null,
          passwordHash,
          role: UserRole.MEMBER,
          memberProfile: {
            create: {
              fitnessGoal: input.fitnessGoal?.trim() || null,
              emailNotifications: input.emailNotifications,
              whatsappNotifications: input.whatsappNotifications,
              assignedTrainerId: input.assignedTrainerId || null,
            },
          },
        },
        include: { memberProfile: true },
      });

      if (input.planId && user.memberProfile) {
        const plan = await tx.membershipPlan.findUnique({ where: { id: input.planId } });
        if (plan) {
          const now = new Date();
          const membership = await tx.membership.create({
            data: {
              memberId: user.memberProfile.id,
              planId: plan.id,
              status: MembershipStatus.ACTIVE,
              startDate: now,
              endDate: addDays(now, plan.durationDays),
              remainingCredits: plan.classCredits,
              autoRenew: false,
            },
          });

          const count = await tx.invoice.count();
          await tx.invoice.create({
            data: {
              invoiceNumber: `INV-${now.getFullYear()}-${String(count + 1).padStart(5, '0')}`,
              userId: user.id,
              membershipId: membership.id,
              amount: plan.price,
              taxAmount: 0,
              totalAmount: plan.price,
              status: InvoiceStatus.PAID,
              paymentMethod: input.paymentMethod,
              paidAt: now,
              notes: 'New member onboarding',
            },
          });
        }
      }
    });

    revalidatePath('/admin/members');
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create member.' };
  }
}

// 2. UPDATE MEMBER PROFILE
const updateMemberSchema = z.object({
  userId: z.string().min(1),
  memberProfileId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  fitnessGoal: z.string().optional(),
  emailNotifications: z.boolean(),
  whatsappNotifications: z.boolean(),
  assignedTrainerId: z.string().optional(),
  isActive: z.boolean(),
});

export async function updateMemberAction(raw: z.infer<typeof updateMemberSchema>) {
  try {
    await requireRole([UserRole.ADMIN]);
    const input = updateMemberSchema.parse(raw);
    const email = input.email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({
      where: { email, id: { not: input.userId } },
    });
    if (existing) return { success: false, error: 'A user with this email already exists.' };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: input.userId },
        data: {
          name: input.name.trim(),
          email,
          phone: input.phone?.trim() || null,
          isActive: input.isActive,
        },
      }),
      prisma.memberProfile.update({
        where: { id: input.memberProfileId },
        data: {
          fitnessGoal: input.fitnessGoal?.trim() || null,
          emailNotifications: input.emailNotifications,
          whatsappNotifications: input.whatsappNotifications,
          assignedTrainerId: input.assignedTrainerId || null,
        },
      }),
    ]);

    revalidatePath('/admin/members');
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update member.' };
  }
}

// 3. DELETE MEMBER
export async function deleteMemberAction(userId: string) {
  try {
    await requireRole([UserRole.ADMIN]);
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/admin/members');
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Cannot delete user with existing invoices; deactivate instead.' };
  }
}

// 4. CREATE / UPDATE / TOGGLE MEMBERSHIP PLANS
const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  interval: z.nativeEnum(BillingInterval),
  durationDays: z.coerce.number().int().min(1),
  classCredits: z.coerce.number().int().min(1).nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function upsertPlanAction(raw: z.infer<typeof planSchema>) {
  try {
    await requireRole([UserRole.ADMIN]);
    const input = planSchema.parse(raw);

    if (input.id) {
      await prisma.membershipPlan.update({
        where: { id: input.id },
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          price: input.price,
          interval: input.interval,
          durationDays: input.durationDays,
          classCredits: input.classCredits ?? null,
          isActive: input.isActive,
        },
      });
    } else {
      await prisma.membershipPlan.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          price: input.price,
          interval: input.interval,
          durationDays: input.durationDays,
          classCredits: input.classCredits ?? null,
          isActive: input.isActive,
        },
      });
    }

    revalidatePath('/admin/plans');
    revalidatePath('/admin/members');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save plan.' };
  }
}

// 5. CREATE / CANCEL CLASS SESSIONS
const classSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2),
  room: z.string().min(2),
  trainerId: z.string().min(1),
  startTime: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(15).default(60),
  capacity: z.coerce.number().int().min(1).default(16),
});

export async function createClassSessionAction(raw: z.infer<typeof classSchema>) {
  try {
    await requireRole([UserRole.ADMIN]);
    const input = classSchema.parse(raw);
    const start = new Date(input.startTime);
    const end = new Date(start.getTime() + input.durationMinutes * 60 * 1000);

    await prisma.classSession.create({
      data: {
        title: input.title.trim(),
        category: input.category.trim(),
        room: input.room.trim(),
        trainerId: input.trainerId,
        startTime: start,
        endTime: end,
        capacity: input.capacity,
      },
    });

    revalidatePath('/admin/schedule');
    revalidatePath('/app');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to schedule class.' };
  }
}

export async function toggleCancelClassAction(sessionId: string, isCancelled: boolean) {
  try {
    await requireRole([UserRole.ADMIN]);
    await prisma.classSession.update({
      where: { id: sessionId },
      data: { isCancelled },
    });
    revalidatePath('/admin/schedule');
    revalidatePath('/app');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update class.' };
  }
}

// 6. CREATE STAFF / TRAINER
const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['TRAINER', 'ADMIN']),
  specialties: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
});

export async function createStaffAction(raw: z.infer<typeof staffSchema>) {
  try {
    await requireRole([UserRole.ADMIN]);
    const input = staffSchema.parse(raw);
    const email = input.email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return { success: false, error: 'Email already registered.' };

    const passwordHash = await hash('Password123!', 12);
    const specialtiesArr = input.specialties
      ? input.specialties.split(',').map((s) => s.trim()).filter(Boolean)
      : ['General Strength'];

    await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        phone: input.phone?.trim() || null,
        passwordHash,
        role: input.role,
        ...(input.role === 'TRAINER'
          ? {
              trainerProfile: {
                create: {
                  specialties: specialtiesArr,
                  certifications: ['Certified Coach'],
                  hourlyRate: input.hourlyRate ?? 1000,
                },
              },
            }
          : {}),
      },
    });

    revalidatePath('/admin/staff');
    revalidatePath('/admin/members');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create staff.' };
  }
}
