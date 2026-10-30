import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import { usePalette } from '../lib/theme'
import { AppText } from './AppText'

/** The one filled button: full width, 54dp tall (above the 48dp touch minimum), busy state built in. */
export function PrimaryButton({ label, busyLabel, busy = false, disabled = false, onPress, testID }: {
  label: string
  busyLabel?: string
  busy?: boolean
  disabled?: boolean
  onPress: () => void
  testID?: string
}) {
  const palette = usePalette()
  const inactive = busy || disabled
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.button, { backgroundColor: palette.accent, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 }]}
    >
      {busy && <ActivityIndicator color={palette.onAccent} />}
      <AppText weight="bold" style={{ color: palette.onAccent }}>{busy && busyLabel ? busyLabel : label}</AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
})
