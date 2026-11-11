import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { LoginScreen } from '../features/auth/components/LoginScreen'
import { SignedInScreen } from '../features/auth/components/SignedInScreen'
import { useCurrentUser } from '../features/auth/hooks/auth-hooks'
import { usePalette } from '../shared/lib/theme'
import { AppText } from '../shared/ui/AppText'
import { PrimaryButton } from '../shared/ui/PrimaryButton'

/** The auth gate: signed out shows the login, signed in shows the MOB-02 stand-in. */
export default function Index() {
  const palette = usePalette()
  const user = useCurrentUser()

  if (user.isPending) {
    return <View style={[styles.center, { backgroundColor: palette.canvas }]}><ActivityIndicator color={palette.accent} /></View>
  }
  if (user.isError) {
    return (
      <View style={[styles.center, { backgroundColor: palette.canvas }]}>
        <AppText tone="secondary">اتصال به سرور ممکن نشد.</AppText>
        <PrimaryButton label="تلاش دوباره" onPress={() => user.refetch()} />
      </View>
    )
  }
  return user.data ? <SignedInScreen user={user.data} /> : <LoginScreen />
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
})
