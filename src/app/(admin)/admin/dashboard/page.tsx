import Link from 'next/link';
import { requireRole } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { UserRole, MembershipStatus, InvoiceStatus } from '@prisma/client';
import { subDays } from 'date-fns';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { LocaleNumber, T } from '@/components/shared/LocaleProvider';
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
            <h1 className="text-2xl font-bold text-white"><T message="Power Gym Admin Operations" /></h1>
            <p className="text-sm text-zinc-400"><T message="Welcome back, {name}" values={{ name: admin.name }} /></p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/admin/members" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <Users className="h-4 w-4 text-sky-400" /> <T message="Members & POS" />
            </Link>
            <Link href="/admin/plans" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <Layers className="h-4 w-4 text-emerald-400" /> <T message="Plans" />
            </Link>
            <Link href="/admin/schedule" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <CalendarDays className="h-4 w-4 text-amber-400" /> <T message="Classes" />
            </Link>
            <Link href="/admin/staff" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800">
              <UserCog className="h-4 w-4 text-purple-400" /> <T message="Staff" />
            </Link>
            <Link href="/kiosk" className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500">
              <QrCode className="h-4 w-4" /> <T message="Kiosk" />
            </Link>
            <SignOutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-zinc-400"><T message="30-Day Revenue (MRR)" /></span>
            <p className="mt-2 text-3xl font-bold"><LocaleNumber value={Number(revenue._sum.totalAmount ?? 0)} currency="INR" /></p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-zinc-400"><T message="Active Members" /></span>
            <p className="mt-2 text-3xl font-bold"><LocaleNumber value={activeMembers} /></p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
            <span className="text-xs uppercase text-zinc-400"><T message="Verified Check-Ins" /></span>
            <p className="mt-2 text-3xl font-bold"><LocaleNumber value={checkInsTotal} /></p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white"><T message="Recent Financial Ledger" /></h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                  <th className="pb-3"><T message="Invoice" /></th>
                  <th className="pb-3"><T message="Member" /></th>
                  <th className="pb-3"><T message="Method" /></th>
                  <th className="pb-3 text-right"><T message="Amount" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 font-mono text-xs text-zinc-300">{inv.invoiceNumber}</td>
                    <td className="py-3 text-white">{inv.user.name}</td>
                    <td className="py-3 text-xs text-zinc-400"><T message={inv.paymentMethod} /></td>
                    <td className="py-3 text-right font-semibold text-emerald-400"><LocaleNumber value={Number(inv.totalAmount)} currency="INR" /></td>
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
