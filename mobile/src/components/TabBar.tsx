/**
 * TabBar — the app's bottom navigation, art-directed (not the default RN bar).
 *
 * Five slots: Home · Explore · Sell · Inbox · Profile. Sell is a raised emerald
 * circle (a deliberate brand action, not a generic floating FAB). Active tabs
 * use a filled glyph + emerald label; inactive use an outline glyph + muted
 * label. Safe-area aware; hairline top seam + soft top shadow lift it off the
 * content.
 */
import React from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { COLORS } from '@/theme/colors'

type Slot = {
  name: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  iconActive: keyof typeof Ionicons.glyphMap
}

const SLOTS: Slot[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'explore', label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'sell', label: 'Sell', icon: 'add', iconActive: 'add' },
  { name: 'inbox', label: 'Inbox', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'account', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
]

export function TabBar({ state, navigation, unread = 0 }: BottomTabBarProps & { unread?: number }) {
  const insets = useSafeAreaInsets()
  const activeName = state.routes[state.index]?.name

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name)
    const focused = name === activeName
    const event = navigation.emit({ type: 'tabPress', target: route?.key, canPreventDefault: true })
    if (!focused && !event.defaultPrevented) navigation.navigate(name as never)
  }

  return (
    <View
      className="flex-row border-t border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 10,
        shadowColor: '#000',
        shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -3 },
        elevation: 12,
      }}
    >
      {SLOTS.map((slot) => {
        const focused = slot.name === activeName
        if (slot.name === 'sell') {
          return (
            <View key={slot.name} className="flex-1 items-center">
              <Pressable
                onPress={() => go(slot.name)}
                accessibilityRole="button"
                accessibilityLabel="Sell an item"
                className="items-center justify-center rounded-full bg-primary active:opacity-90"
                style={{
                  width: 52,
                  height: 52,
                  marginTop: -22,
                  shadowColor: COLORS.primaryDark,
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 8,
                }}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </Pressable>
              <Text className="mt-1 text-[10.5px] font-bold text-primary dark:text-primary-light">Sell</Text>
            </View>
          )
        }
        const showBadge = slot.name === 'inbox' && unread > 0
        return (
          <Pressable
            key={slot.name}
            onPress={() => go(slot.name)}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={slot.label}
            className="flex-1 items-center"
          >
            <View className="h-8 w-14 items-center justify-center rounded-full">
              <Ionicons
                name={focused ? slot.iconActive : slot.icon}
                size={22}
                color={focused ? COLORS.primary : COLORS.muted}
              />
              {showBadge ? (
                <View className="absolute -right-0.5 top-0 min-w-[16px] items-center justify-center rounded-full bg-danger px-1" style={{ height: 16 }}>
                  <Text className="text-[9.5px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </View>
            <Text className={`mt-1 text-[10.5px] font-semibold ${focused ? 'text-primary dark:text-primary-light' : 'text-muted dark:text-muted-dark'}`}>
              {slot.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
