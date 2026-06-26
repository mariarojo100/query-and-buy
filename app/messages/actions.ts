'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { detectProhibitedContact, CONTACT_BLOCK_MESSAGE } from '@/lib/safety/contact'
import { dispatch } from '@/lib/notifications/dispatch'

/**
 * Open (or create) the conversation between the current user (buyer) and a
 * listing's seller. Idempotent via the unique (listing_id, buyer_id) constraint.
 */
export async function createConversation(
  listingId: string,
): Promise<{ conversationId?: string; error?: string; needAuth?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needAuth: true }

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id')
    .eq('id', listingId)
    .maybeSingle()
  if (!listing) return { error: 'Listing not found.' }

  const sellerId = (listing as { seller_id: string }).seller_id
  if (sellerId === user.id) return { error: "You can't message yourself." }

  // Reuse an existing thread if present.
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .maybeSingle()
  if (existing) return { conversationId: (existing as { id: string }).id }

  // conv_buyer_insert RLS: buyer_id = auth.uid() and buyer_id <> seller_id.
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId, status: 'open' })
    .select('id')
    .single()

  if (error || !created) return { error: error?.message ?? 'Could not start conversation.' }
  revalidatePath('/messages')
  return { conversationId: (created as { id: string }).id }
}

/** Mark a conversation read for the current participant (sets their last_read_at). */
export async function markConversationRead(
  conversationId: string,
): Promise<{ ok?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: conv } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (!conv) return {} // not a participant (RLS) or not found

  const { buyer_id, seller_id } = conv as { buyer_id: string; seller_id: string }
  if (user.id !== buyer_id && user.id !== seller_id) return {}
  const column = user.id === buyer_id ? 'buyer_last_read_at' : 'seller_last_read_at'

  await supabase
    .from('conversations')
    .update({ [column]: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath('/messages')
  return { ok: true }
}

/** Send a message in a conversation. RLS enforces participant + not-blocked. */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok?: boolean; error?: string; blocked?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const text = body.trim()
  if (!text) return { error: 'Message is empty.' }
  if (text.length > 2000) return { error: 'Message is too long (max 2000 characters).' }

  // Contact protection: prohibited content is NEVER written to the database.
  const prohibited = detectProhibitedContact(text)
  if (prohibited) return { error: CONTACT_BLOCK_MESSAGE, blocked: true }

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: text,
  })
  if (error) return { error: error.message }

  // Bump activity so the inbox sorts correctly (conv_participant_update RLS).
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  // Notify the other participant (in-app only — no email per message).
  const { data: conv } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (conv) {
    const c = conv as { buyer_id: string; seller_id: string }
    const recipientId = user.id === c.buyer_id ? c.seller_id : c.buyer_id
    await dispatch({
      recipientId,
      type: 'new_message',
      title: 'New message',
      body: text.slice(0, 80),
      link: `/messages/${conversationId}`,
    })
  }

  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  return { ok: true }
}
