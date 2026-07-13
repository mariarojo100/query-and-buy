'use server'

import { revalidatePath } from 'next/cache'
import { getIsAdmin } from '@/lib/admin/gate'
import * as admin from '@/lib/db/system/admin'

type R = { ok?: boolean; error?: string }

/** Resolve the acting admin, or an error. Authorization gate for every mutation. */
async function requireAdminId(): Promise<{ adminId: string } | { error: string }> {
  const { user, isAdmin } = await getIsAdmin()
  if (!user || !isAdmin) return { error: 'Not authorized.' }
  return { adminId: user.id }
}

function revalidateAdmin() {
  for (const p of [
    '/admin',
    '/admin/listings',
    '/admin/users',
    '/admin/moderation',
    '/admin/orders',
    '/admin/reviews',
    '/admin/categories',
    '/admin/audit',
    '/admin/ai',
    '/admin/settings',
  ])
    revalidatePath(p)
  revalidatePath('/')
}

async function run(fn: (adminId: string) => Promise<R>, extra?: () => void): Promise<R> {
  const g = await requireAdminId()
  if ('error' in g) return g
  try {
    const res = await fn(g.adminId)
    if (res.ok) {
      revalidateAdmin()
      extra?.()
    }
    return res
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Action failed.' }
  }
}

/* ----------------------------- listings ----------------------------- */
export async function setListingState(id: string, op: 'hide' | 'restore' | 'delete' | 'inappropriate'): Promise<R> {
  return run((adminId) => admin.setListingState(adminId, id, op))
}
export async function setListingFeatured(id: string, featured: boolean, days?: number): Promise<R> {
  return run((adminId) => admin.setListingFeatured(adminId, id, featured, days))
}

/* ----------------------------- users ----------------------------- */
export async function setUserStatus(id: string, status: 'active' | 'suspended' | 'banned'): Promise<R> {
  return run((adminId) => admin.setUserStatus(adminId, id, status))
}
export async function setAdminRole(id: string, makeAdmin: boolean): Promise<R> {
  return run((adminId) => admin.setAdminRole(adminId, id, makeAdmin))
}

/* ----------------------------- moderation ----------------------------- */
export async function moderateReport(
  reportId: string,
  action: 'dismiss' | 'remove_content' | 'warn' | 'suspend' | 'ban',
  notes?: string,
): Promise<R> {
  return run((adminId) => admin.moderateReport(adminId, reportId, action, notes), () => revalidatePath('/admin/moderation'))
}

/* ----------------------------- reviews ----------------------------- */
export async function removeReview(id: string): Promise<R> {
  return run((adminId) => admin.removeReview(adminId, id), () => revalidatePath('/admin/reviews'))
}

/* ----------------------------- AI moderation ----------------------------- */
export async function setAiOverride(id: string, override: 'approved' | 'rejected'): Promise<R> {
  return run((adminId) => admin.setAiOverride(adminId, id, override), () => revalidatePath('/admin/ai'))
}

/* ----------------------------- categories ----------------------------- */
export async function createCategory(input: { slug: string; name_en: string; name_ar?: string }): Promise<R> {
  return run((adminId) => admin.createCategory(adminId, input), () => revalidatePath('/admin/categories'))
}
export async function updateCategory(id: string, name_en: string): Promise<R> {
  return run((adminId) => admin.updateCategory(adminId, id, name_en), () => revalidatePath('/admin/categories'))
}
export async function toggleCategory(id: string, isActive: boolean): Promise<R> {
  return run((adminId) => admin.toggleCategory(adminId, id, isActive), () => revalidatePath('/admin/categories'))
}
export async function moveCategory(id: string, dir: 'up' | 'down'): Promise<R> {
  return run((adminId) => admin.moveCategory(adminId, id, dir), () => revalidatePath('/admin/categories'))
}

/* ----------------------------- settings ----------------------------- */
export async function updateSettings(patch: {
  marketplace_name?: string
  contact_email?: string
  support_email?: string
  terms_url?: string
  privacy_url?: string
  maintenance_mode?: boolean
}): Promise<R> {
  return run((adminId) => admin.updateSettings(adminId, patch), () => revalidatePath('/admin/settings'))
}
