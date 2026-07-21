/**
 * src/components/ui — the Query & Buy design-system primitives (NativeWind v4).
 *
 * Language: warm editorial canvas, ink action colour, warm gold accent, layered
 * surfaces (background → sunken → surface → elevated), a deliberate type
 * ladder, and a controlled radius system (fields 14 · cards 22 · pills).
 * Day-mode only (see darkMode:'class' in tailwind.config.js).
 * Press feedback = a subtle spring to 97%; loading surfaces breathe.
 *
 * Type ladder (documented; applied via classes across screens):
 *   display  32/36  extrabold   · screen title  26/30 extrabold
 *   section  18/22  bold        · product title 15/20 semibold
 *   price    17     extrabold   · body 15/22 · supporting 13/19
 *   label    13     semibold    · caption 11.5 · overline 10.5 uppercase
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

/**
 * Pressable that springs to 97% while pressed — the app's standard press feel.
 * The className lives on a plain Pressable (NativeWind applies reliably there);
 * the spring transform animates a nested Animated.View. Do NOT put className on
 * an Animated.createAnimatedComponent(Pressable) — NativeWind drops it when a
 * style prop is also present, which silently strips backgrounds/radii.
 */
export function ScalePressable({
  children,
  className,
  style,
  onPress,
  onLongPress,
  disabled,
  accessibilityLabel,
  accessibilityRole,
  hitSlop,
}: {
  children: React.ReactNode
  className?: string
  style?: object
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  accessibilityLabel?: string
  /** Omit for pressables that CONTAIN their own buttons (e.g. cards with a
   *  heart) — forcing role="button" nests <button> in <button> on web. */
  accessibilityRole?: 'button' | 'link' | 'none'
  hitSlop?: number
}) {
  const scale = useSharedValue(1)
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Animated.View style={aStyle}>
      <Pressable
        accessibilityRole={accessibilityRole}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 22, stiffness: 320 })
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 22, stiffness: 320 })
        }}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

const BTN_HEIGHT: Record<BtnSize, number> = { sm: 40, md: 48, lg: 54 }
const BTN_SURFACE: Record<BtnVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-primary-light dark:bg-primary/20',
  outline: 'bg-transparent border border-border-strong dark:border-border-strong-dark',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
}
const BTN_LABEL: Record<BtnVariant, string> = {
  primary: 'text-white',
  secondary: 'text-primary-dark dark:text-primary-light',
  outline: 'text-ink dark:text-ink-dark',
  ghost: 'text-primary dark:text-primary-light',
  danger: 'text-white',
}

/** The unified button. Emerald primary, tonal secondary, quiet outline/ghost. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  icon,
  trailingIcon,
  fullWidth = true,
}: {
  title: string
  onPress: () => void
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
  disabled?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  /** Trailing glyph (e.g. arrow-forward) — rendered in gold on solid buttons. */
  trailingIcon?: keyof typeof Ionicons.glyphMap
  fullWidth?: boolean
}) {
  const off = disabled || loading
  const labelColor = variant === 'primary' || variant === 'danger' ? '#fff' : COLORS.primary
  return (
    <ScalePressable
      onPress={onPress}
      disabled={off}
      accessibilityLabel={title}
      accessibilityRole="button"
      style={{ height: BTN_HEIGHT[size], opacity: off ? 0.55 : 1 }}
      className={`flex-row items-center justify-center rounded-2xl px-6 ${fullWidth ? 'w-full' : ''} ${BTN_SURFACE[variant]}`}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={labelColor} style={{ marginRight: 8 }} /> : null}
          <Text className={`text-[15px] font-semibold ${BTN_LABEL[variant]}`}>{title}</Text>
          {trailingIcon ? (
            <Ionicons
              name={trailingIcon}
              size={17}
              color={variant === 'primary' || variant === 'danger' ? COLORS.accent : labelColor}
              style={{ marginLeft: 8 }}
            />
          ) : null}
        </>
      )}
    </ScalePressable>
  )
}

/** Back-compat wrapper — existing screens call PrimaryButton. */
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
  return <Button title={title} onPress={onPress} loading={loading} disabled={disabled} />
}

/** Circular icon button — header actions, gallery controls, overlays. */
export function IconButton({
  icon,
  onPress,
  size = 40,
  tone = 'surface',
  color,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress?: () => void
  size?: number
  tone?: 'surface' | 'overlay' | 'ghost'
  color?: string
  accessibilityLabel?: string
}) {
  const tones = {
    surface: 'bg-card border border-border dark:bg-card-dark dark:border-border-dark',
    overlay: 'bg-black/40',
    ghost: '',
  } as const
  const iconColor = color ?? (tone === 'overlay' ? '#fff' : COLORS.inkSoft)
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-full active:opacity-80 ${tones[tone]}`}
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={iconColor} />
    </Pressable>
  )
}

export function Field(
  props: TextInputProps & { label?: string; error?: string; icon?: keyof typeof Ionicons.glyphMap },
) {
  const { label, error, icon, secureTextEntry, onFocus, onBlur, ...rest } = props
  const isPassword = !!secureTextEntry
  const [hidden, setHidden] = useState(isPassword)
  const [focused, setFocused] = useState(false)
  const ring = error
    ? 'border-danger'
    : focused
      ? 'border-primary bg-primary-tint dark:bg-primary/10'
      : 'border-border dark:border-border-dark bg-sunken dark:bg-sunken-dark'
  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-[13px] font-semibold text-ink-soft dark:text-ink-soft-dark">{label}</Text>
      ) : null}
      <View className={`flex-row items-center rounded-field border px-4 ${ring}`}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? COLORS.primary : COLORS.muted} style={{ marginRight: 10 }} /> : null}
        <TextInput
          placeholderTextColor={COLORS.muted}
          {...rest}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          secureTextEntry={isPassword && hidden}
          className="flex-1 py-3.5 text-[15px] text-ink dark:text-ink-dark"
        />
        {isPassword ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="mt-1.5 text-[12px] font-medium text-danger">{error}</Text> : null}
    </View>
  )
}

/** Surface card — white/elevated-dark, hairline border, 22 radius. */
export function Card({ children, className, onPress }: { children: React.ReactNode; className?: string; onPress?: () => void }) {
  const cls = `rounded-card border border-border bg-card dark:border-border-dark dark:bg-card-dark ${className ?? ''}`
  if (onPress) {
    return (
      <ScalePressable onPress={onPress} className={cls}>
        {children}
      </ScalePressable>
    )
  }
  return <View className={cls}>{children}</View>
}

/** Hairline divider. */
export function Divider({ className }: { className?: string }) {
  return <View className={`h-px bg-border dark:bg-border-dark ${className ?? ''}`} />
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
        <View className="mb-5 h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
          <Ionicons name={icon} size={32} color={COLORS.primary} />
        </View>
      ) : null}
      <Text className="text-center text-[17px] font-bold tracking-tight text-ink dark:text-ink-dark">{title}</Text>
      {body ? <Text className="mt-2 max-w-[280px] text-center text-[13.5px] leading-[20px] text-muted dark:text-muted-dark">{body}</Text> : null}
      {action && onAction ? (
        <View className="mt-6">
          <Button title={action} onPress={onAction} variant="outline" size="md" fullWidth={false} />
        </View>
      ) : null}
    </View>
  )
}

/** Row placeholders for list screens (inbox, my listings, notifications). */
export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="px-5 pt-3">
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
    <View className="flex-row flex-wrap px-4 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '50%', paddingHorizontal: 6 }} className="mb-5">
          <Skeleton className="h-44 w-full rounded-img" />
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
      <View className="mb-5 h-[72px] w-[72px] items-center justify-center rounded-full bg-danger/10">
        <Ionicons name="cloud-offline-outline" size={30} color={COLORS.danger} />
      </View>
      <Text className="text-center text-[17px] font-bold tracking-tight text-ink dark:text-ink-dark">Something went wrong</Text>
      <Text className="mt-2 max-w-[280px] text-center text-[13.5px] leading-[20px] text-muted dark:text-muted-dark">{message}</Text>
      {onRetry ? (
        <View className="mt-6">
          <Button title="Try again" onPress={onRetry} size="md" fullWidth={false} />
        </View>
      ) : null}
    </View>
  )
}

/** The brand mark — ink magnifier tile with a gold lens dot (app-icon motif). */
export function BrandMark({ size = 64 }: { size?: number }) {
  return (
    <View className="relative items-center justify-center rounded-qb bg-primary" style={{ width: size, height: size }}>
      <Ionicons name="search" size={size * 0.44} color="#fff" />
      <View
        className="absolute rounded-full border-2 border-primary"
        style={{ backgroundColor: COLORS.accent, width: size * 0.19, height: size * 0.19, right: size * 0.15, top: size * 0.15 }}
      />
    </View>
  )
}

/** Status pill. Featured = brass; verified/success = emerald tint; sold/neutral = ink glass. */
export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string
  tone?: 'featured' | 'verified' | 'success' | 'info' | 'sold' | 'neutral'
  icon?: React.ReactNode
}) {
  const tones = {
    featured: 'bg-accent',
    verified: 'bg-primary',
    success: 'bg-success',
    info: 'bg-info',
    sold: 'bg-ink/75',
    neutral: 'bg-ink/70',
  } as const
  return (
    <View className={`flex-row items-center rounded-full px-2 py-[3px] ${tones[tone]}`}>
      {icon}
      <Text className="text-[9.5px] font-bold uppercase tracking-wide text-white">{label}</Text>
    </View>
  )
}

/** Tappable pill chip — supports a selected state (filters, categories). */
export function Chip({ label, onPress, selected = false, icon }: { label: string; onPress: () => void; selected?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`flex-row items-center rounded-full border px-3.5 py-2 active:opacity-80 ${
        selected
          ? 'border-accent bg-accent-light'
          : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'
      }`}
    >
      {icon ? (
        <Ionicons name={icon} size={13} color={selected ? COLORS.accentDeep : COLORS.muted} style={{ marginRight: 5 }} />
      ) : null}
      <Text className={`text-[12.5px] font-semibold ${selected ? 'text-ink' : 'text-ink dark:text-ink-dark'}`}>{label}</Text>
    </Pressable>
  )
}

/** Section header row: title + optional action ("See all"). */
export function SectionHeader({
  title,
  caption,
  action,
  onAction,
}: {
  title: string
  caption?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <View className="flex-row items-center justify-between px-5">
      <View className="flex-1">
        <Text className="text-[18px] font-bold tracking-tight text-ink dark:text-ink-dark">{title}</Text>
        {caption ? <Text className="mt-0.5 text-[12px] text-muted dark:text-muted-dark">{caption}</Text> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" className="flex-row items-center">
          <Text className="text-[13px] font-semibold text-ink-soft dark:text-ink-soft-dark">{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.inkSoft} style={{ marginLeft: 1 }} />
        </Pressable>
      ) : null}
    </View>
  )
}

/** Pulsing skeleton block — opacity breathes while content loads. */
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(0.5)
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 750 }), -1, true)
  }, [opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View
      style={style}
      className={`rounded-2xl bg-border/70 dark:bg-border-dark/70 ${className ?? ''}`}
    />
  )
}
