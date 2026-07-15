/**
 * Sell — the photo-first listing flow.
 * Pick photos → uploads + AI draft run IN PARALLEL → fields auto-fill where
 * the model cleared the 70% gate (sparkle chip) → price suggestion cards →
 * publish. Server re-validates everything (zod + safety screen).
 */
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CONDITIONS, EMIRATES, formatPrice } from '@qb/shared'
import { api, ApiError } from '@/api/client'
import { useCategories } from '@/queries'
import { pickPhotos, uploadPhotos, generateDraft, type AiDraft, type PickedPhoto } from '@/sell/pipeline'
import { success, warn, tick } from '@/lib/haptics'
import { COLORS } from '@/theme/colors'
import { PrimaryButton } from '@/components/ui'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

/** Section label with an optional AI-filled chip. */
function FieldLabel({ children, ai }: { children: React.ReactNode; ai?: boolean }) {
  return (
    <View className="mb-2 flex-row items-center">
      <Text className="text-[13px] font-bold text-ink dark:text-ink-dark">{children}</Text>
      {ai ? (
        <View className="ml-2 flex-row items-center rounded-full bg-primary-light dark:bg-primary/15 px-2 py-0.5">
          <Ionicons name="sparkles" size={9} color={COLORS.primary} />
          <Text className="ml-1 text-[9px] font-bold text-primary">AI</Text>
        </View>
      ) : null}
    </View>
  )
}

/** Selectable pill used for category / condition / emirate. */
function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tick()
        onPress()
      }}
      className={`flex-row items-center rounded-full border px-3.5 py-2 ${selected ? 'border-primary bg-primary' : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
    >
      {selected ? <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 4 }} /> : null}
      <Text className={`text-[12.5px] font-semibold ${selected ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{label}</Text>
    </Pressable>
  )
}

export default function SellNewScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const categories = useCategories()
  const iconColor = useColorScheme() === 'dark' ? '#F2F4F0' : COLORS.ink

  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadedKeys, setUploadedKeys] = useState<{ storage_key: string; position: number; width: number; height: number }[]>([])
  const [progress, setProgress] = useState(0)

  const [aiBusy, setAiBusy] = useState(false)
  const [draft, setDraft] = useState<AiDraft | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)
  const [emirate, setEmirate] = useState<string | null>(null)
  const [priceAed, setPriceAed] = useState('')
  const [publishing, setPublishing] = useState(false)

  const aiFilled = useMemo(() => new Set<string>(), [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  const runUpload = useCallback((list: PickedPhoto[]) => {
    setUploadState('uploading')
    setProgress(0)
    uploadPhotos(list, (done, total) => setProgress(done / total))
      .then((keys) => {
        setUploadedKeys(keys)
        setUploadState('done')
      })
      .catch(() => setUploadState('error'))
  }, [])

  const addPhotos = useCallback(async () => {
    const picked = await pickPhotos(photos.length)
    if (!picked.length) return
    const all = [...photos, ...picked]
    setPhotos(all)
    runUpload(all)

    if (!draft && !aiBusy) {
      setAiBusy(true)
      generateDraft(all)
        .then(({ draft: d }) => {
          setDraft(d)
          if (d.title) {
            setTitle(d.title)
            aiFilled.add('title')
          }
          if (d.description) {
            setDescription(d.description)
            aiFilled.add('description')
          }
          if (d.categoryId) setCategoryId(d.categoryId)
          if (d.condition) setCondition(d.condition)
        })
        .catch(() => {
          /* AI is optional — the manual form still works */
        })
        .finally(() => setAiBusy(false))
    }
  }, [photos, draft, aiBusy, aiFilled, runUpload])

  const removePhoto = (i: number) => {
    const next = photos.filter((_, idx) => idx !== i)
    setPhotos(next)
    setUploadedKeys([])
    if (next.length) runUpload(next)
    else setUploadState('idle')
  }

  const publish = async () => {
    if (uploadState !== 'done' || uploadedKeys.length === 0) {
      Alert.alert('Photos still uploading', 'Give the photos a moment to finish uploading.')
      return
    }
    const aed = Number(priceAed)
    setPublishing(true)
    try {
      const res = await api<{ id: string }>('/listings/create', {
        body: {
          title: title.trim(),
          description: description.trim(),
          priceAed: aed,
          category_id: categoryId ?? '',
          condition: condition ?? '',
          emirate: emirate ?? '',
          isNegotiable: true,
          images: uploadedKeys,
        },
      })
      success()
      router.replace(`/listing/${res.id}`)
    } catch (e) {
      warn()
      Alert.alert('Could not publish', e instanceof ApiError ? e.message : 'Try again in a moment.')
    } finally {
      setPublishing(false)
    }
  }

  const pricing = draft?.pricing
  const uploading = uploadState === 'uploading'
  const missing: string[] = []
  if (!photos.length) missing.push('photos')
  if (!title.trim()) missing.push('a title')
  if (!categoryId) missing.push('category')
  if (!condition) missing.push('condition')
  if (!emirate) missing.push('emirate')
  if (!priceAed) missing.push('a price')
  const canPublish = missing.length === 0 && !uploading

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center px-4 py-2">
          <Pressable onPress={() => router.back()} hitSlop={10} className="h-10 w-10 items-center justify-center" accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={iconColor} />
          </Pressable>
          <Text className="ml-1 text-[18px] font-extrabold text-ink dark:text-ink-dark">New listing</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* ── Photos ─────────────────────────────────────────────── */}
          <FieldLabel>Photos</FieldLabel>
          {photos.length === 0 ? (
            <Pressable
              onPress={() => void addPhotos()}
              className="items-center justify-center rounded-qb border-2 border-dashed border-border bg-card py-10 active:opacity-90 dark:border-border-dark dark:bg-card-dark"
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
                <Ionicons name="camera" size={26} color={COLORS.primary} />
              </View>
              <Text className="mt-3 text-[15px] font-bold text-ink dark:text-ink-dark">Add photos</Text>
              <Text className="mt-1 text-[12px] text-muted dark:text-muted-dark">Up to 8 · the first is your cover</Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {photos.map((p, i) => (
                <View key={i} className="relative">
                  <Image source={{ uri: p.uri }} style={{ width: 100, height: 100, borderRadius: 16 }} contentFit="cover" />
                  {i === 0 ? (
                    <View className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-0.5">
                      <Text className="text-[9px] font-bold uppercase tracking-wide text-white">Cover</Text>
                    </View>
                  ) : null}
                  <Pressable onPress={() => removePhoto(i)} className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-ink" accessibilityLabel="Remove photo">
                    <Ionicons name="close" size={13} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {photos.length < 8 ? (
                <Pressable
                  onPress={() => void addPhotos()}
                  className="h-[100px] w-[100px] items-center justify-center rounded-2xl border-2 border-dashed border-border dark:border-border-dark"
                >
                  <Ionicons name="add" size={28} color={COLORS.muted} />
                  <Text className="text-[10px] font-medium text-muted dark:text-muted-dark">Add</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}

          {/* Upload / AI status */}
          {uploading ? (
            <View className="mt-3 flex-row items-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text className="ml-2 text-[12px] text-muted dark:text-muted-dark">Uploading photos… {Math.round(progress * 100)}%</Text>
            </View>
          ) : null}
          {uploadState === 'error' ? (
            <Text className="mt-3 text-[12px] font-medium text-danger">Photo upload failed — remove a photo and try again.</Text>
          ) : null}
          {aiBusy ? (
            <View className="mt-3 flex-row items-center rounded-2xl bg-primary-light dark:bg-primary/15 p-3.5">
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text className="ml-2.5 text-[14px] font-semibold text-primary">Analyzing your photos…</Text>
              <Ionicons name="sparkles" size={15} color={COLORS.accent} style={{ marginLeft: 'auto' }} />
            </View>
          ) : null}
          {draft?.warning ? (
            <View className="mt-3 flex-row items-start rounded-2xl border border-accent/40 bg-accent/10 p-3.5">
              <Ionicons name="warning-outline" size={16} color={COLORS.accentDeep} style={{ marginTop: 1 }} />
              <Text className="ml-2 flex-1 text-[13px] leading-[18px] text-ink dark:text-ink-dark">{draft.warning}</Text>
            </View>
          ) : null}

          {/* ── Title ──────────────────────────────────────────────── */}
          <View className="mt-7">
            <FieldLabel ai={!!draft?.title}>Title</FieldLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What are you selling?"
              placeholderTextColor={COLORS.muted}
              className="rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] text-ink dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
            />
          </View>

          {/* ── Description ────────────────────────────────────────── */}
          <View className="mt-5">
            <FieldLabel ai={!!draft?.description}>Description</FieldLabel>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Condition, what's included, why you're selling…"
              placeholderTextColor={COLORS.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              className="min-h-28 rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] leading-[21px] text-ink dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
            />
          </View>

          {/* ── Category ───────────────────────────────────────────── */}
          <View className="mt-6">
            <FieldLabel ai={!!draft?.categoryId}>Category</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {(categories.data?.categories ?? []).map((c) => (
                <Pill key={c.id} label={c.name_en} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
              ))}
            </View>
          </View>

          {/* ── Condition ──────────────────────────────────────────── */}
          <View className="mt-6">
            <FieldLabel ai={!!draft?.condition}>Condition</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <Pill key={c.value} label={c.label} selected={condition === c.value} onPress={() => setCondition(c.value)} />
              ))}
            </View>
          </View>

          {/* ── Emirate ────────────────────────────────────────────── */}
          <View className="mt-6">
            <FieldLabel>Emirate</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {EMIRATES.map((e) => (
                <Pill key={e.value} label={e.label} selected={emirate === e.value} onPress={() => setEmirate(e.value)} />
              ))}
            </View>
          </View>

          {/* ── AI price suggestion ────────────────────────────────── */}
          {pricing && (pricing.quickSaleAed || pricing.fairMarketAed || pricing.premiumAed) ? (
            <View className="mt-7 rounded-qb border border-accent/30 bg-accent/[0.06] p-4">
              <View className="flex-row items-center">
                <Ionicons name="sparkles" size={15} color={COLORS.accent} />
                <Text className="ml-1.5 text-[14px] font-bold text-ink dark:text-ink-dark">Suggested price</Text>
                <View className="ml-auto rounded-full bg-accent/15 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-accent-deep">{pricing.confidence}% confident</Text>
                </View>
              </View>
              <View className="mt-3 flex-row gap-2">
                {(
                  [
                    { label: 'Quick sale', value: pricing.quickSaleAed },
                    { label: 'Typical', value: pricing.fairMarketAed },
                    { label: 'Top range', value: pricing.premiumAed },
                  ] as const
                ).map(
                  (tier) =>
                    tier.value != null && (
                      <Pressable
                        key={tier.label}
                        onPress={() => {
                          tick()
                          setPriceAed(String(tier.value))
                        }}
                        className={`flex-1 items-center rounded-2xl border p-3 ${String(tier.value) === priceAed ? 'border-primary bg-primary-light' : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
                      >
                        <Text className="text-[9.5px] font-bold uppercase tracking-wide text-muted dark:text-muted-dark">{tier.label}</Text>
                        <Text className="mt-1 text-[13.5px] font-extrabold text-ink dark:text-ink-dark">{formatPrice(tier.value * 100)}</Text>
                      </Pressable>
                    ),
                )}
              </View>
              {pricing.reasoning ? (
                <Text className="mt-3 text-[12px] leading-[17px] text-muted dark:text-muted-dark">{pricing.reasoning}</Text>
              ) : null}
            </View>
          ) : null}

          {/* ── Price ──────────────────────────────────────────────── */}
          <View className="mt-6">
            <FieldLabel>Price</FieldLabel>
            <View className="flex-row items-center rounded-2xl border border-border bg-card px-4 dark:border-border-dark dark:bg-card-dark">
              <Text className="text-[15px] font-bold text-muted dark:text-muted-dark">AED</Text>
              <TextInput
                value={priceAed}
                onChangeText={setPriceAed}
                placeholder="0"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
                className="ml-2 flex-1 py-3.5 text-[17px] font-bold text-ink dark:text-ink-dark"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky publish bar ───────────────────────────────────── */}
      <View
        className="border-t border-border bg-card px-5 pt-3 dark:border-border-dark dark:bg-card-dark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {!canPublish ? (
          <Text className="mb-2 text-center text-[11.5px] text-muted dark:text-muted-dark">
            {uploading ? 'Finishing photo upload…' : `Still needed: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`}
          </Text>
        ) : (
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[12px] text-muted dark:text-muted-dark">Your price</Text>
            <Text className="text-[15px] font-extrabold text-primary dark:text-primary-light">{formatPrice(Number(priceAed) * 100)}</Text>
          </View>
        )}
        <PrimaryButton
          title={publishing ? 'Publishing…' : 'Publish listing'}
          onPress={() => void publish()}
          loading={publishing}
          disabled={!canPublish}
        />
      </View>
    </View>
  )
}
