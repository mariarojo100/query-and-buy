import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDaysIcon, MapPinIcon, PencilIcon, TagIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ImageGallery } from '@/components/listing/ImageGallery'
import { ContactSellerButton } from '@/components/listing/ContactSellerButton'
import { FavoriteButton } from '@/components/listing/FavoriteButton'
import { getFavoritedIds } from '@/lib/favorites/queries'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { statusMeta } from '@/lib/listings/status'
import { initials } from '@/components/profile/ProfileHeader'
import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { emirateLabel } from '@/lib/profile/emirates'
import { conditionLabel } from '@/lib/listings/conditions'
import { getListingById } from '@/lib/listings/queries'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) return { title: 'Listing not found · Query & Buy' }
  return {
    title: `${listing.title_en} · Query & Buy`,
    description: listing.description.slice(0, 150),
    openGraph: listing.images[0]
      ? { images: [publicUrl(LISTING_IMAGES_BUCKET, listing.images[0].storage_key)] }
      : undefined,
  }
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === listing.seller_id
  const favorited = (await getFavoritedIds([listing.id])).has(listing.id)

  const location = [listing.area, emirateLabel(listing.emirate)].filter(Boolean).join(', ')
  const posted = listing.published_at ?? listing.created_at
  const seller = listing.seller
  const status = statusMeta(listing.status)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {isOwner && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
            <p className="flex items-center gap-2 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
              >
                {status.label}
              </span>
              This is your listing.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/listing/${id}/edit`}>
                <PencilIcon className="size-4" />
                Edit
              </Link>
            </Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Gallery */}
          <div className="lg:col-span-3">
            <ImageGallery
              keys={listing.images.map((i) => i.storage_key)}
              title={listing.title_en}
            />
          </div>

          {/* Details */}
          <div className="space-y-5 lg:col-span-2">
            <div className="space-y-2">
              <p className="text-3xl font-semibold tracking-tight">
                {formatPrice(listing.price_fils, listing.currency)}
              </p>
              <h1 className="text-xl font-medium leading-snug">{listing.title_en}</h1>
              <div className="flex flex-wrap gap-2 pt-1">
                {conditionLabel(listing.condition) && (
                  <Badge variant="secondary">{conditionLabel(listing.condition)}</Badge>
                )}
                {listing.is_negotiable && <Badge variant="outline">Negotiable</Badge>}
                {listing.category_name && (
                  <Badge variant="outline" className="gap-1">
                    <TagIcon className="size-3" />
                    {listing.category_name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              {location && (
                <p className="flex items-center gap-1.5">
                  <MapPinIcon className="size-4" />
                  {location}
                </p>
              )}
              <p className="flex items-center gap-1.5">
                <CalendarDaysIcon className="size-4" />
                Posted {new Date(posted).toLocaleDateString()}
              </p>
            </div>

            {!isOwner && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <ContactSellerButton listingId={listing.id} authed={!!user} />
                </div>
                <FavoriteButton
                  listingId={listing.id}
                  initialFavorited={favorited}
                  authed={!!user}
                  className="size-11 shrink-0 rounded-md border bg-card hover:bg-muted"
                />
              </div>
            )}

            {/* Seller */}
            {seller && (
              <Card>
                <CardContent className="pt-6">
                  <Link
                    href={seller.username ? `/u/${seller.username}` : '#'}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="size-12">
                      <AvatarImage src={seller.avatar_url ?? undefined} alt={seller.display_name} />
                      <AvatarFallback>{initials(seller.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{seller.display_name}</span>
                        <VerifiedBadge level={seller.badge_level} />
                      </div>
                      {seller.username && (
                        <p className="truncate text-sm text-muted-foreground">
                          @{seller.username}
                        </p>
                      )}
                    </div>
                  </Link>
                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground">
                    {seller.listings_count}{' '}
                    {seller.listings_count === 1 ? 'active listing' : 'active listings'} · Member
                    since {new Date(seller.member_since).getFullYear()}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 max-w-3xl">
          <h2 className="mb-2 text-lg font-semibold">Description</h2>
          <p className="whitespace-pre-line leading-relaxed text-foreground/90">
            {listing.description}
          </p>
        </div>
      </main>
    </>
  )
}
