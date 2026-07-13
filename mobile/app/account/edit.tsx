/** Edit profile — avatar upload, display name, username (live availability), bio, emirate. */
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { File } from 'expo-file-system'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { EMIRATES } from '@qb/shared'
import { api, ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { Field, PrimaryButton } from '@/components/ui'

export default function EditProfileScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState('')
  const [emirate, setEmirate] = useState<string | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const changeAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (res.canceled || !res.assets[0]) return
    setAvatarBusy(true)
    try {
      const small = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      )
      const file = new File(small.uri)
      const bytes = await file.arrayBuffer()
      const presign = await api<{ slot: { url: string; headers: Record<string, string> }; publicUrl: string }>(
        '/uploads/avatar',
        { body: { contentType: 'image/jpeg', sizeBytes: bytes.byteLength } },
      )
      const put = await fetch(presign.slot.url, {
        method: 'PUT',
        headers: { 'content-type': 'image/jpeg', ...presign.slot.headers },
        body: bytes,
      })
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`)
      await api('/me/avatar', { body: { avatarUrl: presign.publicUrl } })
      await refreshUser()
    } catch (e) {
      Alert.alert('Could not update photo', e instanceof ApiError ? e.message : 'Try again.')
    } finally {
      setAvatarBusy(false)
    }
  }

  useEffect(() => {
    void api<{ profile: { bio: string | null; emirate: string | null } | null }>('/me').then((me) => {
      setBio(me.profile?.bio ?? '')
      setEmirate(me.profile?.emirate ?? null)
    })
  }, [])

  useEffect(() => {
    const u = username.trim().toLowerCase()
    if (!u || u === user?.username) {
      setAvailable(null)
      return
    }
    const t = setTimeout(() => {
      void api<{ available: boolean }>(`/me/username-check?username=${encodeURIComponent(u)}`, { anonymous: true })
        .then((r) => setAvailable(r.available))
        .catch(() => setAvailable(null))
    }, 400)
    return () => clearTimeout(t)
  }, [username, user?.username])

  const save = async () => {
    setBusy(true)
    try {
      await api('/me/profile', {
        method: 'PATCH',
        body: { displayName: displayName.trim(), username: username.trim().toLowerCase(), bio: bio.trim() || undefined, emirate: emirate ?? undefined },
      })
      await refreshUser()
      router.back()
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row items-center px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#0e5a43" />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-ink dark:text-ink-dark">Edit profile</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Pressable onPress={() => void changeAvatar()} className="mb-6 items-center">
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary-light">
              {avatarBusy ? (
                <ActivityIndicator color="#0e5a43" />
              ) : user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text className="text-2xl font-bold text-primary">{(user?.displayName ?? 'U').slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <Text className="mt-2 text-sm font-medium text-primary dark:text-primary-light">Change photo</Text>
          </Pressable>
          <Field label="Display name" value={displayName} onChangeText={setDisplayName} />
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            error={available === false ? 'That username is taken.' : undefined}
          />
          {available === true ? <Text className="-mt-3 mb-3 text-xs text-primary">Available ✓</Text> : null}
          <Field label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
          <Text className="mb-2 text-sm font-medium text-ink dark:text-ink-dark">Emirate</Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {EMIRATES.map((e) => (
              <Pressable
                key={e.value}
                onPress={() => setEmirate(e.value)}
                className={`rounded-full border px-3.5 py-2 ${emirate === e.value ? 'border-primary bg-primary' : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
              >
                <Text className={`text-xs font-medium ${emirate === e.value ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{e.label}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton title="Save changes" onPress={() => void save()} loading={busy} disabled={available === false} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
