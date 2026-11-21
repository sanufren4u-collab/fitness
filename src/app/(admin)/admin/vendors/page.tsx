import { prisma } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/dal';
import { VendorsManagerClient } from '@/components/admin/VendorsManagerClient';

export default async function AdminVendorsPage() {
  const admin = await requirePlatformAdmin();
  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      users: {
        where: { role: 'ADMIN' },
        select: { id: true, name: true, email: true },
      },
      _count: { select: { memberProfiles: true } },
    },
  });

  return (
    <VendorsManagerClient
      hasGymDashboard={!!admin.vendorId && !!admin.vendor?.isActive}
      vendors={vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        isActive: vendor.isActive,
        memberCount: vendor._count.memberProfiles,
        admins: vendor.users,
      }))}
    />
  );
}
