import { Text, type TextProps } from 'react-native'
import { usePalette } from '../lib/theme'
import { fonts } from './tokens'

type Weight = keyof typeof fonts

/**
 * Every visible string goes through this, so the app never falls back to Roboto for Persian. Android picks no
 * weight from one family, so the weight is a font name (tokens.ts), never `fontWeight`.
 */
export function AppText({ weight = 'regular', tone = 'primary', style, ...props }: TextProps & {
  weight?: Weight
  tone?: 'primary' | 'secondary' | 'attention'
}) {
  const palette = usePalette()
  const color = tone === 'secondary' ? palette.textSecondary : tone === 'attention' ? palette.attention : palette.textPrimary
  return <Text {...props} style={[{ fontFamily: fonts[weight], color, fontSize: 15, lineHeight: 26 }, style]} />
}
