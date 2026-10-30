import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { toApiError } from '../../../shared/api/http'
import { usePalette } from '../../../shared/lib/theme'
import { AppText } from '../../../shared/ui/AppText'
import { useRequestOtp, useVerifyOtp } from '../hooks/auth-hooks'
import { getDevelopmentOtp } from '../services/auth-api'
import { CodeStep } from './CodeStep'
import { PhoneStep } from './PhoneStep'

/**
 * Two-step OTP sign-in with the web's rules and copy (frontend/src/features/auth/components/LoginView.tsx).
 * MOB-02 keeps it plain; MOB-05 gives it the designed look. A successful sign-in updates the current-user
 * query, and the root route then shows the signed-in screen.
 */
export function LoginScreen() {
  const palette = usePalette()
  const [phone, setPhone] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [resendUntil, setResendUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null)
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()
  const busy = requestOtp.isPending || verifyOtp.isPending

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  function send(phoneNumber: string) {
    setError('')
    setDevelopmentCode(null)
    requestOtp.mutate(phoneNumber, {
      onSuccess: async response => {
        setPhone(phoneNumber)
        // Restart the clock too, so the countdown starts at the server's value, not one above it.
        const sentAt = Date.now()
        setNow(sentAt)
        setResendUntil(sentAt + response.retryAfterSeconds * 1000)
        // A development build only; the backend answers this only with Development:ShowLoginCode.
        if (__DEV__) {
          try {
            setDevelopmentCode(await getDevelopmentOtp(phoneNumber))
          } catch {
            // A missing code must not block sign-in.
          }
        }
      },
      onError: cause => setError(toApiError(cause).code === 'RATE_LIMITED'
        ? 'درخواست‌های زیادی ثبت شده است. کمی بعد دوباره تلاش کنید.'
        : 'ارسال کد ممکن نشد. دوباره تلاش کنید.'),
    })
  }

  function verify(code: string) {
    if (!phone) return
    setError('')
    verifyOtp.mutate({ phoneNumber: phone, code }, {
      onError: cause => setError(toApiError(cause).code === 'RATE_LIMITED'
        ? 'تلاش‌های زیادی انجام شده است. کمی بعد دوباره تلاش کنید.'
        : 'کد نامعتبر یا منقضی شده است.'),
    })
  }

  const resendRemaining = Math.max(0, Math.ceil((resendUntil - now) / 1000))

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.canvas }]}>
      <KeyboardAvoidingView behavior="height" style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText weight="bold" style={styles.brand}>TidySense</AppText>
          <AppText weight="display" style={styles.title} accessibilityRole="header">
            {phone ? 'کد را وارد کنید' : 'ورود یا ثبت‌نام'}
          </AppText>
          {phone
            ? (
              <View style={styles.row}>
                <AppText tone="secondary">به {phone} پیامک شد.</AppText>
                <Pressable accessibilityRole="button" style={styles.link} onPress={() => { setPhone(null); setError(''); setDevelopmentCode(null) }}>
                  <AppText weight="bold" style={{ color: palette.entityTask }}>ویرایش شماره</AppText>
                </Pressable>
              </View>
            )
            : <AppText tone="secondary">شماره موبایل خود را وارد کنید؛ یک کد چهار رقمی برایتان پیامک می‌شود.</AppText>}
          {phone
            ? <CodeStep pending={busy} resendRemainingSeconds={resendRemaining} onVerify={verify} onResend={() => send(phone)} />
            : <PhoneStep pending={busy} onSubmit={send} />}
          {error !== '' && (
            <View style={[styles.notice, { backgroundColor: palette.attentionTint }]}>
              <AppText tone="attention" accessibilityRole="alert">{error}</AppText>
            </View>
          )}
          {developmentCode && (
            <View style={[styles.notice, { backgroundColor: palette.surfaceSunken }]}>
              <AppText>کد آزمایشی ورود: <AppText weight="bold" testID="dev-otp">{developmentCode}</AppText></AppText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 4 },
  brand: { fontSize: 20, marginBottom: 24 },
  title: { fontSize: 23, lineHeight: 40 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  link: { minHeight: 48, justifyContent: 'center' },
  notice: { marginTop: 16, padding: 12, borderRadius: 12 },
})
