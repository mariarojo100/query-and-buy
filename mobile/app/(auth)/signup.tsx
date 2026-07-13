/** Create account — /api/v1/auth/signup (same zod schema as the server). */
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SignupSchema, type SignupInput } from '@qb/shared'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/client'
import { Field, PrimaryButton } from '@/components/ui'

export default function SignupScreen() {
  const router = useRouter()
  const { signup } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const form = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  })

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
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
          <Text className="text-3xl font-extrabold tracking-tight text-primary dark:text-primary-light">Join Query & Buy</Text>
          <Text className="mb-8 mt-1 text-sm text-muted dark:text-muted-dark">Buy & sell beautifully across the Emirates.</Text>

          <Controller
            control={form.control}
            name="displayName"
            render={({ field, fieldState }) => (
              <Field label="Display name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
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
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field label="Password" value={field.value} onChangeText={field.onChange} secureTextEntry error={fieldState.error?.message} />
            )}
          />

          {serverError ? <Text className="mb-3 text-sm text-danger">{serverError}</Text> : null}
          <PrimaryButton title="Create account" onPress={() => void submit()} loading={busy} />

          <Pressable onPress={() => router.replace('/(auth)/login')} className="mt-5 items-center py-2">
            <Text className="text-sm text-muted dark:text-muted-dark">
              Already have an account? <Text className="font-semibold text-primary dark:text-primary-light">Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
