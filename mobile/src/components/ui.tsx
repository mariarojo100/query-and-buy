/**
 * src/components/ui — the small design-system primitives (NativeWind).
 * Visual language mirrors the web app: emerald primary, warm neutrals,
 * rounded-3xl cards, generous spacing. Press feedback = subtle scale;
 * loading surfaces pulse instead of sitting static.
 */
import React, { useEffect } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/** Pressable that springs to 97% while pressed — the app's standard press feel. */
export function ScalePressable({
  children,
  className,
  onPress,
  onLongPress,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
}) {
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
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
    <ScalePressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-13 items-center justify-center rounded-full bg-primary px-6 py-3.5 ${disabled || loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-base font-semibold text-white">{title}</Text>
      )}
    </ScalePressable>
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
