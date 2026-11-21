'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createVendorAction, updateVendorAction } from '@/actions/vendor.actions';
import { SignOutButton } from '@/components/shared/SignOutButton';

type VendorSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  memberCount: number;
  admins: Array<{ id: string; name: string; email: string }>;
};

function VendorRow({ vendor }: { vendor: VendorSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(vendor.name);
  const [slug, setSlug] = useState(vendor.slug);
  const [error, setError] = useState('');

  function save(isActive: boolean) {
    startTransition(async () => {
      const result = await updateVendorAction({ id: vendor.id, name, slug, isActive });
      setError(result.success ? '' : result.error);
      if (result.success) router.refresh();
    });
  }

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs text-zinc-400">
          Business name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-zinc-400">
          Account slug
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => save(vendor.isActive)}
            disabled={isPending}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => save(!vendor.isActive)}
            disabled={isPending}
            className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
              vendor.isActive ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {vendor.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
        <span>{vendor.memberCount} members · {vendor.slug}</span>
        <span>
          Admins: {vendor.admins.length
            ? vendor.admins.map((admin) => `${admin.name} (${admin.email})`).join(', ')
            : 'No gym admin'}
        </span>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    </article>
  );
}

export function VendorsManagerClient({
  vendors,
  hasGymDashboard,
}: {
  vendors: VendorSummary[];
  hasGymDashboard: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await createVendorAction({ name, slug, adminName, adminEmail, adminPassword });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName('');
      setSlug('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-rose-400">Platform administration</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Fitness vendors</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage separate gym accounts and their gym administrators.</p>
          </div>
          <div className="flex items-center gap-3">
            {hasGymDashboard && <Link href="/admin/dashboard" className="text-xs text-zinc-300 hover:text-white">Gym dashboard</Link>}
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Create a vendor</h2>
          <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Gym or business name" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
            <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="account-slug" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
            <input required minLength={2} value={adminName} onChange={(event) => setAdminName(event.target.value)} placeholder="Gym admin name" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
            <input required type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="Gym admin email" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
            <input required minLength={8} type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Initial password (8+ characters)" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
            <button type="submit" disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {isPending ? 'Creating...' : 'Create vendor'}
            </button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Vendor accounts ({vendors.length})</h2>
          {vendors.map((vendor) => <VendorRow key={vendor.id} vendor={vendor} />)}
        </section>
      </div>
    </main>
  );
}
