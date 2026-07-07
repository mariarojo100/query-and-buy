/**
 * Functional + business-rule tests for the admin repository (lib/db/system/admin).
 * Authorization (only admins reach these) is enforced by requireAdmin in
 * app/admin/actions.ts; here we verify the privileged operations, the audit
 * trail, and the self-guard on admin-role removal.
 */
import { db } from '@/lib/db'
import * as a from '@/lib/db/system/admin'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const boss = await makeUser({ email: 'boss@test.ae', roles: ['admin'] })
  const seller = await makeUser({ email: 'seller@test.ae' })
  const buyer = await makeUser({ email: 'buyer@test.ae' })
  const listing = await makeListing(seller.id, { title: 'Listing' })
  const report = await db.report.create({
    data: { reporterId: buyer.id, listingId: listing, reason: 'spam', status: 'open' },
    select: { id: true },
  })

  // --- listing moderation ---
  await a.setListingState(boss.id, listing, 'delete')
  ok('setListingState(delete) soft-deletes', (await db.listing.findUniqueOrThrow({ where: { id: listing }, select: { status: true } })).status === 'deleted')
  await a.setListingState(boss.id, listing, 'restore')
  ok('setListingState(restore) reactivates', (await db.listing.findUniqueOrThrow({ where: { id: listing }, select: { status: true, deletedAt: true } })).status === 'active')
  await a.setListingFeatured(boss.id, listing, true, 7)
  ok('setListingFeatured sets flag + expiry', (await db.listing.findUniqueOrThrow({ where: { id: listing }, select: { isFeatured: true } })).isFeatured === true)

  // --- user moderation ---
  await a.setUserStatus(boss.id, seller.id, 'banned')
  ok('setUserStatus bans the user', (await db.user.findUniqueOrThrow({ where: { id: seller.id }, select: { status: true } })).status === 'banned')
  ok('ban notifies the user', (await db.notification.count({ where: { userId: seller.id, type: 'account' } })) === 1)

  // --- admin role + self-guard ---
  await a.setAdminRole(boss.id, buyer.id, true)
  ok('setAdminRole promotes', (await db.userRole.count({ where: { userId: buyer.id, role: 'admin' } })) === 1)
  const selfRemove = await a.setAdminRole(boss.id, boss.id, false)
  ok('DENY: admin cannot remove own admin role', selfRemove.error !== undefined)
  await a.setAdminRole(boss.id, buyer.id, false)
  ok('setAdminRole demotes another admin', (await db.userRole.count({ where: { userId: buyer.id, role: 'admin' } })) === 0)

  // --- moderate a report (removes content + closes) ---
  await a.moderateReport(boss.id, report.id, 'remove_content')
  ok('moderateReport(remove_content) deletes the listing', (await db.listing.findUniqueOrThrow({ where: { id: listing }, select: { status: true } })).status === 'deleted')
  ok('report marked reviewed', (await db.report.findUniqueOrThrow({ where: { id: report.id }, select: { status: true } })).status === 'reviewed')

  // --- categories ---
  const dup = await a.createCategory(boss.id, { slug: 'cars', name_en: 'Cars again' })
  ok('createCategory rejects a duplicate slug', dup.error !== undefined)
  await db.category.deleteMany({ where: { slug: 'drones-test' } }) // categories are seed data (not truncated) — keep idempotent
  const created = await a.createCategory(boss.id, { slug: 'drones-test', name_en: 'Drones' })
  ok('createCategory adds a new one', created.ok === true)
  await db.category.deleteMany({ where: { slug: 'drones-test' } })

  // --- audit trail accumulated ---
  const audit = await a.listAuditLog({})
  ok('audit log recorded the admin actions', audit.total >= 6 && audit.rows.every((r) => r.adminName === 'boss'))

  // --- reads ---
  const stats = await a.getDashboardStats()
  ok('dashboard stats populated', stats.totalUsers === 3 && stats.listings >= 1)
  ok('listUsers returns users with admin flag', (await a.listUsers({})).rows.some((u) => u.email === 'boss@test.ae' && u.isAdmin))
  ok('listReports returns rows', (await a.listReports({})).length >= 1)

  summary('admin')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
