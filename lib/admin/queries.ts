/**
 * Admin dashboard reads. Authorized by requireAdmin at the /admin page loaders;
 * the implementations live in the privileged system repository.
 */
export {
  PAGE_SIZE,
  getDashboardStats,
  listListings,
  listUsers,
  listOrders,
  listReviews,
  listReports,
  listAuditLog,
  listAiModeration,
  listAdminCategories,
  getSettings,
  getAnalytics,
} from '@/lib/db/system/admin'

export type {
  DashboardStats,
  AdminListing,
  ListingFilters,
  AdminUser,
  AdminOrder,
  AdminReview,
  AdminReportRow,
  AuditEntry,
  AiModerationEntry,
  AdminCategory,
  MarketplaceSettings,
  Series,
  Analytics,
} from '@/lib/db/system/admin'
