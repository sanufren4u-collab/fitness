'use client';

import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, PauseCircle, AlertCircle, Calendar } from 'lucide-react';
import { LocaleDate, useTranslation } from '@/components/shared/LocaleProvider';

interface MemberPassProps {
  memberName: string;
  qrSecretToken: string;
  planName: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'PAST_DUE' | 'CANCELLED';
  endDateFormatted: string | null;
  remainingCredits: number | null;
}

export function MemberPassCard({
  memberName,
  qrSecretToken,
  planName,
  status,
  endDateFormatted,
  remainingCredits,
}: MemberPassProps) {
  const t = useTranslation();
  const isAccessible = status === 'ACTIVE';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {t('Member Access Pass')}
          </span>
          <h2 className="text-xl font-bold text-white">{memberName}</h2>
        </div>

        {status === 'ACTIVE' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> {t('Active')}
          </span>
        )}
        {status === 'PAUSED' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
            <PauseCircle className="h-4 w-4" /> {t('Frozen')}
          </span>
        )}
        {status !== 'ACTIVE' && status !== 'PAUSED' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4" /> {t(status)}
          </span>
        )}
      </div>

      <div className="my-6 flex flex-col items-center justify-center">
        <div className={`rounded-2xl bg-white p-4 shadow-inner ${!isAccessible ? 'opacity-40 grayscale' : ''}`}>
          <QRCodeSVG value={JSON.stringify({ token: qrSecretToken })} size={180} level="H" />
        </div>
        <p className="mt-3 font-mono text-xs text-zinc-400">
          {isAccessible ? t('Scan at front desk turnstile or kiosk') : t('Access suspended — renew plan')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-4 text-xs">
        <div>
          <span className="text-zinc-500">{t('Current Tier')}</span>
          <p className="mt-0.5 font-medium text-zinc-200">{t(planName)}</p>
        </div>
        <div className="text-right">
          <span className="text-zinc-500">{remainingCredits !== null ? t('Credits Left') : t('Valid Through')}</span>
          <p className="mt-0.5 inline-flex items-center justify-end gap-1 font-mono font-medium text-zinc-200">
            {remainingCredits !== null ? t('{count} Classes', { count: remainingCredits }) : (
              <>
                <Calendar className="h-3.5 w-3.5 text-rose-500" />
                {endDateFormatted ? <LocaleDate value={endDateFormatted} format="date" /> : '—'}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
