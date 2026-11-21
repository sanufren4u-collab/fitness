'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QrCode, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from '@/components/shared/LocaleProvider';

export default function KioskScannerPage() {
  const t = useTranslation();
  const [tokenInput, setTokenInput] = useState('');
  const [result, setResult] = useState<{ granted: boolean; memberName?: string; planName?: string; reason?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setLoading(true);
    let cleanToken = tokenInput.trim();
    try {
      const parsed = JSON.parse(cleanToken);
      if (parsed.token) cleanToken = parsed.token;
    } catch {}

    const res = await fetch('/api/kiosk/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    setTokenInput('');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
        <QrCode className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-3 text-2xl font-bold text-white">{t('Front-Desk Access Kiosk')}</h1>
        <p className="mt-1 text-xs text-zinc-400">{t('Paste or scan a Member QR Token from Admin → Members')}</p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder={t('Scan QR payload or paste qrSecretToken...')}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-center font-mono text-sm text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-semibold text-white hover:bg-rose-500"
          >
            {loading ? t('Verifying Pass...') : t('Verify Member Check-In')}
          </button>
        </form>

        {result && (
          <div className={`mt-6 rounded-xl border p-4 ${result.granted ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
            {result.granted ? (
              <div className="flex flex-col items-center text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
                <p className="mt-2 text-lg font-bold text-white">{t('Access Granted: {name}', { name: result.memberName ?? '' })}</p>
                <p className="text-xs">{result.planName}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-rose-400">
                <XCircle className="h-8 w-8" />
                <p className="mt-2 text-lg font-bold text-white">{t('Access Denied')}</p>
                <p className="text-xs font-mono">{result.reason ? t(result.reason) : ''}</p>
              </div>
            )}
          </div>
        )}

        <Link href="/admin/dashboard" className="mt-6 inline-block text-xs text-zinc-400 hover:underline">
          ← {t('Exit Kiosk to Admin Dashboard')}
        </Link>
      </div>
    </div>
  );
}
