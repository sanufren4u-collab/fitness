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
          invoiceNumber: `INV-${now.getFullYear()}-${String(count + 1).padStart(5, '0')}`,
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
