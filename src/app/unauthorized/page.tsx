import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { T } from '@/components/shared/LocaleProvider';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
      <ShieldAlert className="h-12 w-12 text-rose-500" />
      <h1 className="mt-4 text-2xl font-bold text-white"><T message="Access Restricted" /></h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        <T message="Your account role does not have permission to view this portal." />
      </p>
      <Link href="/" className="mt-6 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white">
        <T message="Return to My Dashboard" />
      </Link>
    </div>
  );
}
