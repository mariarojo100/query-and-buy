/**
 * src/components/ui — the small design-system primitives (NativeWind).
 * Visual language mirrors the web app: emerald primary, warm neutrals,
 * rounded-3xl cards, generous spacing.
 */
import React from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native'

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-13 items-center justify-center rounded-full bg-primary px-6 py-3.5 active:opacity-90 ${disabled || loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-base font-semibold text-white">{title}</Text>
      )}
    </Pressable>
  )
}

export function Field(props: TextInputProps & { label: string; error?: string }) {
  const { label, error, ...rest } = props
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink dark:text-ink-dark">{label}</Text>
      <TextInput
        placeholderTextColor="#a29d8f"
        {...rest}
        className={`rounded-2xl border bg-card px-4 py-3.5 text-base text-ink dark:bg-card-dark dark:text-ink-dark ${error ? 'border-danger' : 'border-border dark:border-border-dark'}`}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  )
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <Text className="text-center text-lg font-semibold text-ink dark:text-ink-dark">{title}</Text>
      {body ? <Text className="mt-2 text-center text-sm text-muted dark:text-muted-dark">{body}</Text> : null}
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <Text className="text-center text-base font-semibold text-ink dark:text-ink-dark">Something went wrong</Text>
      <Text className="mt-2 text-center text-sm text-muted dark:text-muted-dark">{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="mt-5 rounded-full bg-primary px-6 py-2.5 active:opacity-90">
          <Text className="font-semibold text-white">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Shimmerless skeleton block (kept simple; animation pass comes in polish). */
export function Skeleton({ className }: { className?: string }) {
  return <View className={`rounded-2xl bg-border/60 dark:bg-border-dark/60 ${className ?? ''}`} />
}
