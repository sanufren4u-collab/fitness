/**
 * Byayamshala — Complete Project Hydrator
 * Run inside your project directory (`E:\ironpulse-os`):
 *   node hydrate-ironpulse.js
 *
 * Writes all missing Prisma, Auth, RBAC, Admin, Trainer, Member, Kiosk,
 * Billing, Webhook, and Vitest files cleanly with UTF-8 encoding.
 */

const fs = require('fs');
const path = require('path');

function writeFile(relPath, content) {
  const fullPath = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trimStart(), 'utf8');
  console.log(`✔ Wrote ${relPath}`);
}

console.log('🚀 Hydrating complete Byayamshala structure in', process.cwd(), '...\n');

// ============================================================================
// 0. NEXT.JS 16 CONFIG (Allow standard dynamic SSR routes without Suspense errors)
// ============================================================================
writeFile('next.config.ts', `
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
};

export default nextConfig;
`);

writeFile('postcss.config.mjs', `
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`);

writeFile('src/app/globals.css', `
@import "tailwindcss";

:root {
  --brand-primary: #e11d48;
}

body {
  background-color: #09090b;
  color: #f4f4f5;
}
`);

// ============================================================================
// 1. PRISMA SCHEMA & SEED
// ============================================================================
writeFile('prisma/schema.prisma', `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  ADMIN
  TRAINER
  MEMBER
}

enum MembershipStatus {
  ACTIVE
  PAUSED
  EXPIRED
  PAST_DUE
  CANCELLED
}

enum BillingInterval {
  ONE_TIME
  MONTHLY
  QUARTERLY
  YEARLY
}

enum PaymentMethod {
  STRIPE_CARD
  CASH
  UPI
  POS_TERMINAL
  BANK_TRANSFER
}

enum InvoiceStatus {
  PAID
  OPEN
  VOID
  REFUNDED
  FAILED
}

enum BookingStatus {
  CONFIRMED
  WAITLISTED
  CANCELLED
  ATTENDED
  NO_SHOW
}

enum CheckInMethod {
  QR_SCAN
  FRONT_DESK_MANUAL
  CLASS_ROSTER
}

enum EquipmentStatus {
  OPERATIONAL
  NEEDS_MAINTENANCE
  OUT_OF_ORDER
}

model GymSettings {
  id                  String   @id @default(cuid())
  gymName             String   @default("Byayamshala")
  brandPrimaryHex     String   @default("#E11D48")
  logoUrl             String?
  timezone            String   @default("Asia/Kolkata")
  currency            String   @default("INR")
  cancellationWindowH Int      @default(4)
  maxFreezeDaysPerYr  Int      @default(30)
  updatedAt           DateTime @updatedAt
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String
  phone         String?
  avatarUrl     String?
  role          UserRole  @default(MEMBER)
  isActive      Boolean   @default(true)
  qrSecretToken String    @unique @default(cuid())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  memberProfile  MemberProfile?
  trainerProfile TrainerProfile?
  checkIns       CheckIn[]
  classBookings  ClassBooking[]
  invoices       Invoice[]
  reportedIssues EquipmentLog[] @relation("ReportedBy")

  @@index([role, isActive])
  @@index([email])
}

model TrainerProfile {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bio            String?  @db.Text
  specialties    String[]
  certifications String[]
  hourlyRate     Decimal? @db.Decimal(10, 2)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  assignedMembers MemberProfile[]
  classesTaught   ClassSession[]
  workoutPlans    WorkoutPlan[]
  dietPlans       DietPlan[]
}

model MemberProfile {
  id                String          @id @default(cuid())
  userId            String          @unique
  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  dateOfBirth       DateTime?
  gender            String?
  emergencyName     String?
  emergencyPhone    String?
  medicalNotes      String?         @db.Text
  fitnessGoal       String?
  stripeCustomerId  String?         @unique
  assignedTrainerId String?
  assignedTrainer   TrainerProfile? @relation(fields: [assignedTrainerId], references: [id], onDelete: SetNull)

  memberships  Membership[]
  bodyMetrics  BodyMetricLog[]
  workoutPlans WorkoutPlan[]
  dietPlans    DietPlan[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([assignedTrainerId])
}

model MembershipPlan {
  id            String          @id @default(cuid())
  name          String
  description   String?         @db.Text
  price         Decimal         @db.Decimal(10, 2)
  interval      BillingInterval
  durationDays  Int
  classCredits  Int?
  includesPT    Boolean         @default(false)
  stripePriceId String?         @unique
  isActive      Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  memberships Membership[]
}

model Membership {
  id                   String           @id @default(cuid())
  memberId             String
  member               MemberProfile    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  planId               String
  plan                 MembershipPlan   @relation(fields: [planId], references: [id])
  status               MembershipStatus @default(ACTIVE)
  startDate            DateTime
  endDate              DateTime
  remainingCredits     Int?
  stripeSubscriptionId String?          @unique
  autoRenew            Boolean          @default(true)
  pausedAt             DateTime?
  pauseReason          String?
  totalPausedDays      Int              @default(0)

  invoices  Invoice[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([memberId, status])
  @@index([endDate, status])
}

model Invoice {
  id                    String        @id @default(cuid())
  invoiceNumber         String        @unique
  userId                String
  user                  User          @relation(fields: [userId], references: [id])
  membershipId          String?
  membership            Membership?   @relation(fields: [membershipId], references: [id], onDelete: SetNull)
  amount                Decimal       @db.Decimal(10, 2)
  taxAmount             Decimal       @default(0) @db.Decimal(10, 2)
  totalAmount           Decimal       @db.Decimal(10, 2)
  currency              String        @default("INR")
  status                InvoiceStatus @default(PAID)
  paymentMethod         PaymentMethod
  stripePaymentIntentId String?       @unique
  notes                 String?
  paidAt                DateTime?
  createdAt             DateTime      @default(now())

  @@index([userId, createdAt])
  @@index([status, paidAt])
}

model StripeWebhookEvent {
  id          String   @id
  type        String
  processedAt DateTime @default(now())
}

model ClassSession {
  id          String         @id @default(cuid())
  title       String
  description String?
  category    String
  room        String         @default("Main Studio")
  trainerId   String
  trainer     TrainerProfile @relation(fields: [trainerId], references: [id])
  startTime   DateTime
  endTime     DateTime
  capacity    Int
  isCancelled Boolean        @default(false)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  bookings ClassBooking[]

  @@index([startTime, endTime])
  @@index([trainerId, startTime])
}

model ClassBooking {
  id        String        @id @default(cuid())
  sessionId String
  session   ClassSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  status    BookingStatus @default(CONFIRMED)
  bookedAt  DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@unique([sessionId, userId])
  @@index([userId, status])
}

model CheckIn {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  checkedInAt  DateTime      @default(now())
  method       CheckInMethod @default(QR_SCAN)
  granted      Boolean       @default(true)
  denialReason String?
  verifiedById String?

  @@index([checkedInAt])
  @@index([userId, checkedInAt])
}

model WorkoutPlan {
  id        String         @id @default(cuid())
  memberId  String
  member    MemberProfile  @relation(fields: [memberId], references: [id], onDelete: Cascade)
  trainerId String
  trainer   TrainerProfile @relation(fields: [trainerId], references: [id])
  title     String
  goal      String?
  isActive  Boolean        @default(true)
  schedule  Json
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@index([memberId, isActive])
}

model DietPlan {
  id            String         @id @default(cuid())
  memberId      String
  member        MemberProfile  @relation(fields: [memberId], references: [id], onDelete: Cascade)
  trainerId     String
  trainer       TrainerProfile @relation(fields: [trainerId], references: [id])
  title         String
  dailyCalories Int
  proteinGrams  Int
  carbsGrams    Int
  fatsGrams     Int
  isActive      Boolean        @default(true)
  meals         Json
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([memberId, isActive])
}

model BodyMetricLog {
  id         String        @id @default(cuid())
  memberId   String
  member     MemberProfile @relation(fields: [memberId], references: [id], onDelete: Cascade)
  recordedAt DateTime      @default(now())
  weightKg   Decimal?      @db.Decimal(5, 2)
  bodyFatPct Decimal?      @db.Decimal(4, 1)
  chestCm    Decimal?      @db.Decimal(5, 1)
  waistCm    Decimal?      @db.Decimal(5, 1)
  armsCm     Decimal?      @db.Decimal(5, 1)
  prRecords  Json?
  notes      String?

  @@index([memberId, recordedAt])
}

model Equipment {
  id             String          @id @default(cuid())
  name           String
  serialNumber   String?         @unique
  category       String
  status         EquipmentStatus @default(OPERATIONAL)
  purchaseDate   DateTime?
  lastServicedAt DateTime?
  nextServiceDue DateTime?
  logs           EquipmentLog[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model EquipmentLog {
  id           String    @id @default(cuid())
  equipmentId  String
  equipment    Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  reportedById String
  reportedBy   User      @relation("ReportedBy", fields: [reportedById], references: [id])
  issueSummary String
  resolution   String?
  cost         Decimal?  @db.Decimal(10, 2)
  resolvedAt   DateTime?
  createdAt    DateTime  @default(now())

  @@index([equipmentId, resolvedAt])
}
`);

writeFile('prisma/seed.ts', `
import { PrismaClient, UserRole, BillingInterval, MembershipStatus, PaymentMethod, InvoiceStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.gymSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      gymName: 'Byayamshala',
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
`);

// ============================================================================
// 2. CORE LIBRARIES, AUTH, DAL & MIDDLEWARE
// ============================================================================
writeFile('src/lib/db.ts', `
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`);

writeFile('src/types/next-auth.d.ts', `
import { UserRole } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: UserRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }
}
`);

writeFile('src/lib/auth.ts', `
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || 'ironpulse-local-dev-secret-key-at-least-32-chars',
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash || !user.isActive) return null;
        const isValid = await compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
`);

writeFile('src/lib/dal.ts', `
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
`);

writeFile('src/middleware.ts', `
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  const isAuthRoute = nextUrl.pathname.startsWith('/login');
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  const isTrainerRoute = nextUrl.pathname.startsWith('/trainer');
  const isMemberRoute = nextUrl.pathname.startsWith('/app');
  const isKioskRoute = nextUrl.pathname.startsWith('/kiosk');

  if (isAuthRoute && isLoggedIn) {
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', nextUrl));
    if (role === 'TRAINER') return NextResponse.redirect(new URL('/trainer/dashboard', nextUrl));
    return NextResponse.redirect(new URL('/app', nextUrl));
  }

  if ((isAdminRoute || isTrainerRoute || isMemberRoute || isKioskRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  if (isAdminRoute && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', nextUrl));
  }

  if (isTrainerRoute && role !== 'TRAINER' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', nextUrl));
  }

  if (isKioskRoute && role !== 'ADMIN' && role !== 'TRAINER') {
    return NextResponse.redirect(new URL('/unauthorized', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/trainer/:path*', '/app/:path*', '/kiosk/:path*', '/login'],
};
`);

// ============================================================================
// 3. SERVER ACTIONS (BOOKINGS, BILLING, COACHING)
// ============================================================================
writeFile('src/actions/booking.actions.ts', `
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
      >\`SELECT id, "startTime", "endTime", capacity, "isCancelled" FROM "ClassSession" WHERE id = \${sessionId} FOR UPDATE\`;

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
`);

writeFile('src/actions/billing.actions.ts', `
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
    const invoiceNumber = \`INV-\${now.getFullYear()}-\${String(invoiceCount + 1).padStart(5, '0')}\`;
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
`);

writeFile('src/actions/admin.actions.ts', `
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
              invoiceNumber: \`INV-\${now.getFullYear()}-\${String(count + 1).padStart(5, '0')}\`,
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
  phone: z.string().optional(),
  fitnessGoal: z.string().optional(),
  assignedTrainerId: z.string().optional(),
  isActive: z.boolean(),
});

export async function updateMemberAction(raw: z.infer<typeof updateMemberSchema>) {
  try {
    await requireRole([UserRole.ADMIN]);
    const input = updateMemberSchema.parse(raw);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: input.userId },
        data: {
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          isActive: input.isActive,
        },
      }),
      prisma.memberProfile.update({
        where: { id: input.memberProfileId },
        data: {
          fitnessGoal: input.fitnessGoal?.trim() || null,
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
`);

// ============================================================================
// 4. UI COMPONENTS & SHARED NAVIGATION SHELL
// ============================================================================
writeFile('src/components/admin/MembersManagerClient.tsx', `
'use client';

import { useState, useTransition } from 'react';
import {
  createMemberAction,
  updateMemberAction,
  deleteMemberAction,
} from '@/actions/admin.actions';
import {
  recordPosMembershipPaymentAction,
  toggleMembershipFreezeAction,
} from '@/actions/billing.actions';
import { UserPlus, Pencil, CreditCard, PauseCircle, PlayCircle, Trash2, X } from 'lucide-react';

interface MemberRow {
  userId: string;
  memberProfileId: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  qrSecretToken: string;
  fitnessGoal: string;
  assignedTrainerId: string;
  assignedTrainerName: string;
  latestMembership: {
    id: string;
    planName: string;
    status: string;
    endDate: string;
  } | null;
}

export function MembersManagerClient({
  members,
  plans,
  trainers,
}: {
  members: MemberRow[];
  plans: Array<{ id: string; name: string; price: number; durationDays: number }>;
  trainers: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Modal States
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [posTarget, setPosTarget] = useState<MemberRow | null>(null);

  // Add Member Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newTrainerId, setNewTrainerId] = useState(trainers[0]?.id ?? '');
  const [newPlanId, setNewPlanId] = useState(plans[0]?.id ?? '');
  const [newPayMethod, setNewPayMethod] = useState<'UPI' | 'CASH' | 'POS_TERMINAL' | 'STRIPE_CARD'>('UPI');

  // Edit Member Form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editTrainerId, setEditTrainerId] = useState('');
  const [editActive, setEditActive] = useState(true);

  // POS Renew Form
  const [posPlanId, setPosPlanId] = useState(plans[0]?.id ?? '');
  const [posMethod, setPosMethod] = useState<'UPI' | 'CASH' | 'POS_TERMINAL' | 'BANK_TRANSFER'>('UPI');
  const [posNotes, setPosNotes] = useState('');

  function openEdit(m: MemberRow) {
    setEditing(m);
    setEditName(m.name);
    setEditPhone(m.phone);
    setEditGoal(m.fitnessGoal);
    setEditTrainerId(m.assignedTrainerId);
    setEditActive(m.isActive);
    setError(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createMemberAction({
        name: newName,
        email: newEmail,
        phone: newPhone,
        password: 'Password123!',
        fitnessGoal: newGoal,
        assignedTrainerId: newTrainerId || undefined,
        planId: newPlanId || undefined,
        paymentMethod: newPayMethod,
      });
      if (!res.success) {
        setError(res.error ?? 'Error creating member');
        return;
      }
      setShowAdd(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewGoal('');
      setBanner('Member created and initial pass activated!');
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const res = await updateMemberAction({
        userId: editing.userId,
        memberProfileId: editing.memberProfileId,
        name: editName,
        phone: editPhone,
        fitnessGoal: editGoal,
        assignedTrainerId: editTrainerId || undefined,
        isActive: editActive,
      });
      if (!res.success) {
        setError(res.error ?? 'Error updating member');
        return;
      }
      setEditing(null);
      setBanner('Member profile updated.');
    });
  }

  function handlePosRenew(e: React.FormEvent) {
    e.preventDefault();
    if (!posTarget) return;
    setError(null);
    startTransition(async () => {
      const res = await recordPosMembershipPaymentAction({
        memberProfileId: posTarget.memberProfileId,
        planId: posPlanId,
        paymentMethod: posMethod,
        taxAmount: 0,
        notes: posNotes,
      });
      if (!res.success) {
        setError('Failed to record POS payment');
        return;
      }
      setPosTarget(null);
      setPosNotes('');
      setBanner(\`Payment recorded! Receipt \${res.invoiceNumber} generated.\`);
    });
  }

  function handleFreezeToggle(membershipId: string, currentStatus: string) {
    startTransition(async () => {
      const action = currentStatus === 'PAUSED' ? 'RESUME' : 'PAUSE';
      await toggleMembershipFreezeAction(membershipId, action, 'Admin front-desk update');
      setBanner(action === 'PAUSE' ? 'Membership frozen.' : 'Membership resumed & end date extended.');
    });
  }

  function handleDelete(userId: string, name: string) {
    startTransition(async () => {
      const res = await deleteMemberAction(userId);
      if (!res.success) {
        setError(res.error ?? 'Could not delete member');
      } else {
        setBanner(\`Removed \${name}.\`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Members, POS & Passes</h1>
          <p className="text-sm text-zinc-400">Add new gym members, edit profiles, freeze plans, or collect POS payments</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(null); }}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
        >
          <UserPlus className="h-4 w-4" /> Add New Member
        </button>
      </div>

      {banner && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* MEMBERS TABLE */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
              <th className="pb-3">Member</th>
              <th className="pb-3">Coach</th>
              <th className="pb-3">Plan & Status</th>
              <th className="pb-3">QR Pass Token</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {members.map((m) => (
              <tr key={m.userId} className="hover:bg-zinc-800/30">
                <td className="py-3.5">
                  <div className="font-semibold text-white">
                    {m.name} {!m.isActive && <span className="ml-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-400">INACTIVE</span>}
                  </div>
                  <div className="text-xs text-zinc-400">{m.email} {m.phone ? \`· \${m.phone}\` : ''}</div>
                </td>
                <td className="py-3.5 text-xs text-zinc-300">{m.assignedTrainerName || 'Unassigned'}</td>
                <td className="py-3.5">
                  {m.latestMembership ? (
                    <div>
                      <span className="text-xs font-medium text-zinc-200">{m.latestMembership.planName}</span>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className={\`font-semibold \${m.latestMembership.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}\`}>
                          {m.latestMembership.status}
                        </span>
                        <span className="font-mono text-zinc-500">exp {m.latestMembership.endDate}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">No Plan</span>
                  )}
                </td>
                <td className="py-3.5 font-mono text-xs text-zinc-400">{m.qrSecretToken}</td>
                <td className="py-3.5 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(m)}
                      title="Edit Member"
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => { setPosTarget(m); setError(null); }}
                      title="Renew / Record Payment"
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Renew/POS
                    </button>
                    {m.latestMembership && (m.latestMembership.status === 'ACTIVE' || m.latestMembership.status === 'PAUSED') && (
                      <button
                        onClick={() => handleFreezeToggle(m.latestMembership!.id, m.latestMembership!.status)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-zinc-800"
                      >
                        {m.latestMembership.status === 'PAUSED' ? (
                          <><PlayCircle className="h-3.5 w-3.5" /> Unfreeze</>
                        ) : (
                          <><PauseCircle className="h-3.5 w-3.5" /> Freeze</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.userId, m.name)}
                      disabled={isPending}
                      title="Delete Member"
                      className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:border-rose-500/40 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Onboard New Member</h2>
              <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">Full Name *</label>
                  <input required value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Email *</label>
                  <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">Phone</label>
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Assigned Coach</label>
                  <select value={newTrainerId} onChange={(e) => setNewTrainerId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                    <option value="">None</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Fitness Goal</label>
                <input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="e.g., Hypertrophy & 5K endurance" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">Initial Membership Plan</label>
                  <select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                    <option value="">No Plan Yet</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">POS Payment Method</label>
                  <select value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value as 'UPI')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="POS_TERMINAL">Card Terminal</option>
                    <option value="STRIPE_CARD">Online Card</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">Default login password for new members: <code className="text-zinc-300">Password123!</code></p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
                  {isPending ? 'Saving...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Edit {editing.name}</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs text-zinc-400">Full Name</label>
                <input required value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Phone</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Assigned Trainer</label>
                <select value={editTrainerId} onChange={(e) => setEditTrainerId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                  <option value="">None</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Fitness Goal</label>
                <input value={editGoal} onChange={(e) => setEditGoal(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                Account Active (allow login & turnstile access)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
                  {isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS RENEWAL MODAL */}
      {posTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">POS Renewal — {posTarget.name}</h2>
              <button onClick={() => setPosTarget(null)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <form onSubmit={handlePosRenew} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs text-zinc-400">Select Plan</label>
                <select value={posPlanId} onChange={(e) => setPosPlanId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price} ({p.durationDays}d)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Payment Method</label>
                <select value={posMethod} onChange={(e) => setPosMethod(e.target.value as 'UPI')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="POS_TERMINAL">POS Card Terminal</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Receipt Notes</label>
                <input value={posNotes} onChange={(e) => setPosNotes(e.target.value)} placeholder="Optional reference ID" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPosTarget(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
                  {isPending ? 'Recording...' : 'Confirm Payment & Extend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`);

writeFile('src/components/member/ClassSessionCard.tsx', `
'use client';

import { useState, useTransition } from 'react';
import { bookClassAction, cancelBookingAction } from '@/actions/booking.actions';
import { Clock, MapPin, User, Users, CheckCircle2 } from 'lucide-react';

interface ClassSessionCardProps {
  session: {
    id: string;
    title: string;
    category: string;
    room: string;
    trainerName: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    capacity: number;
    confirmedCount: number;
    userBookingId: string | null;
    userBookingStatus: 'CONFIRMED' | 'WAITLISTED' | null;
  };
}

export function ClassSessionCard({ session }: ClassSessionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const spotsLeft = Math.max(0, session.capacity - session.confirmedCount);
  const isFull = spotsLeft === 0;
  const isBooked = session.userBookingStatus === 'CONFIRMED';

  const handleBook = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await bookClassAction(session.id);
      if (!res.success) setErrorMsg(res.error ?? 'Could not book class');
    });
  };

  const handleCancel = () => {
    if (!session.userBookingId) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await cancelBookingAction(session.userBookingId!);
      if (!res.success) setErrorMsg(res.error ?? 'Could not cancel booking');
    });
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300">
            {session.category}
          </span>
          <span className={\`inline-flex items-center gap-1 text-xs font-medium \${isFull ? 'text-amber-400' : 'text-emerald-400'}\`}>
            <Users className="h-3.5 w-3.5" />
            {isFull ? 'Class Full' : \`\${spotsLeft} / \${session.capacity} spots\`}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold text-white">{session.title}</h3>

        <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
          <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-rose-500" /> {session.startTimeFormatted} – {session.endTimeFormatted}</p>
          <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-zinc-500" /> Coach {session.trainerName}</p>
          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-zinc-500" /> {session.room}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-800/80 pt-4">
        {errorMsg && <p className="mb-2.5 rounded bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-400">{errorMsg}</p>}
        {isBooked ? (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Spot Reserved
            </span>
            <button onClick={handleCancel} disabled={isPending} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800">
              {isPending ? 'Cancelling...' : 'Cancel Spot'}
            </button>
          </div>
        ) : (
          <button onClick={handleBook} disabled={isPending || isFull} className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-500">
            {isPending ? 'Reserving...' : isFull ? 'Session Full' : 'Reserve Spot'}
          </button>
        )}
      </div>
    </div>
  );
}
`);

// ============================================================================
// 5. APP ROUTER PAGES (AUTH, ADMIN, TRAINER, MEMBER, KIOSK)
// ============================================================================
writeFile('src/app/page.tsx', `
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'ADMIN') redirect('/admin/dashboard');
  if (session.user.role === 'TRAINER') redirect('/trainer/dashboard');
  redirect('/app');
}
`);

writeFile('src/app/unauthorized/page.tsx', `
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
      <ShieldAlert className="h-12 w-12 text-rose-500" />
      <h1 className="mt-4 text-2xl font-bold text-white">Access Restricted</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Your account role does not have permission to view this portal.
      </p>
      <Link href="/" className="mt-6 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white">
        Return to My Dashboard
      </Link>
    </div>
  );
}
`);

writeFile('src/app/(auth)/login/page.tsx', `
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ironpulse.io');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Invalid email or password.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-rose-600 p-2">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Byayamshala OS</span>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white">Sign in to your portal</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Demo: admin@ironpulse.io · coach@ironpulse.io · member@ironpulse.io
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Admin', mail: 'admin@ironpulse.io' },
            { label: 'Trainer', mail: 'coach@ironpulse.io' },
            { label: 'Member', mail: 'member@ironpulse.io' },
          ].map((preset) => (
            <button
              key={preset.mail}
              type="button"
              onClick={() => { setEmail(preset.mail); setPassword('Password123!'); }}
              className="rounded-md border border-zinc-700 bg-zinc-800/70 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Fill {preset.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
`);

// Admin Dashboard & Members Directory
writeFile('src/app/(admin)/admin/dashboard/page.tsx', `
import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole, MembershipStatus, InvoiceStatus } from '@prisma/client';
import { subDays } from 'date-fns';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { QrCode, Users, Layers, CalendarDays, UserCog } from 'lucide-react';

export default async function AdminDashboardPage() {
  const admin = await requireRole([UserRole.ADMIN]);

  const [activeMembers, checkInsTotal, revenue, recentInvoices] = await Promise.all([
    prisma.membership.count({ where: { status: MembershipStatus.ACTIVE } }),
    prisma.checkIn.count({ where: { granted: true } }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: InvoiceStatus.PAID, paidAt: { gte: subDays(new Date(), 30) } },
    }),
    prisma.invoice.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Byayamshala Admin Operations</h1>
            <p className="text-sm text-zinc-400">Welcome back, {admin.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/admin/members" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <Users className="h-4 w-4 text-sky-400" /> Members & POS
            </Link>
            <Link href="/admin/plans" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <Layers className="h-4 w-4 text-emerald-400" /> Plans
            </Link>
            <Link href="/admin/schedule" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <CalendarDays className="h-4 w-4 text-amber-400" /> Classes
            </Link>
            <Link href="/admin/staff" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <UserCog className="h-4 w-4 text-purple-400" /> Staff
            </Link>
            <Link href="/kiosk" className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500">
              <QrCode className="h-4 w-4" /> Kiosk
            </Link>
            <SignOutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-zinc-400">30-Day Revenue (MRR)</span>
            <p className="mt-2 text-3xl font-bold">₹{Number(revenue._sum.totalAmount ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-zinc-400">Active Members</span>
            <p className="mt-2 text-3xl font-bold">{activeMembers}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-zinc-400">Verified Check-Ins</span>
            <p className="mt-2 text-3xl font-bold">{checkInsTotal}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Recent Financial Ledger</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Member</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 font-mono text-xs text-zinc-300">{inv.invoiceNumber}</td>
                    <td className="py-3 text-white">{inv.user.name}</td>
                    <td className="py-3 text-xs text-zinc-400">{inv.paymentMethod}</td>
                    <td className="py-3 text-right font-semibold text-emerald-400">₹{Number(inv.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
`);

writeFile('src/app/(admin)/admin/members/page.tsx', `
import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { MembersManagerClient } from '@/components/admin/MembersManagerClient';

export default async function AdminMembersPage() {
  await requireRole([UserRole.ADMIN]);

  const [members, plans, trainers] = await Promise.all([
    prisma.memberProfile.findMany({
      include: {
        user: true,
        assignedTrainer: { include: { user: true } },
        memberships: { orderBy: { endDate: 'desc' }, take: 1, include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.membershipPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
    prisma.trainerProfile.findMany({ include: { user: true } }),
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
      assignedTrainerId: m.assignedTrainerId ?? '',
      assignedTrainerName: m.assignedTrainer?.user.name ?? '',
      latestMembership: active
        ? {
            id: active.id,
            planName: active.plan.name,
            status: active.status,
            endDate: new Date(active.endDate).toLocaleDateString('en-IN'),
          }
        : null,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← Back to Dashboard</Link>
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
`);

writeFile('src/components/admin/PlansManagerClient.tsx', `
'use client';

import { useState, useTransition } from 'react';
import { upsertPlanAction } from '@/actions/admin.actions';
import { Plus, Pencil } from 'lucide-react';

interface PlanItem {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  durationDays: number;
  classCredits: number | null;
  isActive: boolean;
}

export function PlansManagerClient({ plans }: { plans: PlanItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('3500');
  const [interval, setInterval] = useState<'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [durationDays, setDurationDays] = useState('30');
  const [classCredits, setClassCredits] = useState('');
  const [isActive, setIsActive] = useState(true);

  function loadForEdit(p: PlanItem) {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description);
    setPrice(String(p.price));
    setInterval(p.interval);
    setDurationDays(String(p.durationDays));
    setClassCredits(p.classCredits !== null ? String(p.classCredits) : '');
    setIsActive(p.isActive);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('3500');
    setInterval('MONTHLY');
    setDurationDays('30');
    setClassCredits('');
    setIsActive(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await upsertPlanAction({
        id: editingId ?? undefined,
        name,
        description,
        price: Number(price),
        interval,
        durationDays: Number(durationDays),
        classCredits: classCredits.trim() ? Number(classCredits) : null,
        isActive,
      });
      resetForm();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form onSubmit={handleSave} className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm">
        <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Membership Plan' : 'Create Membership Plan'}</h2>
        <div>
          <label className="text-xs text-zinc-400">Plan Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Quarterly Transformation" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">Price (INR) *</label>
            <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Duration (Days) *</label>
            <input type="number" required value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">Billing Interval</label>
            <select value={interval} onChange={(e) => setInterval(e.target.value as 'MONTHLY')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
              <option value="ONE_TIME">One-Time Pack</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400">Class Credits (Blank=Unlimited)</label>
            <input type="number" value={classCredits} onChange={(e) => setClassCredits(e.target.value)} placeholder="Unlimited" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active for sale
        </label>
        <div className="flex gap-2 pt-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Cancel</button>
          )}
          <button type="submit" disabled={isPending} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white">
            <Plus className="h-4 w-4" /> {isPending ? 'Saving...' : editingId ? 'Update Plan' : 'Add Plan'}
          </button>
        </div>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {plans.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">{p.name}</h3>
                <span className={\`rounded px-2 py-0.5 text-[10px] font-semibold \${p.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}\`}>
                  {p.isActive ? 'ACTIVE' : 'ARCHIVED'}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">{p.description || 'Standard facility membership'}</p>
              <p className="mt-2 font-mono text-xs text-zinc-300">
                ₹{p.price.toLocaleString()} · {p.durationDays} days · {p.classCredits ? \`\${p.classCredits} class credits\` : 'Unlimited classes'}
              </p>
            </div>
            <button onClick={() => loadForEdit(p)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
`);

writeFile('src/app/(admin)/admin/plans/page.tsx', `
import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { PlansManagerClient } from '@/components/admin/PlansManagerClient';

export default async function AdminPlansPage() {
  await requireRole([UserRole.ADMIN]);
  const plans = await prisma.membershipPlan.findMany({ orderBy: { price: 'asc' } });

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← Back to Dashboard</Link>
            <h1 className="mt-1 text-2xl font-bold text-white">Membership Plans & Pricing</h1>
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
`);

writeFile('src/components/admin/ScheduleManagerClient.tsx', `
'use client';

import { useState, useTransition } from 'react';
import { createClassSessionAction, toggleCancelClassAction } from '@/actions/admin.actions';
import { CalendarPlus } from 'lucide-react';

export function ScheduleManagerClient({
  sessions,
  trainers,
}: {
  sessions: Array<{
    id: string;
    title: string;
    category: string;
    room: string;
    trainerName: string;
    startTimeFormatted: string;
    capacity: number;
    bookedCount: number;
    isCancelled: boolean;
  }>;
  trainers: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Strength');
  const [room, setRoom] = useState('Main Turf Zone');
  const [trainerId, setTrainerId] = useState(trainers[0]?.id ?? '');
  const [startTime, setStartTime] = useState('');
  const [capacity, setCapacity] = useState('16');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!startTime || !trainerId) return;
    startTransition(async () => {
      await createClassSessionAction({
        title,
        category,
        room,
        trainerId,
        startTime,
        durationMinutes: 60,
        capacity: Number(capacity),
      });
      setTitle('');
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form onSubmit={handleCreate} className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm">
        <h2 className="text-lg font-bold text-white">Schedule New Class</h2>
        <div>
          <label className="text-xs text-zinc-400">Class Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Evening HIIT Burn" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Studio / Room</label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400">Coach *</label>
          <select required value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">Start Date & Time *</label>
            <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Max Capacity</label>
            <input type="number" required value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white">
          <CalendarPlus className="h-4 w-4" /> {isPending ? 'Scheduling...' : 'Publish Class Session'}
        </button>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">{s.title}</h3>
                {s.isCancelled && <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400">CANCELLED</span>}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {s.startTimeFormatted} · Coach {s.trainerName} · {s.room} · {s.bookedCount}/{s.capacity} spots
              </p>
            </div>
            <button
              onClick={() => startTransition(() => toggleCancelClassAction(s.id, !s.isCancelled))}
              disabled={isPending}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {s.isCancelled ? 'Restore' : 'Cancel Class'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
`);

writeFile('src/app/(admin)/admin/schedule/page.tsx', `
import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { ScheduleManagerClient } from '@/components/admin/ScheduleManagerClient';

export default async function AdminSchedulePage() {
  await requireRole([UserRole.ADMIN]);

  const [sessions, trainers] = await Promise.all([
    prisma.classSession.findMany({
      include: { trainer: { include: { user: true } }, bookings: { where: { status: 'CONFIRMED' } } },
      orderBy: { startTime: 'desc' },
      take: 20,
    }),
    prisma.trainerProfile.findMany({ include: { user: true } }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← Back to Dashboard</Link>
            <h1 className="mt-1 text-2xl font-bold text-white">Master Class Schedule</h1>
          </div>
          <SignOutButton />
        </div>
        <ScheduleManagerClient
          sessions={sessions.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category,
            room: s.room,
            trainerName: s.trainer.user.name,
            startTimeFormatted: new Date(s.startTime).toLocaleString('en-IN'),
            capacity: s.capacity,
            bookedCount: s.bookings.length,
            isCancelled: s.isCancelled,
          }))}
          trainers={trainers.map((t) => ({ id: t.id, name: t.user.name }))}
        />
      </div>
    </div>
  );
}
`);

writeFile('src/components/admin/StaffManagerClient.tsx', `
'use client';

import { useState, useTransition } from 'react';
import { createStaffAction } from '@/actions/admin.actions';
import { UserPlus } from 'lucide-react';

export function StaffManagerClient({
  staff,
}: {
  staff: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    specialties: string[];
  }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'TRAINER' | 'ADMIN'>('TRAINER');
  const [specialties, setSpecialties] = useState('Strength, Mobility');
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createStaffAction({ name, email, phone, role, specialties });
      if (!res.success) {
        setError(res.error ?? 'Failed to add staff');
        return;
      }
      setName('');
      setEmail('');
      setPhone('');
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form onSubmit={handleAdd} className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm">
        <h2 className="text-lg font-bold text-white">Add Trainer or Admin</h2>
        {error && <p className="rounded bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</p>}
        <div>
          <label className="text-xs text-zinc-400">Full Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Email *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'TRAINER')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
            <option value="TRAINER">Trainer / Coach</option>
            <option value="ADMIN">Admin / Manager</option>
          </select>
        </div>
        {role === 'TRAINER' && (
          <div>
            <label className="text-xs text-zinc-400">Specialties (comma separated)</label>
            <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        )}
        <p className="text-[11px] text-zinc-500">Default password: <code className="text-zinc-300">Password123!</code></p>
        <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white">
          <UserPlus className="h-4 w-4" /> {isPending ? 'Adding...' : 'Add Staff Account'}
        </button>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">{s.name}</h3>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">{s.role}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">{s.email}</p>
              {s.specialties.length > 0 && (
                <p className="mt-1 text-xs text-rose-400">{s.specialties.join(' · ')}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`);

writeFile('src/app/(admin)/admin/staff/page.tsx', `
import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { StaffManagerClient } from '@/components/admin/StaffManagerClient';

export default async function AdminStaffPage() {
  await requireRole([UserRole.ADMIN]);
  const users = await prisma.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.TRAINER] } },
    include: { trainerProfile: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-xs text-rose-400 hover:underline">← Back to Dashboard</Link>
            <h1 className="mt-1 text-2xl font-bold text-white">Staff & Coaches</h1>
          </div>
          <SignOutButton />
        </div>
        <StaffManagerClient
          staff={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            specialties: u.trainerProfile?.specialties ?? [],
          }))}
        />
      </div>
    </div>
  );
}
`);

// Trainer Dashboard
writeFile('src/app/(trainer)/trainer/dashboard/page.tsx', `
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { SignOutButton } from '@/components/shared/SignOutButton';

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
            <h1 className="text-2xl font-bold text-white">Trainer Coaching Workspace</h1>
            <p className="text-sm text-zinc-400">Coach {user.name}</p>
          </div>
          <SignOutButton />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Assigned Clients ({trainer?.assignedMembers.length ?? 0})</h2>
            <ul className="mt-4 space-y-3">
              {trainer?.assignedMembers.map((c) => (
                <li key={c.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
                  <p className="font-semibold text-white">{c.user.name}</p>
                  <p className="text-xs text-zinc-400">Goal: {c.fitnessGoal ?? 'General Fitness'}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Upcoming Classes Taught</h2>
            <ul className="mt-4 space-y-3">
              {trainer?.classesTaught.map((cls) => (
                <li key={cls.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
                  <p className="font-semibold text-white">{cls.title}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(cls.startTime).toLocaleString('en-IN')} · {cls.bookings.length}/{cls.capacity} booked
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
`);

// Member Portal Home (/app)
writeFile('src/app/(member)/app/page.tsx', `
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { MemberPassCard } from '@/components/member/MemberPassCard';
import { ClassSessionCard } from '@/components/member/ClassSessionCard';
import { SignOutButton } from '@/components/shared/SignOutButton';

export default async function MemberHomePage() {
  const user = await requireRole([UserRole.MEMBER, UserRole.ADMIN]);

  const [membership, upcomingSessions, workoutPlan] = await Promise.all([
    user.memberProfile
      ? prisma.membership.findFirst({ where: { memberId: user.memberProfile.id }, orderBy: { endDate: 'desc' }, include: { plan: true } })
      : null,
    prisma.classSession.findMany({
      where: { startTime: { gte: new Date() }, isCancelled: false },
      include: { trainer: { include: { user: true } }, bookings: { where: { status: 'CONFIRMED' } } },
      orderBy: { startTime: 'asc' },
      take: 4,
    }),
    user.memberProfile
      ? prisma.workoutPlan.findFirst({ where: { memberId: user.memberProfile.id, isActive: true } })
      : null,
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <div className="mx-auto max-w-lg space-y-6 pb-16">
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-white">Byayamshala Member</span>
          <SignOutButton />
        </div>

        <MemberPassCard
          memberName={user.name}
          qrSecretToken={user.qrSecretToken}
          planName={membership?.plan.name ?? 'No Active Plan'}
          status={membership?.status ?? 'EXPIRED'}
          endDateFormatted={membership ? new Date(membership.endDate).toLocaleDateString('en-IN') : '—'}
          remainingCredits={membership?.remainingCredits ?? null}
        />

        {workoutPlan && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-rose-400">Assigned Routine</span>
            <h2 className="mt-1 text-lg font-bold text-white">{workoutPlan.title}</h2>
            <p className="text-xs text-zinc-400">{workoutPlan.goal}</p>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Upcoming Classes</h2>
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
                  startTimeFormatted: new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                  endTimeFormatted: new Date(s.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
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
`);

// Front-Desk QR Check-In Kiosk (/kiosk)
writeFile('src/app/(kiosk)/kiosk/page.tsx', `
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QrCode, CheckCircle2, XCircle } from 'lucide-react';

export default function KioskScannerPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [result, setResult] = useState<{ granted: boolean; memberName?: string; planName?: string; reason?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setLoading(true);
    let cleanToken = tokenInput.trim();
    try {
      const parsed = JSON.parse(cleanToken);
      if (parsed.token) cleanToken = parsed.token;
    } catch {}

    const res = await fetch('/api/kiosk/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    setTokenInput('');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
        <QrCode className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-3 text-2xl font-bold text-white">Front-Desk Access Kiosk</h1>
        <p className="mt-1 text-xs text-zinc-400">Paste or scan a Member QR Token from Admin → Members</p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Scan QR payload or paste qrSecretToken..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-center font-mono text-sm text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-semibold text-white hover:bg-rose-500"
          >
            {loading ? 'Verifying Pass...' : 'Verify Member Check-In'}
          </button>
        </form>

        {result && (
          <div className={\`mt-6 rounded-xl border p-4 \${result.granted ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}\`}>
            {result.granted ? (
              <div className="flex flex-col items-center text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
                <p className="mt-2 text-lg font-bold text-white">Access Granted: {result.memberName}</p>
                <p className="text-xs">{result.planName}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-rose-400">
                <XCircle className="h-8 w-8" />
                <p className="mt-2 text-lg font-bold text-white">Access Denied</p>
                <p className="text-xs font-mono">{result.reason}</p>
              </div>
            )}
          </div>
        )}

        <Link href="/admin/dashboard" className="mt-6 inline-block text-xs text-zinc-400 hover:underline">
          ← Exit Kiosk to Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
`);

// ============================================================================
// 6. API ROUTES (NEXTAUTH, KIOSK, STRIPE WEBHOOK, HEALTH)
// ============================================================================
writeFile('src/app/api/auth/[...nextauth]/route.ts', `
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
`);

writeFile('src/app/api/health/route.ts', `
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw\`SELECT 1\`;
    return NextResponse.json({ status: 'healthy', database: 'connected' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: (error as Error).message }, { status: 503 });
  }
}
`);

writeFile('src/app/api/kiosk/scan/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { MembershipStatus, CheckInMethod } from '@prisma/client';
import { subMinutes } from 'date-fns';

const scanSchema = z.object({ token: z.string().min(4) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'TRAINER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized kiosk terminal' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ granted: false, reason: 'INVALID_QR_FORMAT' }, { status: 400 });
  }

  const memberUser = await prisma.user.findUnique({
    where: { qrSecretToken: parsed.data.token },
    include: {
      memberProfile: {
        include: { memberships: { orderBy: { endDate: 'desc' }, take: 1, include: { plan: true } } },
      },
    },
  });

  if (!memberUser || !memberUser.isActive || !memberUser.memberProfile) {
    return NextResponse.json({ granted: false, reason: 'UNKNOWN_OR_INACTIVE_MEMBER' }, { status: 404 });
  }

  const now = new Date();
  const latestMembership = memberUser.memberProfile.memberships[0];

  if (!latestMembership || latestMembership.status !== MembershipStatus.ACTIVE || latestMembership.endDate < now) {
    const denialReason = latestMembership ? \`MEMBERSHIP_\${latestMembership.status}\` : 'NO_ACTIVE_MEMBERSHIP';
    await prisma.checkIn.create({
      data: { userId: memberUser.id, method: CheckInMethod.QR_SCAN, granted: false, denialReason, verifiedById: session.user.id },
    });
    return NextResponse.json({ granted: false, memberName: memberUser.name, reason: denialReason }, { status: 403 });
  }

  const recentCheckIn = await prisma.checkIn.findFirst({
    where: { userId: memberUser.id, granted: true, checkedInAt: { gte: subMinutes(now, 15) } },
  });

  if (!recentCheckIn) {
    await prisma.checkIn.create({
      data: { userId: memberUser.id, method: CheckInMethod.QR_SCAN, granted: true, verifiedById: session.user.id },
    });
  }

  return NextResponse.json({
    granted: true,
    memberName: memberUser.name,
    planName: latestMembership.plan.name,
  });
}
`);

writeFile('src/app/api/webhooks/stripe/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { MembershipStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { addDays } from 'date-fns';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const exists = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (exists) return NextResponse.json({ received: true, duplicate: true }, { status: 200 });

  await prisma.$transaction(async (tx) => {
    await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { memberProfileId, planId, userId } = session.metadata ?? {};
      if (!memberProfileId || !planId || !userId) return;
      const plan = await tx.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan) return;
      const now = new Date();
      const membership = await tx.membership.create({
        data: {
          memberId: memberProfileId,
          planId: plan.id,
          status: MembershipStatus.ACTIVE,
          startDate: now,
          endDate: addDays(now, plan.durationDays),
          remainingCredits: plan.classCredits,
          autoRenew: !!session.subscription,
        },
      });
      const count = await tx.invoice.count();
      await tx.invoice.create({
        data: {
          invoiceNumber: \`INV-\${now.getFullYear()}-\${String(count + 1).padStart(5, '0')}\`,
          userId,
          membershipId: membership.id,
          amount: (session.amount_total ?? 0) / 100,
          totalAmount: (session.amount_total ?? 0) / 100,
          status: InvoiceStatus.PAID,
          paymentMethod: PaymentMethod.STRIPE_CARD,
          paidAt: now,
        },
      });
    }
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
`);

// ============================================================================
// 7. VITEST CONFIG & INTEGRATION TEST
// ============================================================================
writeFile('vitest.config.ts', `
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { environment: 'node', setupFiles: ['dotenv/config'] },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
`);

console.log('\n✅ All files generated cleanly!');
console.log('Next commands in your VS Code terminal:');
console.log('  npx prisma generate');
console.log('  npx tsx prisma/seed.ts');
console.log('  npm run dev');
