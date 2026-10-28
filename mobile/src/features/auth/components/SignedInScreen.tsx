import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeStore, usePalette } from '../../../shared/lib/theme'
import { AppText } from '../../../shared/ui/AppText'
import { PrimaryButton } from '../../../shared/ui/PrimaryButton'
import type { CurrentUser } from '../types/auth.types'
import { useLogout } from '../hooks/auth-hooks'

/**
 * MOB-02 stand-in for the signed-in app: proves the bearer session round trip (`/users/me`), the fonts and
 * right-to-left layout on a device. MOB-04 replaces it with the dock and Today.
 */
export function SignedInScreen({ user }: { user: CurrentUser }) {
  const palette = usePalette()
  const logout = useLogout()
  const preference = useThemeStore(state => state.preference)
  const setPreference = useThemeStore(state => state.setPreference)
  const next = preference === 'system' ? 'dark' : preference === 'dark' ? 'light' : 'system'

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.canvas }]}>
      <View style={styles.content}>
        <AppText weight="display" style={styles.title} accessibilityRole="header">وارد شدید</AppText>
        <AppText testID="signed-in-phone" tone="secondary">{user.phoneNumber}</AppText>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <AppText weight="medium">آزمون راست‌به‌چپ: این متن باید از سمت راست شروع شود.</AppText>
          <AppText tone="secondary">وزیرمتن معمولی، <AppText weight="bold">ضخیم</AppText> و <AppText weight="display">نسخ</AppText></AppText>
        </View>
        <PrimaryButton label={`پوسته: ${preference === 'system' ? 'دستگاه' : preference === 'dark' ? 'تیره' : 'روشن'}`} onPress={() => setPreference(next)} />
        <PrimaryButton testID="logout" label="خروج" busyLabel="در حال خروج…" busy={logout.isPending} onPress={() => logout.mutate(false)} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 23, lineHeight: 40 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 4 },
})
