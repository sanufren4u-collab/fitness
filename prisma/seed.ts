import { PrismaClient, UserRole, BillingInterval, MembershipStatus, PaymentMethod, InvoiceStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.gymSettings.upsert({
    where: { id: 'default-settings' },
    update: { gymName: 'Power Gym' },
    create: {
      id: 'default-settings',
      gymName: 'Power Gym',
      brandPrimaryHex: '#E11D48',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      cancellationWindowH: 4,
      maxFreezeDaysPerYr: 30,
    },
  });

  const passwordHash = await hash('Password123!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@ironpulse.io' },
    update: {},
    create: {
      email: 'admin@ironpulse.io',
      name: 'Vikram Rathore',
      phone: '+919876543210',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const trainerUser = await prisma.user.upsert({
    where: { email: 'coach@ironpulse.io' },
    update: {},
    create: {
      email: 'coach@ironpulse.io',
      name: 'Ananya Sharma',
      phone: '+919876543211',
      passwordHash,
      role: UserRole.TRAINER,
      trainerProfile: {
        create: {
          bio: 'CSCS Certified Strength & Conditioning Specialist.',
          specialties: ['Strength & Hypertrophy', 'Olympic Lifting'],
          certifications: ['NSCA-CSCS'],
          hourlyRate: 1500.0,
        },
      },
    },
    include: { trainerProfile: true },
  });

  const monthlyPlan = await prisma.membershipPlan.upsert({
    where: { id: 'plan-pro-monthly' },
    update: {},
    create: {
      id: 'plan-pro-monthly',
      name: 'Pro All-Access Monthly',
      description: 'Unlimited gym floor access and group classes.',
      price: 3500.0,
      interval: BillingInterval.MONTHLY,
      durationDays: 30,
      classCredits: null,
      includesPT: false,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@ironpulse.io' },
    update: {},
    create: {
      email: 'member@ironpulse.io',
      name: 'Rohan Verma',
      phone: '+919876543212',
      passwordHash,
      role: UserRole.MEMBER,
      memberProfile: {
        create: {
          fitnessGoal: 'Build 4kg lean muscle mass',
          assignedTrainerId: trainerUser.trainerProfile!.id,
        },
      },
    },
    include: { memberProfile: true },
  });

  const now = new Date();
  const existingMem = await prisma.membership.findFirst({ where: { memberId: memberUser.memberProfile!.id } });
  if (!existingMem) {
    const membership = await prisma.membership.create({
      data: {
        memberId: memberUser.memberProfile!.id,
        planId: monthlyPlan.id,
        status: MembershipStatus.ACTIVE,
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-00001',
        userId: memberUser.id,
        membershipId: membership.id,
        amount: 3500.0,
        taxAmount: 0,
        totalAmount: 3500.0,
        currency: 'INR',
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.UPI,
        paidAt: now,
      },
    });

    await prisma.workoutPlan.create({
      data: {
        memberId: memberUser.memberProfile!.id,
        trainerId: trainerUser.trainerProfile!.id,
        title: '4-Day Upper/Lower Hypertrophy Split',
        goal: 'Progressive overload on compound lifts',
        schedule: [
          {
            day: 'Day 1 — Upper Strength',
            exercises: [
              { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Seated Dumbbell Overhead Press', sets: 3, reps: '10-12', rest: '90s' },
            ],
          },
          {
            day: 'Day 2 — Lower Power',
            exercises: [
              { name: 'High-Bar Back Squat', sets: 4, reps: '6-8', rest: '150s' },
              { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: '120s' },
            ],
          },
        ],
      },
    });

    const tomorrowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrowStart.setUTCHours(10, 0, 0, 0);

    await prisma.classSession.create({
      data: {
        title: 'Morning Barbell & Conditioning',
        category: 'Strength',
        room: 'Main Turf Zone',
        trainerId: trainerUser.trainerProfile!.id,
        startTime: tomorrowStart,
        endTime: new Date(tomorrowStart.getTime() + 60 * 60 * 1000),
        capacity: 16,
      },
    });
  }
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
