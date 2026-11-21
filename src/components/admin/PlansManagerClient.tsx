'use client';

import { useState, useTransition } from 'react';
import { upsertPlanAction } from '@/actions/admin.actions';
import { Plus, Pencil } from 'lucide-react';
import { LocaleNumber, useTranslation } from '@/components/shared/LocaleProvider';

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
  const t = useTranslation();
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
        <h2 className="text-lg font-bold text-white">{t(editingId ? 'Edit Membership Plan' : 'Create Membership Plan')}</h2>
        <div>
          <label className="text-xs text-zinc-400">{t('Plan Name *')}</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Quarterly Transformation')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400">{t('Description')}</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">{t('Price (INR) *')}</label>
            <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">{t('Duration (Days) *')}</label>
            <input type="number" required value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">{t('Billing Interval')}</label>
            <select value={interval} onChange={(e) => setInterval(e.target.value as 'MONTHLY')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
              <option value="MONTHLY">{t('Monthly')}</option>
              <option value="QUARTERLY">{t('Quarterly')}</option>
              <option value="YEARLY">{t('Yearly')}</option>
              <option value="ONE_TIME">{t('One-Time Pack')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400">{t('Class Credits (Blank=Unlimited)')}</label>
            <input type="number" value={classCredits} onChange={(e) => setClassCredits(e.target.value)} placeholder={t('Unlimited')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t('Active for sale')}
        </label>
        <div className="flex gap-2 pt-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">{t('Cancel')}</button>
          )}
          <button type="submit" disabled={isPending} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white">
            <Plus className="h-4 w-4" /> {t(isPending ? 'Saving...' : editingId ? 'Update Plan' : 'Add Plan')}
          </button>
        </div>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {plans.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">{p.name}</h3>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${p.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  {t(p.isActive ? 'ACTIVE' : 'ARCHIVED')}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">{p.description || t('Standard facility membership')}</p>
              <p className="mt-2 font-mono text-xs text-zinc-300">
                <LocaleNumber value={p.price} currency="INR" /> · {t('{count} days', { count: p.durationDays })} · {p.classCredits ? t('{count} class credits', { count: p.classCredits }) : t('Unlimited classes')}
              </p>
            </div>
            <button onClick={() => loadForEdit(p)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">
              <Pencil className="h-3.5 w-3.5" /> {t('Edit')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
