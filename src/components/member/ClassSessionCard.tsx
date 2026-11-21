'use client';

import { useState, useTransition } from 'react';
import { bookClassAction, cancelBookingAction } from '@/actions/booking.actions';
import { Clock, MapPin, User, Users, CheckCircle2 } from 'lucide-react';
import { LocaleDate, useTranslation } from '@/components/shared/LocaleProvider';

interface ClassSessionCardProps {
  session: {
    id: string;
    title: string;
    category: string;
    room: string;
    trainerName: string;
    startTime: string;
    endTime: string;
    capacity: number;
    confirmedCount: number;
    userBookingId: string | null;
    userBookingStatus: 'CONFIRMED' | 'WAITLISTED' | null;
  };
}

export function ClassSessionCard({ session }: ClassSessionCardProps) {
  const t = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const spotsLeft = Math.max(0, session.capacity - session.confirmedCount);
  const isFull = spotsLeft === 0;
  const isBooked = session.userBookingStatus === 'CONFIRMED';

  const handleBook = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await bookClassAction(session.id);
      if (!res.success) setErrorMsg(t(res.error ?? 'Could not book class'));
    });
  };

  const handleCancel = () => {
    if (!session.userBookingId) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await cancelBookingAction(session.userBookingId!);
      if (!res.success) setErrorMsg(t(res.error ?? 'Could not cancel booking'));
    });
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300">
            {session.category}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${isFull ? 'text-amber-400' : 'text-emerald-400'}`}>
            <Users className="h-3.5 w-3.5" />
            {isFull ? t('Class Full') : t('{count} / {total} spots', { count: spotsLeft, total: session.capacity })}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold text-white">{session.title}</h3>

        <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
          <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-rose-500" /> <LocaleDate value={session.startTime} format="time" /> – <LocaleDate value={session.endTime} format="time" /></p>
          <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-zinc-500" /> {t('Coach {name}', { name: session.trainerName })}</p>
          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-zinc-500" /> {session.room}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-800/80 pt-4">
        {errorMsg && <p className="mb-2.5 rounded bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-400">{errorMsg}</p>}
        {isBooked ? (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {t('Spot Reserved')}
            </span>
            <button onClick={handleCancel} disabled={isPending} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800">
              {isPending ? t('Cancelling...') : t('Cancel Spot')}
            </button>
          </div>
        ) : (
          <button onClick={handleBook} disabled={isPending || isFull} className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-500">
            {isPending ? t('Reserving...') : isFull ? t('Session Full') : t('Reserve Spot')}
          </button>
        )}
      </div>
    </div>
  );
}
