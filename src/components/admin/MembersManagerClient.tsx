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
import { UserPlus, Pencil, CreditCard, PauseCircle, PlayCircle, Trash2, X, Mail, MessageCircle } from 'lucide-react';
import { intlLocale } from '@/lib/i18n';
import { LocaleDate, useLocale, useTranslation } from '@/components/shared/LocaleProvider';

interface MemberRow {
  userId: string;
  memberProfileId: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  qrSecretToken: string;
  fitnessGoal: string;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
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
  const t = useTranslation();
  const locale = useLocale();
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
  const [newEmailNotifications, setNewEmailNotifications] = useState(true);
  const [newWhatsappNotifications, setNewWhatsappNotifications] = useState(true);
  const [newTrainerId, setNewTrainerId] = useState(trainers[0]?.id ?? '');
  const [newPlanId, setNewPlanId] = useState(plans[0]?.id ?? '');
  const [newPayMethod, setNewPayMethod] = useState<'UPI' | 'CASH' | 'POS_TERMINAL' | 'STRIPE_CARD'>('UPI');

  // Edit Member Form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editEmailNotifications, setEditEmailNotifications] = useState(true);
  const [editWhatsappNotifications, setEditWhatsappNotifications] = useState(true);
  const [editTrainerId, setEditTrainerId] = useState('');
  const [editActive, setEditActive] = useState(true);

  // POS Renew Form
  const [posPlanId, setPosPlanId] = useState(plans[0]?.id ?? '');
  const [posMethod, setPosMethod] = useState<'UPI' | 'CASH' | 'POS_TERMINAL' | 'BANK_TRANSFER'>('UPI');
  const [posNotes, setPosNotes] = useState('');

  function formatPrice(amount: number) {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function openEmail(m: MemberRow) {
    if (!m.emailNotifications) return;
    const subject = encodeURIComponent(`Power Gym notification for ${m.name}`);
    window.open(`mailto:${encodeURIComponent(m.email)}?subject=${subject}`, '_self');
  }

  function openWhatsapp(m: MemberRow) {
    if (!m.whatsappNotifications || !m.phone) return;
    const phone = m.phone.replace(/\D/g, '').replace(/^0/, '');
    const message = encodeURIComponent(
      `Hello ${m.name}, this is Power Gym regarding your membership and payment status.`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
  }

  function openEdit(m: MemberRow) {
    setEditing(m);
    setEditName(m.name);
    setEditEmail(m.email);
    setEditPhone(m.phone);
    setEditGoal(m.fitnessGoal);
    setEditEmailNotifications(m.emailNotifications);
    setEditWhatsappNotifications(m.whatsappNotifications);
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
        emailNotifications: newEmailNotifications,
        whatsappNotifications: newWhatsappNotifications,
        assignedTrainerId: newTrainerId || undefined,
        planId: newPlanId || undefined,
        paymentMethod: newPayMethod,
      });
      if (!res.success) {
        setError(t(res.error ?? 'Error creating member'));
        return;
      }
      setShowAdd(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewGoal('');
      setBanner(t('Member created and initial pass activated!'));
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
        email: editEmail,
        phone: editPhone,
        fitnessGoal: editGoal,
        emailNotifications: editEmailNotifications,
        whatsappNotifications: editWhatsappNotifications,
        assignedTrainerId: editTrainerId || undefined,
        isActive: editActive,
      });
      if (!res.success) {
        setError(t(res.error ?? 'Error updating member'));
        return;
      }
      setEditing(null);
      setBanner(t('Member profile updated.'));
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
        setError(t('Failed to record POS payment'));
        return;
      }
      setPosTarget(null);
      setPosNotes('');
      setBanner(t('Payment recorded! Receipt {number} generated.', { number: res.invoiceNumber ?? '' }));
    });
  }

  function handleFreezeToggle(membershipId: string, currentStatus: string) {
    startTransition(async () => {
      const action = currentStatus === 'PAUSED' ? 'RESUME' : 'PAUSE';
      await toggleMembershipFreezeAction(membershipId, action, 'Admin front-desk update');
      setBanner(t(action === 'PAUSE' ? 'Membership frozen.' : 'Membership resumed & end date extended.'));
    });
  }

  function handleDelete(userId: string, name: string) {
    startTransition(async () => {
      const res = await deleteMemberAction(userId);
      if (!res.success) {
        setError(t(res.error ?? 'Could not delete member'));
      } else {
        setBanner(t('Removed {name}.', { name }));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('Members, POS & Passes')}</h1>
          <p className="text-sm text-zinc-400">{t('Add new gym members, edit profiles, freeze plans, or collect POS payments')}</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(null); }}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
        >
          <UserPlus className="h-4 w-4" /> {t('Add New Member')}
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
              <th className="pb-3">{t('Member')}</th>
              <th className="pb-3">{t('Coach')}</th>
              <th className="pb-3">{t('Plan & Status')}</th>
              <th className="pb-3">{t('QR Pass Token')}</th>
              <th className="pb-3 text-right">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {members.map((m) => (
              <tr key={m.userId} className="hover:bg-zinc-800/30">
                <td className="py-3.5">
                  <div className="font-semibold text-white">
                    {m.name} {!m.isActive && <span className="ml-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-400">{t('INACTIVE')}</span>}
                  </div>
                  <div className="text-xs text-zinc-400">{m.email} {m.phone ? `· ${m.phone}` : ''}</div>
                </td>
                <td className="py-3.5 text-xs text-zinc-300">{m.assignedTrainerName || t('Unassigned')}</td>
                <td className="py-3.5">
                  {m.latestMembership ? (
                    <div>
                      <span className="text-xs font-medium text-zinc-200">{m.latestMembership.planName}</span>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className={`font-semibold ${m.latestMembership.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {t(m.latestMembership.status)}
                        </span>
                        <span className="font-mono text-zinc-500">{t('exp {date}', { date: '' })}<LocaleDate value={m.latestMembership.endDate} format="date" /></span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">{t('No Plan')}</span>
                  )}
                </td>
                <td className="py-3.5 font-mono text-xs text-zinc-400">{m.qrSecretToken}</td>
                <td className="py-3.5 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1.5">
                    <button
                      onClick={() => openEmail(m)}
                      disabled={!m.emailNotifications}
                      title={m.emailNotifications ? t('Send Email') : t('Email notifications disabled')}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-sky-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Mail className="h-3.5 w-3.5" /> {t('Email')}
                    </button>
                    <button
                      onClick={() => openWhatsapp(m)}
                      disabled={!m.whatsappNotifications || !m.phone}
                      title={!m.phone ? t('Phone number missing') : m.whatsappNotifications ? t('Open WhatsApp') : t('WhatsApp notifications disabled')}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </button>
                    <button
                      onClick={() => openEdit(m)}
                      title={t('Edit Member')}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                    >
                      <Pencil className="h-3.5 w-3.5" /> {t('Edit')}
                    </button>
                    <button
                      onClick={() => { setPosTarget(m); setError(null); }}
                      title={t('Renew / Record Payment')}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> {t('Renew/POS')}
                    </button>
                    {m.latestMembership && (m.latestMembership.status === 'ACTIVE' || m.latestMembership.status === 'PAUSED') && (
                      <button
                        onClick={() => handleFreezeToggle(m.latestMembership!.id, m.latestMembership!.status)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-zinc-800"
                      >
                        {m.latestMembership.status === 'PAUSED' ? (
                          <><PlayCircle className="h-3.5 w-3.5" /> {t('Unfreeze')}</>
                        ) : (
                          <><PauseCircle className="h-3.5 w-3.5" /> {t('Freeze')}</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.userId, m.name)}
                      disabled={isPending}
                      title={t('Delete Member')}
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
              <h2 className="text-lg font-bold text-white">{t('Onboard New Member')}</h2>
              <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">{t('Full Name *')}</label>
                  <input required value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">{t('Email')} *</label>
                  <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">{t('Phone')}</label>
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">{t('Assigned Coach')}</label>
                  <select value={newTrainerId} onChange={(e) => setNewTrainerId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                    <option value="">{t('None')}</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400">{t('Fitness Goal')}</label>
                <input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder={t('e.g., Hypertrophy & 5K endurance')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300">
                  <input type="checkbox" checked={newEmailNotifications} onChange={(e) => setNewEmailNotifications(e.target.checked)} />
                  {t('Email notifications')}
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300">
                  <input type="checkbox" checked={newWhatsappNotifications} onChange={(e) => setNewWhatsappNotifications(e.target.checked)} />
                  {t('WhatsApp notifications')}
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">{t('Initial Membership Plan')}</label>
                  <select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                    <option value="">{t('No Plan Yet')}</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatPrice(p.price)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">{t('POS Payment Method')}</label>
                  <select value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value as 'UPI')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                    <option value="UPI">UPI</option>
                    <option value="CASH">{t('Cash')}</option>
                    <option value="POS_TERMINAL">{t('Card Terminal')}</option>
                    <option value="STRIPE_CARD">{t('Online Card')}</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">{t('Default login password for new members:')} <code className="text-zinc-300">Password123!</code></p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300">{t('Cancel')}</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
                  {isPending ? t('Saving...') : t('Create Member')}
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
              <h2 className="text-lg font-bold text-white">{t('Edit {name}', { name: editing.name })}</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs text-zinc-400">{t('Full Name')}</label>
                <input required value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">{t('Email')}</label>
                <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">{t('Phone')}</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">{t('Assigned Trainer')}</label>
                <select value={editTrainerId} onChange={(e) => setEditTrainerId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                  <option value="">{t('None')}</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">{t('Fitness Goal')}</label>
                <input value={editGoal} onChange={(e) => setEditGoal(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300">
                  <input type="checkbox" checked={editEmailNotifications} onChange={(e) => setEditEmailNotifications(e.target.checked)} />
                  {t('Email notifications')}
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300">
                  <input type="checkbox" checked={editWhatsappNotifications} onChange={(e) => setEditWhatsappNotifications(e.target.checked)} />
                  {t('WhatsApp notifications')}
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                {t('Account Active (allow login & turnstile access)')}
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300">{t('Cancel')}</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
                  {isPending ? t('Updating...') : t('Save Changes')}
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
              <h2 className="text-lg font-bold text-white">{t('POS Renewal — {name}', { name: posTarget.name })}</h2>
              <button onClick={() => setPosTarget(null)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <form onSubmit={handlePosRenew} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs text-zinc-400">{t('Select Plan')}</label>
                <select value={posPlanId} onChange={(e) => setPosPlanId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)} ({t('{count} days', { count: p.durationDays })})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">{t('Payment Method')}</label>
                <select value={posMethod} onChange={(e) => setPosMethod(e.target.value as 'UPI')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                  <option value="UPI">UPI</option>
                  <option value="CASH">{t('Cash')}</option>
                  <option value="POS_TERMINAL">{t('POS Card Terminal')}</option>
                  <option value="BANK_TRANSFER">{t('Bank Transfer')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">{t('Receipt Notes')}</label>
                <input value={posNotes} onChange={(e) => setPosNotes(e.target.value)} placeholder={t('Optional reference ID')} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPosTarget(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300">{t('Cancel')}</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
                  {isPending ? t('Recording...') : t('Confirm Payment & Extend')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
