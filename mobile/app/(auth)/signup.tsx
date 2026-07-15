/** Create account — /api/v1/auth/signup (same zod schema as the server). */
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SignupSchema, type SignupInput } from '@qb/shared'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/client'
import { COLORS } from '@/theme/colors'
import { BrandMark, Field, PrimaryButton } from '@/components/ui'

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
      <View className="flex-row px-4 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-card dark:bg-card-dark" accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={COLORS.muted} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View className="mb-7 items-center">
            <BrandMark />
            <Text className="mt-5 text-[26px] font-extrabold tracking-tight text-ink dark:text-ink-dark">Create your account</Text>
            <Text className="mt-1 text-center text-[14px] text-muted dark:text-muted-dark">Buy & sell beautifully across the Emirates.</Text>
          </View>

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

          <PrimaryButton title="Create account" onPress={() => void submit()} loading={busy} />

          <Text className="mt-3 text-center text-[11px] leading-[16px] text-muted dark:text-muted-dark">
            By creating an account you agree to Query & Buy’s Terms and acknowledge the Privacy Policy.
          </Text>

          <Pressable onPress={() => router.replace('/(auth)/login')} className="mt-4 items-center py-2">
            <Text className="text-[14px] text-muted dark:text-muted-dark">
              Already have an account? <Text className="font-bold text-primary dark:text-primary-light">Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
