/**
 * Tab navigator — Home · Explore · Sell · Inbox · Profile.
 * Rendering is delegated to the art-directed <TabBar>; Sell is the raised
 * emerald action and Saved lives under Profile (favorites route stays
 * registered but hidden from the bar). Destinations are unchanged.
 */
import React from 'react'
import { Tabs } from 'expo-router'
import { useAuth } from '@/auth/AuthContext'
import { useInbox } from '@/queries/messaging'
import { TabBar } from '@/components/TabBar'

export default function TabsLayout() {
  const { user } = useAuth()
  const inbox = useInbox(!!user)
  const unread = inbox.data?.unreadCount ?? 0
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} unread={unread} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="sell" options={{ title: 'Sell' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="account" options={{ title: 'Profile' }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
    </Tabs>
  )
}
