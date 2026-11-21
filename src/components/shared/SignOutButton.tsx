'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { useTranslation } from '@/components/shared/LocaleProvider';

export function SignOutButton() {
  const t = useTranslation();

  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" />
      {t('Sign Out')}
    </button>
  );
}
