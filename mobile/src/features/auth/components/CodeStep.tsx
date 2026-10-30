import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { formatNumber } from '../../../shared/lib/date'
import { usePalette } from '../../../shared/lib/theme'
import { AppText } from '../../../shared/ui/AppText'
import { PrimaryButton } from '../../../shared/ui/PrimaryButton'
import { fonts } from '../../../shared/ui/tokens'
import { type CodeFields, codeSchema } from '../types/auth.types'

const codeLength = 4

/**
 * Second sign-in step, as the web's OtpStep: one real input (so paste and Android's SMS code suggestion work),
 * then resend once allowed. The four-box picture comes with the real login screen in MOB-05.
 */
export function CodeStep({ pending, resendRemainingSeconds, onVerify, onResend }: {
  pending: boolean
  resendRemainingSeconds: number
  onVerify: (code: string) => void
  onResend: () => void
}) {
  const palette = usePalette()
  const form = useForm<CodeFields>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const code = form.watch('code')
  const error = form.formState.errors.code
  const submit = form.handleSubmit(values => onVerify(values.code))

  return (
    <View style={styles.form}>
      <Controller
        control={form.control}
        name="code"
        render={({ field }) => (
          <TextInput
            testID="code-input"
            accessibilityLabel="کد تأیید"
            value={field.value}
            onChangeText={value => field.onChange(value.replace(/\D/g, '').slice(0, codeLength))}
            onBlur={field.onBlur}
            onSubmitEditing={() => submit()}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={codeLength}
            autoFocus
            style={[styles.input, { borderColor: error ? palette.attention : palette.border, backgroundColor: palette.surface, color: palette.textPrimary }]}
          />
        )}
      />
      {error && <AppText tone="attention" accessibilityRole="alert">{error.message}</AppText>}
      <PrimaryButton testID="code-submit" label="ورود" busyLabel="در حال ورود…" busy={pending} disabled={code.length < codeLength} onPress={() => submit()} />
      {resendRemainingSeconds <= 0
        ? (
          <Pressable accessibilityRole="button" disabled={pending} onPress={onResend} style={styles.resend}>
            <AppText weight="bold" style={{ color: palette.entityTask }}>ارسال دوباره کد</AppText>
          </Pressable>
        )
        : <AppText tone="secondary" style={styles.center}>ارسال دوباره تا {formatNumber(resendRemainingSeconds)} ثانیه</AppText>}
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 12, marginTop: 16 },
  input: { minHeight: 56, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, fontSize: 24, letterSpacing: 12, fontFamily: fonts.bold, textAlign: 'center', writingDirection: 'ltr' },
  resend: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
})
