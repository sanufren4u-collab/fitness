'use server';

import { revalidatePath } from 'next/cache';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/dal';

type VendorActionResult = { success: true } | { success: false; error: string };

const createVendorSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  adminName: z.string().trim().min(2),
  adminEmail: z.string().email().transform((email) => email.toLowerCase().trim()),
  adminPassword: z.string().min(8),
});

export async function createVendorAction(
  rawInput: z.infer<typeof createVendorSchema>,
): Promise<VendorActionResult> {
  await requirePlatformAdmin();
  const parsed = createVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid vendor details.' };
  }

  const input = parsed.data;
  const [existingVendor, existingUser] = await Promise.all([
    prisma.vendor.findUnique({ where: { slug: input.slug } }),
    prisma.user.findUnique({ where: { email: input.adminEmail } }),
  ]);
  if (existingVendor) return { success: false, error: 'That vendor slug is already in use.' };
  if (existingUser) return { success: false, error: 'That admin email is already registered.' };

  try {
    const passwordHash = await hash(input.adminPassword, 12);
    await prisma.vendor.create({
      data: {
        name: input.name,
        slug: input.slug,
        gymSettings: {
          create: {
            gymName: input.name,
            timezone: 'Asia/Kolkata',
            currency: 'INR',
          },
        },
        users: {
          create: {
            name: input.adminName,
            email: input.adminEmail,
            passwordHash,
            role: UserRole.ADMIN,
          },
        },
      },
    });
    revalidatePath('/admin/vendors');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create vendor.',
    };
  }
}

const updateVendorSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  isActive: z.boolean(),
});

export async function updateVendorAction(
  rawInput: z.infer<typeof updateVendorSchema>,
): Promise<VendorActionResult> {
  await requirePlatformAdmin();
  const parsed = updateVendorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid vendor details.' };
  }

  const { id, ...data } = parsed.data;
  try {
    await prisma.vendor.update({ where: { id }, data });
    revalidatePath('/admin/vendors');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vendor.',
    };
  }
}
