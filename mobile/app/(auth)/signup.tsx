/** Create account — /api/v1/auth/signup (same zod schema as the server). */
import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SignupSchema, type SignupInput } from '@qb/shared'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/client'
import { COLORS } from '@/theme/colors'
import { Button, BrandMark, Field } from '@/components/ui'

// Warm minimalist-interior stock photo (Unsplash, free licence), bundled locally
// so the hero renders offline. Source: unsplash.com/photos/photo-1586023492125.
const HERO_IMAGE = require('../../assets/hero-interior.jpg')

export default function SignupScreen() {
  const router = useRouter()
  const { signup } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const form = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  })

  // Not backed by the mobile app/API yet — honest placeholder (no fake success).
  const onGoogle = () => Alert.alert('Google sign-in', 'Google sign-in isn’t set up in this build yet.')

  const submit = form.handleSubmit(async (values) => {
    setServerError(null)
    setBusy(true)
    try {
      await signup(values.email, values.password, values.displayName)
      router.back()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  })

  return (
    <View className="flex-1 bg-background">
      {/* ── Hero (lifestyle photo + soft scrim) ─────────────────── */}
      <View className="absolute left-0 right-0 top-0" style={{ height: 340 }}>
        <Image source={HERO_IMAGE} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
        <LinearGradient
          colors={['rgba(246,245,240,0.82)', 'rgba(246,245,240,0.34)', 'rgba(246,245,240,0.66)']}
          locations={[0, 0.55, 1]}
          className="absolute left-0 right-0 top-0"
          style={{ height: 340 }}
        />
      </View>
      <SafeAreaView edges={['top']}>
        <View className="px-5 pt-1">
          <Pressable onPress={() => router.back()} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-card" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={COLORS.ink} />
          </Pressable>
        </View>
        <View className="items-center px-6 pb-7 pt-3">
          <BrandMark size={64} />
          <Text
            className="mt-3.5 text-[27px] font-extrabold tracking-tight text-ink"
            style={{ textShadowColor: 'rgba(246,245,240,0.95)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } }}
          >
            Query <Text className="text-accent">&</Text> Buy
          </Text>
          <Text
            className="mt-1.5 text-[14px] font-medium text-ink-soft"
            style={{ textShadowColor: 'rgba(246,245,240,0.95)', textShadowRadius: 10 }}
          >
            Premium finds. Great prices. Near you.
          </Text>
        </View>
      </SafeAreaView>

      {/* ── Form sheet ──────────────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View
          className="flex-1 rounded-t-sheet bg-card px-6 pt-7"
          style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 12 }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            <Text className="text-[25px] font-extrabold tracking-tight text-ink">Create your account</Text>
            <Text className="mb-5 mt-1 text-[14px] text-muted">Buy & sell beautifully across the Emirates.</Text>

            <Controller
              control={form.control}
              name="displayName"
              render={({ field, fieldState }) => (
                <Field label="Display name" icon="person-outline" placeholder="Your name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field
                  label="Email"
                  icon="mail-outline"
                  placeholder="you@email.com"
                  value={field.value}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field label="Password" icon="lock-closed-outline" placeholder="At least 8 characters" value={field.value} onChangeText={field.onChange} secureTextEntry error={fieldState.error?.message} />
              )}
            />

            {serverError ? (
              <View className="mb-3 flex-row items-center rounded-2xl bg-danger/10 px-3.5 py-3">
                <Ionicons name="alert-circle-outline" size={17} color={COLORS.danger} />
                <Text className="ml-2 flex-1 text-[13px] font-medium text-danger">{serverError}</Text>
              </View>
            ) : null}

            <View className="mt-1">
              <Button title="Create account" trailingIcon="arrow-forward" onPress={() => void submit()} loading={busy} />
            </View>

            <Text className="mt-3 text-center text-[11px] leading-[16px] text-muted">
              By creating an account you agree to Query & Buy’s Terms and acknowledge the Privacy Policy.
            </Text>

            <View className="my-4 flex-row items-center">
              <View className="h-px flex-1 bg-border" />
              <Text className="mx-3 text-[13px] text-muted">or</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            <Pressable
              onPress={onGoogle}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              className="h-[54px] flex-row items-center justify-center rounded-2xl border border-border bg-card active:opacity-90"
            >
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text className="ml-2.5 text-[15px] font-semibold text-ink">Continue with Google</Text>
            </Pressable>

            <Pressable onPress={() => router.replace('/(auth)/login')} className="mt-5 flex-row items-center justify-center py-2">
              <Text className="text-[14px] text-muted">Already have an account? </Text>
              <Text className="text-[14px] font-bold text-accent-deep">Sign in</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
