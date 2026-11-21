import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'healthy', database: 'connected' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: (error as Error).message }, { status: 503 });
  }
}
