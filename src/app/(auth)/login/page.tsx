'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { useTranslation } from '@/components/shared/LocaleProvider';

export default function LoginPage() {
  const t = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('admin@ironpulse.io');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(t('Invalid email or password.'));
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="login-shell min-h-screen text-zinc-100">
      <section className="login-hero" aria-label="Power Gym">
        <div className="login-hero-grid" aria-hidden="true" />
        <div className="login-hero-content">
          <div className="login-brand">
            <span className="login-brand-mark"><Dumbbell aria-hidden="true" className="h-5 w-5" /></span>
            <span>Power Gym <span className="font-normal text-white/55">OS</span></span>
          </div>

          <div className="login-headline">
            <p className="login-eyebrow">{t('GYM OPERATIONS, REIMAGINED')}</p>
            <h1>{t('Manage Less.')}<br /><span>{t('Train More.')}</span></h1>
            <p className="login-hero-copy">{t('The smarter way to run your gym, coach your people, and keep every goal in motion.')}</p>
          </div>

          <div className="login-hero-art" aria-hidden="true">
            <div className="login-art-orbit login-art-orbit-one" />
            <div className="login-art-orbit login-art-orbit-two" />
            <div className="login-art-glow" />
            <div className="login-art-plate login-art-plate-one" />
            <div className="login-art-plate login-art-plate-two" />
            <Dumbbell className="login-art-dumbbell" strokeWidth={1.1} />
            <span className="login-art-caption">{t('MOVE WITH PURPOSE')}</span>
          </div>

          <div className="login-hero-footer">
            <span className="login-live-dot" />
            <span>{t('STRENGTH · CONSISTENCY · PROGRESS')}</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-mobile-brand">
            <span className="login-brand-mark"><Dumbbell aria-hidden="true" className="h-5 w-5" /></span>
            <span>Power Gym <span className="font-normal text-white/55">OS</span></span>
          </div>

          <div className="login-card-heading">
            <p className="login-card-kicker">{t('YOUR TRAINING HQ')}</p>
            <h2>{t('Sign in to your portal')}</h2>
            <p>{t('Pick up where your next personal best begins.')}</p>
          </div>

          <p className="login-demo-copy">{t('Demo: admin@ironpulse.io · coach@ironpulse.io · member@ironpulse.io')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: 'Admin', mail: 'admin@ironpulse.io' },
              { label: 'Trainer', mail: 'coach@ironpulse.io' },
              { label: 'Member', mail: 'member@ironpulse.io' },
            ].map((preset) => (
              <button
                key={preset.mail}
                type="button"
                onClick={() => { setEmail(preset.mail); setPassword('Password123!'); }}
                className="rounded-lg border border-zinc-700/80 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-white"
              >
                {t('Fill {label}', { label: t(preset.label) })}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">{error}</p>}
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-zinc-300">{t('Email')}</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-zinc-300">{t('Password')}</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="login-submit w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t('Signing in...') : t('Sign In')}
              {!loading && <span aria-hidden="true" className="ml-2">↗</span>}
            </button>
          </form>
          <p className="login-footnote">{t('MADE FOR THE WORK BEHIND EVERY WIN')}</p>
        </div>
      </section>
    </main>
  );
}
