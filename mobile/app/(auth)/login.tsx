/** Sign in — email/password against /api/v1/auth/login (Google/Apple: Phase 3+). */
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, type LoginInput } from '@qb/shared'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/client'
import { COLORS } from '@/theme/colors'
import { BrandMark, Field, PrimaryButton } from '@/components/ui'

export default function LoginScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    setServerError(null)
    setBusy(true)
    try {
      await login(values.email, values.password)
      router.back()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Could not sign in. Try again.')
    } finally {
      setBusy(false)
    }
  })

  return (
    <View className="flex-1 bg-background">
      {/* ── Hero (warm brand block; swap the gradient for a lifestyle photo) ── */}
      <LinearGradient colors={['#EFEBE3', '#E4DFD4']} className="absolute left-0 right-0 top-0" style={{ height: 380 }} />
      <SafeAreaView edges={['top']}>
        <View className="px-5 pt-1">
          <Pressable onPress={() => router.back()} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-card" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={COLORS.ink} />
          </Pressable>
        </View>
        <View className="items-center px-6 pb-9 pt-4">
          <BrandMark size={72} />
          <Text className="mt-4 text-[30px] font-extrabold tracking-tight text-ink">
            Query <Text className="text-accent">&</Text> Buy
          </Text>
          <Text className="mt-1.5 text-[14.5px] text-ink-soft">Premium finds. Great prices. Near you.</Text>
        </View>
      </SafeAreaView>

      {/* ── Form sheet ──────────────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View
          className="flex-1 rounded-t-sheet bg-card px-6 pt-8"
          style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 12 }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Text className="text-[26px] font-extrabold tracking-tight text-ink">Welcome back</Text>
            <Text className="mb-6 mt-1 text-[14px] text-muted">Sign in to your Query & Buy account.</Text>

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
                  autoComplete="email"
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry
                  autoComplete="password"
                  error={fieldState.error?.message}
                />
              )}
            />

            {serverError ? (
              <View className="mb-3 flex-row items-center rounded-2xl bg-danger/10 px-3.5 py-3">
                <Ionicons name="alert-circle-outline" size={17} color={COLORS.danger} />
                <Text className="ml-2 flex-1 text-[13px] font-medium text-danger">{serverError}</Text>
              </View>
            ) : null}

            <View className="mt-1">
              <PrimaryButton title="Sign in" onPress={() => void submit()} loading={busy} />
            </View>

            <Pressable onPress={() => router.replace('/(auth)/signup')} className="mt-6 flex-row items-center justify-center py-2">
              <Text className="text-[14px] text-muted">New here? </Text>
              <Text className="text-[14px] font-bold text-accent-deep">Create an account</Text>
              <Ionicons name="arrow-forward" size={15} color={COLORS.accentDeep} style={{ marginLeft: 5 }} />
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
