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
    const denialReason = latestMembership ? `MEMBERSHIP_${latestMembership.status}` : 'NO_ACTIVE_MEMBERSHIP';
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
