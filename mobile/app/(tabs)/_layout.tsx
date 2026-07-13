/** Tab bar — Home · Sell · Inbox · Favorites · Account (marketplace convention). */
import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { useInbox } from '@/queries/messaging'

export default function TabsLayout() {
  const { user } = useAuth()
  const inbox = useInbox(!!user)
  const unread = inbox.data?.unreadCount ?? 0
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0e5a43',
        tabBarInactiveTintColor: '#8a8578',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Browse', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: 'Saved', tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="sell"
        options={{ title: 'Sell', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size + 6} /> }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" color={color} size={size} />,
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#0e5a43', color: '#fff', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }}
      />
    </Tabs>
  )
}
