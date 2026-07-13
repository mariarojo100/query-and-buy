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
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CONDITIONS, EMIRATES, formatPrice } from '@qb/shared'
import { api, ApiError } from '@/api/client'
import { useCategories } from '@/queries'
import { pickPhotos, uploadPhotos, generateDraft, type AiDraft, type PickedPhoto } from '@/sell/pipeline'
import { success, warn } from '@/lib/haptics'
import { PrimaryButton } from '@/components/ui'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export default function SellNewScreen() {
  const router = useRouter()
  const categories = useCategories()

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

  const addPhotos = useCallback(async () => {
    const picked = await pickPhotos(photos.length)
    if (!picked.length) return
    const all = [...photos, ...picked]
    setPhotos(all)

    // Kick off uploads + AI draft in parallel (first pick only for the AI).
    setUploadState('uploading')
    setProgress(0)
    uploadPhotos(all, (done, total) => setProgress(done / total))
      .then((keys) => {
        setUploadedKeys(keys)
        setUploadState('done')
      })
      .catch(() => setUploadState('error'))

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
  }, [photos, draft, aiBusy, aiFilled])

  const removePhoto = (i: number) => {
    const next = photos.filter((_, idx) => idx !== i)
    setPhotos(next)
    setUploadedKeys([])
    setUploadState(next.length ? 'uploading' : 'idle')
    if (next.length) {
      uploadPhotos(next, (done, total) => setProgress(done / total))
        .then((keys) => {
          setUploadedKeys(keys)
          setUploadState('done')
        })
        .catch(() => setUploadState('error'))
    }
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

  const AiChip = ({ show }: { show: boolean }) =>
    show ? (
      <View className="ml-2 flex-row items-center rounded-full bg-primary-light px-2 py-0.5">
        <Ionicons name="sparkles" size={10} color="#0e5a43" />
        <Text className="ml-1 text-[10px] font-bold text-primary">AI</Text>
      </View>
    ) : null

  const pricing = draft?.pricing

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row items-center px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color="#0e5a43" />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-ink dark:text-ink-dark">Sell an item</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Photos */}
          <View className="flex-row flex-wrap gap-2">
            {photos.map((p, i) => (
              <View key={i} className="relative">
                <Image source={{ uri: p.uri }} style={{ width: 86, height: 86, borderRadius: 16 }} contentFit="cover" />
                {i === 0 ? (
                  <View className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5">
                    <Text className="text-[9px] font-bold text-white">COVER</Text>
                  </View>
                ) : null}
                <Pressable onPress={() => removePhoto(i)} className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-ink">
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < 8 && (
              <Pressable
                onPress={() => void addPhotos()}
                className="h-[86px] w-[86px] items-center justify-center rounded-2xl border-2 border-dashed border-border dark:border-border-dark"
              >
                <Ionicons name="camera-outline" size={26} color="#8a8578" />
                <Text className="mt-0.5 text-[10px] font-medium text-muted dark:text-muted-dark">Add photos</Text>
              </Pressable>
            )}
          </View>

          {/* Upload / AI status */}
          {uploadState === 'uploading' && (
            <View className="mt-3 flex-row items-center">
              <ActivityIndicator size="small" color="#0e5a43" />
              <Text className="ml-2 text-xs text-muted dark:text-muted-dark">Uploading photos… {Math.round(progress * 100)}%</Text>
            </View>
          )}
          {uploadState === 'error' && (
            <Text className="mt-3 text-xs text-danger">Photo upload failed — remove a photo and try again.</Text>
          )}
          {aiBusy && (
            <View className="mt-3 flex-row items-center rounded-2xl bg-primary-light p-3">
              <ActivityIndicator size="small" color="#0e5a43" />
              <Text className="ml-2 text-sm font-medium text-primary">Analyzing your photos…</Text>
            </View>
          )}
          {draft?.warning && (
            <View className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 p-3">
              <Text className="text-sm text-ink dark:text-ink-dark">{draft.warning}</Text>
            </View>
          )}

          {/* Title */}
          <View className="mt-6">
            <View className="flex-row items-center">
              <Text className="text-sm font-medium text-ink dark:text-ink-dark">Title</Text>
              <AiChip show={!!draft?.title} />
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What are you selling?"
              placeholderTextColor="#a29d8f"
              className="mt-1.5 rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-ink dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
            />
          </View>

          {/* Description */}
          <View className="mt-4">
            <View className="flex-row items-center">
              <Text className="text-sm font-medium text-ink dark:text-ink-dark">Description</Text>
              <AiChip show={!!draft?.description} />
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Condition, what's included, why you're selling…"
              placeholderTextColor="#a29d8f"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              className="mt-1.5 min-h-28 rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-ink dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
            />
          </View>

          {/* Category */}
          <Text className="mt-5 text-sm font-medium text-ink dark:text-ink-dark">Category</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {(categories.data?.categories ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={`rounded-full border px-3.5 py-2 ${categoryId === c.id ? 'border-primary bg-primary' : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
              >
                <Text className={`text-xs font-medium ${categoryId === c.id ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{c.name_en}</Text>
              </Pressable>
            ))}
          </View>

          {/* Condition + Emirate */}
          <Text className="mt-5 text-sm font-medium text-ink dark:text-ink-dark">Condition</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setCondition(c.value)}
                className={`rounded-full border px-3.5 py-2 ${condition === c.value ? 'border-primary bg-primary' : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
              >
                <Text className={`text-xs font-medium ${condition === c.value ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-5 text-sm font-medium text-ink dark:text-ink-dark">Emirate</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {EMIRATES.map((e) => (
              <Pressable
                key={e.value}
                onPress={() => setEmirate(e.value)}
                className={`rounded-full border px-3.5 py-2 ${emirate === e.value ? 'border-primary bg-primary' : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
              >
                <Text className={`text-xs font-medium ${emirate === e.value ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{e.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* AI price suggestion */}
          {pricing && (pricing.quickSaleAed || pricing.fairMarketAed || pricing.premiumAed) ? (
            <View className="mt-6 rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark">
              <View className="flex-row items-center">
                <Ionicons name="sparkles" size={14} color="#c8a24a" />
                <Text className="ml-1.5 text-sm font-semibold text-ink dark:text-ink-dark">AI price suggestion</Text>
                <Text className="ml-auto text-xs text-muted dark:text-muted-dark">{pricing.confidence}% confidence</Text>
              </View>
              <View className="mt-3 flex-row gap-2">
                {(
                  [
                    { label: 'Quick sale', value: pricing.quickSaleAed },
                    { label: 'Typical', value: pricing.fairMarketAed },
                    { label: 'Top of range', value: pricing.premiumAed },
                  ] as const
                ).map(
                  (tier) =>
                    tier.value != null && (
                      <Pressable
                        key={tier.label}
                        onPress={() => setPriceAed(String(tier.value))}
                        className={`flex-1 rounded-2xl border p-3 ${String(tier.value) === priceAed ? 'border-primary bg-primary-light' : 'border-border dark:border-border-dark'}`}
                      >
                        <Text className="text-[10px] font-semibold uppercase text-muted dark:text-muted-dark">{tier.label}</Text>
                        <Text className="mt-0.5 text-sm font-bold text-ink dark:text-ink-dark">{formatPrice(tier.value * 100)}</Text>
                      </Pressable>
                    ),
                )}
              </View>
              {pricing.reasoning ? (
                <Text className="mt-3 text-xs leading-relaxed text-muted dark:text-muted-dark">{pricing.reasoning}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Price */}
          <Text className="mt-5 text-sm font-medium text-ink dark:text-ink-dark">Price (AED)</Text>
          <TextInput
            value={priceAed}
            onChangeText={setPriceAed}
            placeholder="0"
            placeholderTextColor="#a29d8f"
            keyboardType="numeric"
            className="mt-1.5 rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-ink dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
          />

          <View className="mt-8">
            <PrimaryButton
              title={publishing ? 'Publishing…' : 'Publish listing'}
              onPress={() => void publish()}
              loading={publishing}
              disabled={!photos.length || !title.trim() || !priceAed || !categoryId || !condition || !emirate}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
