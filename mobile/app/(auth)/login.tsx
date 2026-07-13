/** Sign in — email/password against /api/v1/auth/login (Google/Apple: Phase 3+). */
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, type LoginInput } from '@qb/shared'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/client'
import { Field, PrimaryButton } from '@/components/ui'

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
          <Text className="text-3xl font-extrabold tracking-tight text-primary dark:text-primary-light">Welcome back</Text>
          <Text className="mb-8 mt-1 text-sm text-muted dark:text-muted-dark">Sign in to continue.</Text>

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field
                label="Email"
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
                value={field.value}
                onChangeText={field.onChange}
                secureTextEntry
                autoComplete="password"
                error={fieldState.error?.message}
              />
            )}
          />

          {serverError ? <Text className="mb-3 text-sm text-danger">{serverError}</Text> : null}
          <PrimaryButton title="Sign in" onPress={() => void submit()} loading={busy} />

          <Pressable onPress={() => router.replace('/(auth)/signup')} className="mt-5 items-center py-2">
            <Text className="text-sm text-muted dark:text-muted-dark">
              New here? <Text className="font-semibold text-primary dark:text-primary-light">Create an account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
