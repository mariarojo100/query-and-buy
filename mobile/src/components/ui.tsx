/**
 * src/components/ui — the small design-system primitives (NativeWind).
 * Visual language mirrors the web app: emerald primary, warm neutrals,
 * rounded-3xl cards, generous spacing. Press feedback = subtle scale;
 * loading surfaces pulse instead of sitting static.
 */
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { COLORS } from '@/theme/colors'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/** Pressable that springs to 97% while pressed — the app's standard press feel. */
export function ScalePressable({
  children,
  className,
  onPress,
  onLongPress,
  disabled,
  accessibilityLabel,
}: {
  children: React.ReactNode
  className?: string
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 20, stiffness: 300 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 })
      }}
      className={className}
      style={style}
    >
      {children}
    </AnimatedPressable>
  )
}

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
      style={{ height: 52 }}
      className={`items-center justify-center rounded-full bg-primary px-6 active:opacity-90 ${disabled || loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-base font-semibold text-white">{title}</Text>
      )}
    </Pressable>
  )
}

export function Field(
  props: TextInputProps & { label: string; error?: string; icon?: keyof typeof Ionicons.glyphMap },
) {
  const { label, error, icon, secureTextEntry, ...rest } = props
  const isPassword = !!secureTextEntry
  const [hidden, setHidden] = useState(isPassword)
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[13px] font-bold text-ink dark:text-ink-dark">{label}</Text>
      <View
        className={`flex-row items-center rounded-2xl border bg-card px-4 dark:bg-card-dark ${error ? 'border-danger' : 'border-border dark:border-border-dark'}`}
      >
        {icon ? <Ionicons name={icon} size={18} color={COLORS.muted} style={{ marginRight: 10 }} /> : null}
        <TextInput
          placeholderTextColor={COLORS.muted}
          {...rest}
          secureTextEntry={isPassword && hidden}
          className="flex-1 py-3.5 text-[15px] text-ink dark:text-ink-dark"
        />
        {isPassword ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="mt-1 text-[12px] font-medium text-danger">{error}</Text> : null}
    </View>
  )
}

export function EmptyState({
  title,
  body,
  icon,
  action,
  onAction,
}: {
  title: string
  body?: string
  icon?: keyof typeof Ionicons.glyphMap
  action?: string
  onAction?: () => void
}) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      {icon ? (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-light">
          <Ionicons name={icon} size={30} color={COLORS.primary} />
        </View>
      ) : null}
      <Text className="text-center text-[17px] font-bold text-ink dark:text-ink-dark">{title}</Text>
      {body ? <Text className="mt-1.5 text-center text-[13px] leading-[19px] text-muted dark:text-muted-dark">{body}</Text> : null}
      {action && onAction ? (
        <Pressable onPress={onAction} className="mt-5 rounded-full border border-border bg-card px-8 py-3 active:opacity-90 dark:border-border-dark dark:bg-card-dark">
          <Text className="text-[14px] font-semibold text-primary dark:text-primary-light">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Row placeholders for list screens (inbox, my listings, notifications). */
export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="px-5 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="mb-4 flex-row items-center">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <View className="ml-3.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
            <Skeleton className="mt-2 h-3 w-44" />
          </View>
        </View>
      ))}
    </View>
  )
}

/** 2-column placeholder grid for the listing feeds' initial load. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap px-3.5 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '50%', paddingHorizontal: 6 }} className="mb-4">
          <Skeleton className="h-40 w-full rounded-img" />
          <Skeleton className="mt-2.5 h-4 w-16" />
          <Skeleton className="mt-1.5 h-3 w-28" />
        </View>
      ))}
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

/** The brand mark — emerald magnifier tile with a gold lens dot (app-icon motif). */
export function BrandMark() {
  return (
    <View className="relative h-16 w-16 items-center justify-center rounded-[20px] bg-primary">
      <Ionicons name="search" size={28} color="#fff" />
      <View
        className="absolute right-2.5 top-2.5 h-3 w-3 rounded-full border-2 border-primary"
        style={{ backgroundColor: COLORS.accent }}
      />
    </View>
  )
}

/** Small status badge: featured (gold), verified (emerald), neutral. */
export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string
  tone?: 'featured' | 'verified' | 'neutral'
  icon?: React.ReactNode
}) {
  const tones = {
    featured: 'bg-accent',
    verified: 'bg-primary',
    neutral: 'bg-ink/70',
  } as const
  return (
    <View className={`flex-row items-center rounded-full px-2 py-[3px] ${tones[tone]}`}>
      {icon}
      <Text className="text-[9.5px] font-bold uppercase tracking-wide text-white">{label}</Text>
    </View>
  )
}

/** Tappable pill chip (popular searches, filters). */
export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border border-border bg-card px-3.5 py-2 active:bg-primary-light dark:border-border-dark dark:bg-card-dark"
    >
      <Text className="text-[12.5px] font-medium text-ink dark:text-ink-dark">{label}</Text>
    </Pressable>
  )
}

/** Section header row: title + optional action ("See all"). */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <View className="flex-row items-baseline justify-between px-6">
      <Text className="text-[17px] font-bold tracking-tight text-ink dark:text-ink-dark">{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-primary dark:text-primary-light">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Pulsing skeleton block — opacity breathes while content loads. */
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(0.55)
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true)
  }, [opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View
      style={style}
      className={`rounded-2xl bg-border/60 dark:bg-border-dark/60 ${className ?? ''}`}
    />
  )
}
