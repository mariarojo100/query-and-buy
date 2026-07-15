/**
 * Tab bar — Home · Explore · Sell · Inbox · Profile.
 * Sell is the raised emerald action; Saved lives under Profile (the
 * favorites route stays registered but hidden from the bar).
 */
import React from 'react'
import { Platform, View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { useInbox } from '@/queries/messaging'
import { COLORS } from '@/theme/colors'

function SellButton({ color: _c, size: _s }: { color: string; size: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-primary"
      style={{
        width: 52,
        height: 52,
        marginTop: Platform.OS === 'ios' ? -18 : -22,
        shadowColor: COLORS.primaryDark,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </View>
  )
}

export default function TabsLayout() {
  const { user } = useAuth()
  const inbox = useInbox(!!user)
  const unread = inbox.data?.unreadCount ?? 0
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
        tabBarStyle: { borderTopColor: COLORS.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{ title: 'Sell', tabBarIcon: SellButton, tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', color: COLORS.primary } }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} color={color} size={size} />
          ),
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.primary, color: '#fff', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="favorites" options={{ href: null }} />
    </Tabs>
  )
}
