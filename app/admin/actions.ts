'use server'

import { revalidatePath } from 'next/cache'
import { getIsAdmin } from '@/lib/admin/gate'
import { createServiceClient } from '@/utils/supabase/admin'

type R = { ok?: boolean; error?: string }
type DB = ReturnType<typeof createServiceClient>

async function withAdmin(): Promise<{ db: DB; adminId: string } | { error: string }> {
  const { user, isAdmin } = await getIsAdmin()
  if (!user || !isAdmin) return { error: 'Not authorized.' }
  try {
    return { db: createServiceClient(), adminId: user.id }
  } catch {
    return { error: 'Admin is not configured (service role key missing).' }
  }
}

async function logAudit(
  db: DB,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  detail: Record<string, unknown> = {},
) {
  try {
    await db
      .from('admin_audit_log')
      .insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, detail: detail as never })
  } catch {
    /* audit logging must never block the action */
  }
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

/* ----------------------------- listings ----------------------------- */
export async function setListingState(
  id: string,
  op: 'hide' | 'restore' | 'delete' | 'inappropriate',
): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const patch =
    op === 'restore'
      ? { status: 'active', deleted_at: null }
      : op === 'delete'
        ? { status: 'deleted', deleted_at: new Date().toISOString() }
        : { status: 'rejected' } // hide + mark inappropriate both remove from feed
  const { error } = await g.db.from('listings').update(patch).eq('id', id)
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, `listing_${op}`, 'listing', id)
  revalidateAdmin()
  return { ok: true }
}

export async function setListingFeatured(
  id: string,
  featured: boolean,
  days?: number,
): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const featured_until =
    featured && days ? new Date(Date.now() + days * 86_400_000).toISOString() : null
  const { error } = await g.db
    .from('listings')
    .update({ is_featured: featured, featured_until })
    .eq('id', id)
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, featured ? 'listing_feature' : 'listing_unfeature', 'listing', id, {
    days: days ?? null,
  })
  revalidateAdmin()
  return { ok: true }
}

/* ----------------------------- users ----------------------------- */
export async function setUserStatus(
  id: string,
  status: 'active' | 'suspended' | 'banned',
): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const { error } = await g.db.from('users').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, `user_${status}`, 'user', id)
  if (status !== 'active') {
    try {
      await g.db.from('notifications').insert({
        user_id: id,
        type: 'account',
        title: status === 'banned' ? 'Your account was banned' : 'Your account was suspended',
        body: 'Contact support if you believe this is a mistake.',
        link: '/account',
      })
    } catch {
      /* ignore */
    }
  }
  revalidateAdmin()
  return { ok: true }
}

export async function setAdminRole(id: string, makeAdmin: boolean): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  if (makeAdmin) {
    const { error } = await g.db
      .from('user_roles')
      .upsert({ user_id: id, role: 'admin', granted_by: g.adminId }, { onConflict: 'user_id,role' })
    if (error) return { error: error.message }
  } else {
    if (id === g.adminId) return { error: "You can't remove your own admin role." }
    const { error } = await g.db
      .from('user_roles')
      .delete()
      .eq('user_id', id)
      .in('role', ['admin', 'super_admin'])
    if (error) return { error: error.message }
  }
  await logAudit(g.db, g.adminId, makeAdmin ? 'user_promote_admin' : 'user_remove_admin', 'user', id)
  revalidateAdmin()
  return { ok: true }
}

/* ----------------------------- moderation ----------------------------- */
export async function moderateReport(
  reportId: string,
  action: 'dismiss' | 'remove_content' | 'warn' | 'suspend' | 'ban',
  notes?: string,
): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g

  const { data: rep } = await g.db
    .from('reports')
    .select('id, listing_id, reported_user_id')
    .eq('id', reportId)
    .maybeSingle()
  const report = rep as { listing_id: string | null; reported_user_id: string | null } | null
  if (!report) return { error: 'Report not found.' }

  if (action === 'remove_content' && report.listing_id) {
    await g.db
      .from('listings')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', report.listing_id)
  }
  if ((action === 'suspend' || action === 'ban') && report.reported_user_id) {
    await g.db
      .from('users')
      .update({ status: action === 'ban' ? 'banned' : 'suspended' })
      .eq('id', report.reported_user_id)
  }
  if (action === 'warn' && report.reported_user_id) {
    try {
      await g.db.from('notifications').insert({
        user_id: report.reported_user_id,
        type: 'account',
        title: 'Warning from Query & Buy',
        body: notes || 'A report about your activity was reviewed by our team.',
        link: '/account',
      })
    } catch {
      /* ignore */
    }
  }

  const status = action === 'dismiss' ? 'closed' : 'reviewed'
  await g.db.from('reports').update({ status, admin_notes: notes ?? null }).eq('id', reportId)
  await logAudit(g.db, g.adminId, `report_${action}`, 'report', reportId, { notes: notes ?? null })
  revalidateAdmin()
  revalidatePath('/admin/moderation')
  return { ok: true }
}

/* ----------------------------- reviews ----------------------------- */
export async function removeReview(id: string): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const { error } = await g.db.from('reviews').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, 'review_remove', 'review', id)
  revalidateAdmin()
  revalidatePath('/admin/reviews')
  return { ok: true }
}

/* ----------------------------- AI moderation ----------------------------- */
export async function setAiOverride(id: string, override: 'approved' | 'rejected'): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const { error } = await g.db.from('ai_moderation_log').update({ human_override: override }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, `ai_override_${override}`, 'ai_moderation', id)
  revalidateAdmin()
  revalidatePath('/admin/ai')
  return { ok: true }
}

/* ----------------------------- categories ----------------------------- */
export async function createCategory(input: {
  slug: string
  name_en: string
  name_ar?: string
}): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  if (!slug || !input.name_en.trim()) return { error: 'Slug and English name are required.' }
  const { data: max } = await g.db
    .from('categories')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const position = ((max as { position?: number } | null)?.position ?? 0) + 1
  const { error } = await g.db.from('categories').insert({
    slug,
    name_en: input.name_en.trim(),
    name_ar: input.name_ar?.trim() || input.name_en.trim(),
    position,
    is_active: true,
  })
  if (error) return { error: error.code === '23505' ? 'That slug already exists.' : error.message }
  await logAudit(g.db, g.adminId, 'category_create', 'category', slug)
  revalidatePath('/admin/categories')
  revalidatePath('/')
  return { ok: true }
}

export async function updateCategory(id: string, name_en: string): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  if (!name_en.trim()) return { error: 'Name is required.' }
  const { error } = await g.db.from('categories').update({ name_en: name_en.trim() }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, 'category_update', 'category', id)
  revalidatePath('/admin/categories')
  revalidatePath('/')
  return { ok: true }
}

export async function toggleCategory(id: string, isActive: boolean): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const { error } = await g.db.from('categories').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, isActive ? 'category_show' : 'category_hide', 'category', id)
  revalidatePath('/admin/categories')
  revalidatePath('/')
  return { ok: true }
}

export async function moveCategory(id: string, dir: 'up' | 'down'): Promise<R> {
  const g = await withAdmin()
  if ('error' in g) return g
  const { data } = await g.db
    .from('categories')
    .select('id, position, parent_id')
    .order('position', { ascending: true })
  const all = (data ?? []) as { id: string; position: number; parent_id: string | null }[]
  const me = all.find((c) => c.id === id)
  if (!me) return { error: 'Category not found.' }
  const siblings = all.filter((c) => c.parent_id === me.parent_id)
  const idx = siblings.findIndex((c) => c.id === id)
  const swapWith = dir === 'up' ? siblings[idx - 1] : siblings[idx + 1]
  if (!swapWith) return { ok: true }
  await Promise.all([
    g.db.from('categories').update({ position: swapWith.position }).eq('id', me.id),
    g.db.from('categories').update({ position: me.position }).eq('id', swapWith.id),
  ])
  await logAudit(g.db, g.adminId, 'category_reorder', 'category', id, { dir })
  revalidatePath('/admin/categories')
  revalidatePath('/')
  return { ok: true }
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
  const g = await withAdmin()
  if ('error' in g) return g
  const { error } = await g.db
    .from('marketplace_settings')
    .update({ ...patch })
    .eq('id', 'global')
  if (error) return { error: error.message }
  await logAudit(g.db, g.adminId, 'settings_update', 'settings', 'global', patch)
  revalidatePath('/admin/settings')
  return { ok: true }
}
