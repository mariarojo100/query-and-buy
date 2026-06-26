import { listReviews, PAGE_SIZE } from '@/lib/admin/queries'
import { formatRelativeTime } from '@/lib/format'
import { AdminEmpty, AdminPageHeader, Pagination } from '@/components/admin/ui'
import { Stars } from '@/components/reviews/Stars'
import { ReviewRowActions } from '@/components/admin/RowActions'

export const metadata = { title: 'Reviews · Admin' }

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Number(sp.page ?? 0) || 0
  const { rows, total } = await listReviews({ page })

  return (
    <>
      <AdminPageHeader title="Reviews" subtitle={`${total.toLocaleString('en-AE')} reviews`} />

      {rows.length === 0 ? (
        <AdminEmpty message="No reviews yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Reviewer → Reviewee</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.reviewerName}</span>
                    <span className="text-muted-foreground"> → {r.revieweeName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Stars value={r.rating} size="size-3.5" />
                  </td>
                  <td className="px-4 py-3 max-w-[320px] text-muted-foreground">
                    {r.review_text ? (
                      <span className="line-clamp-2">{r.review_text}</span>
                    ) : (
                      <span className="italic">No text</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <ReviewRowActions id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/reviews" params={sp} page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  )
}
