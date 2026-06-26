'use client'

import Link from 'next/link'
import { RowMenu } from '@/components/admin/RowMenu'
import {
  moderateReport,
  removeReview,
  setAdminRole,
  setAiOverride,
  setListingFeatured,
  setListingState,
  setUserStatus,
} from '@/app/admin/actions'

export function ListingRowActions({
  id,
  status,
  featured,
}: {
  id: string
  status: string
  featured: boolean
}) {
  return (
    <RowMenu
      actions={[
        status !== 'active' && status !== 'deleted'
          ? { label: 'Restore', run: () => setListingState(id, 'restore') }
          : null,
        status === 'active' ? { label: 'Hide', run: () => setListingState(id, 'hide') } : null,
        {
          label: featured ? 'Remove featured' : 'Feature (7 days)',
          run: () => setListingFeatured(id, !featured, featured ? undefined : 7),
        },
        { label: 'Mark inappropriate', run: () => setListingState(id, 'inappropriate'), danger: true },
        {
          label: 'Delete',
          run: () => setListingState(id, 'delete'),
          danger: true,
          confirm: 'Delete this listing? It will be removed from the marketplace.',
        },
      ]}
    />
  )
}

export function UserRowActions({
  id,
  status,
  isAdmin,
}: {
  id: string
  status: string
  isAdmin: boolean
}) {
  return (
    <RowMenu
      actions={[
        status !== 'active' ? { label: 'Restore account', run: () => setUserStatus(id, 'active') } : null,
        status === 'active'
          ? { label: 'Suspend', run: () => setUserStatus(id, 'suspended') }
          : null,
        status !== 'banned'
          ? { label: 'Ban', run: () => setUserStatus(id, 'banned'), danger: true, confirm: 'Ban this user?' }
          : null,
        isAdmin
          ? { label: 'Remove admin', run: () => setAdminRole(id, false), danger: true }
          : { label: 'Promote to admin', run: () => setAdminRole(id, true) },
      ]}
    />
  )
}

export function ReviewRowActions({ id }: { id: string }) {
  return (
    <RowMenu
      actions={[
        {
          label: 'Remove review',
          run: () => removeReview(id),
          danger: true,
          confirm: 'Remove this review permanently?',
        },
      ]}
    />
  )
}

export function ModerationRowActions({ reportId }: { reportId: string }) {
  return (
    <RowMenu
      actions={[
        { label: 'Dismiss', run: () => moderateReport(reportId, 'dismiss') },
        { label: 'Remove content', run: () => moderateReport(reportId, 'remove_content'), danger: true },
        { label: 'Warn user', run: () => moderateReport(reportId, 'warn') },
        { label: 'Suspend user', run: () => moderateReport(reportId, 'suspend'), danger: true },
        {
          label: 'Permanently ban',
          run: () => moderateReport(reportId, 'ban'),
          danger: true,
          confirm: 'Ban the reported user?',
        },
      ]}
    />
  )
}

export function AiRowActions({ id }: { id: string }) {
  return (
    <RowMenu
      actions={[
        { label: 'Approve (override)', run: () => setAiOverride(id, 'approved') },
        { label: 'Reject (override)', run: () => setAiOverride(id, 'rejected'), danger: true },
      ]}
    />
  )
}

export function ViewListingLink({ id }: { id: string }) {
  return (
    <Link href={`/listing/${id}`} className="text-sm text-primary hover:underline" target="_blank">
      View
    </Link>
  )
}
