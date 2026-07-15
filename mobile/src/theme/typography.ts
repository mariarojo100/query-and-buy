/**
 * Global Inter typography.
 *
 * expo-google-fonts exposes each weight as its OWN family (Inter_700Bold, …),
 * so React Native's fontWeight can't select them. We patch Text/TextInput once
 * to map the resolved fontWeight → the matching Inter family, then drop
 * fontWeight (the family already encodes it). Existing explicit fontFamily is
 * respected — so Ionicons and other icon glyphs are never touched.
 *
 * Native-only effect; on react-native-web (`.render` shape differs) it no-ops
 * safely and the browser falls back to the loaded webfont via CSS.
 */
import React from 'react'
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native'

const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
}

let installed = false

export function installInterTypography(): void {
  if (installed) return
  installed = true
  for (const Comp of [RNText, RNTextInput] as unknown as { render?: (...a: unknown[]) => React.ReactElement }[]) {
    const original = Comp.render
    if (typeof original !== 'function') continue
    Comp.render = function patched(...args: unknown[]) {
      const el = original.apply(this, args)
      const flat = (StyleSheet.flatten((el.props as { style?: unknown }).style) ?? {}) as {
        fontWeight?: string | number
        fontFamily?: string
      }
      // Respect an explicit family (icon fonts, deliberate overrides).
      if (flat.fontFamily) return el
      const weight = flat.fontWeight != null ? String(flat.fontWeight) : '400'
      const fontFamily = FAMILY_BY_WEIGHT[weight] ?? 'Inter_400Regular'
      return React.cloneElement(el, {
        style: [{ fontFamily }, (el.props as { style?: unknown }).style, { fontWeight: undefined }],
      } as Partial<typeof el.props>)
    }
  }
}
