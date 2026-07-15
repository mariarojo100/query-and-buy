/** Sign in — email/password against /api/v1/auth/login (Google/Apple: Phase 3+). */
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row px-4 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-card dark:bg-card-dark" accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={COLORS.muted} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View className="mb-7 items-center">
            <BrandMark />
            <Text className="mt-5 text-[26px] font-extrabold tracking-tight text-ink dark:text-ink-dark">Welcome back</Text>
            <Text className="mt-1 text-[14px] text-muted dark:text-muted-dark">Sign in to your Query & Buy account.</Text>
          </View>

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
                placeholder="Your password"
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

          <PrimaryButton title="Sign in" onPress={() => void submit()} loading={busy} />

          <Pressable onPress={() => router.replace('/(auth)/signup')} className="mt-6 items-center py-2">
            <Text className="text-[14px] text-muted dark:text-muted-dark">
              New here? <Text className="font-bold text-primary dark:text-primary-light">Create an account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
