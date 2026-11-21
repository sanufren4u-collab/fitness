'use client';

import { useState, useTransition } from 'react';
import { createStaffAction } from '@/actions/admin.actions';
import { UserPlus } from 'lucide-react';
import { useTranslation } from '@/components/shared/LocaleProvider';

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
  const t = useTranslation();
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
        setError(t(res.error ?? 'Failed to add staff'));
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
        <h2 className="text-lg font-bold text-white">{t('Add Trainer or Admin')}</h2>
        {error && <p className="rounded bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</p>}
        <div>
          <label className="text-xs text-zinc-400">{t('Full Name *')}</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">{t('Email')} *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">{t('Role')}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'TRAINER')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
            <option value="TRAINER">{t('Trainer / Coach')}</option>
            <option value="ADMIN">{t('Admin / Manager')}</option>
          </select>
        </div>
        {role === 'TRAINER' && (
          <div>
            <label className="text-xs text-zinc-400">{t('Specialties (comma separated)')}</label>
            <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        )}
        <p className="text-[11px] text-zinc-500">{t('Default password:')} <code className="text-zinc-300">Password123!</code></p>
        <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white">
          <UserPlus className="h-4 w-4" /> {t(isPending ? 'Adding...' : 'Add Staff Account')}
        </button>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">{s.name}</h3>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">{t(s.role)}</span>
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
