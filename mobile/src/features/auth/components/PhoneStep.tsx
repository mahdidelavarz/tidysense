import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, TextInput, View } from 'react-native'
import { usePalette } from '../../../shared/lib/theme'
import { AppText } from '../../../shared/ui/AppText'
import { PrimaryButton } from '../../../shared/ui/PrimaryButton'
import { fonts } from '../../../shared/ui/tokens'
import { type PhoneFields, phoneSchema } from '../types/auth.types'

/** First sign-in step, as the web's PhoneStep: the phone number that receives the code. */
export function PhoneStep({ pending, onSubmit }: { pending: boolean; onSubmit: (phoneNumber: string) => void }) {
  const palette = usePalette()
  const form = useForm<PhoneFields>({ resolver: zodResolver(phoneSchema), defaultValues: { phoneNumber: '' } })
  const error = form.formState.errors.phoneNumber
  const submit = form.handleSubmit(values => onSubmit(values.phoneNumber))

  return (
    <View style={styles.form}>
      <Controller
        control={form.control}
        name="phoneNumber"
        render={({ field }) => (
          <TextInput
            testID="phone-input"
            accessibilityLabel="شماره موبایل"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={() => submit()}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            autoFocus
            placeholder="09__ ___ ____"
            placeholderTextColor={palette.textTertiary}
            style={[styles.input, { borderColor: error ? palette.attention : palette.border, backgroundColor: palette.surface, color: palette.textPrimary }]}
          />
        )}
      />
      {error && <AppText tone="attention" accessibilityRole="alert">{error.message}</AppText>}
      <PrimaryButton testID="phone-submit" label="دریافت کد" busyLabel="در حال ارسال…" busy={pending} onPress={() => submit()} />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 12, marginTop: 16 },
  // A phone number reads left to right inside the right-to-left screen.
  input: { minHeight: 56, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, fontSize: 20, fontFamily: fonts.bold, textAlign: 'left', writingDirection: 'ltr' },
})
