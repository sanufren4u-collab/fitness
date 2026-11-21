'use client';

import { useState, useTransition } from 'react';
import { createClassSessionAction, toggleCancelClassAction } from '@/actions/admin.actions';
import { CalendarPlus } from 'lucide-react';
import { LocaleDate, useTranslation } from '@/components/shared/LocaleProvider';

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
    startTime: string;
    capacity: number;
    bookedCount: number;
    isCancelled: boolean;
  }>;
  trainers: Array<{ id: string; name: string }>;
}) {
  const t = useTranslation();
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
        <h2 className="text-lg font-bold text-white">{t('Schedule New Class')}</h2>
        <div>
          <label className="text-xs text-zinc-400">{t('Class Title *')}</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Evening HIIT Burn')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">{t('Category')}</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">{t('Studio / Room')}</label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400">{t('Coach *')}</label>
          <select required value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">{t('Start Date & Time *')}</label>
            <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">{t('Max Capacity')}</label>
            <input type="number" required value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white">
          <CalendarPlus className="h-4 w-4" /> {t(isPending ? 'Scheduling...' : 'Publish Class Session')}
        </button>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">{s.title}</h3>
                {s.isCancelled && <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400">{t('CANCELLED')}</span>}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                <LocaleDate value={s.startTime} /> · {t('Coach {name}', { name: s.trainerName })} · {s.room} · {t('{count} / {total} spots', { count: s.bookedCount, total: s.capacity })}
              </p>
            </div>
            <button
              onClick={() => startTransition(async () => {
                await toggleCancelClassAction(s.id, !s.isCancelled);
              })}
              disabled={isPending}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {t(s.isCancelled ? 'Restore' : 'Cancel Class')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
