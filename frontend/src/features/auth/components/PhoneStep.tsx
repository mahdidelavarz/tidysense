import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const phoneSchema = z.object({ phoneNumber: z.string().regex(/^(09\d{9}|98\d{10}|\+98\d{10})$/, 'شماره موبایل معتبر وارد کنید.') })
export type PhoneFields = z.infer<typeof phoneSchema>

/** First login step: collects and validates the phone number that will receive the OTP. */
export function PhoneStep({ pending, onSubmit }: { pending: boolean; onSubmit: (phoneNumber: string) => void }) {
  const form = useForm<PhoneFields>({ resolver: zodResolver(phoneSchema) })
  return (
    <form className="mt-6 space-y-5" onSubmit={form.handleSubmit(values => onSubmit(values.phoneNumber))} noValidate aria-busy={pending}>
      <div>
        <label className="field-label" htmlFor="phone">شماره موبایل</label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="field-input text-left"
          {...form.register('phoneNumber')}
          aria-invalid={!!form.formState.errors.phoneNumber}
          aria-describedby={form.formState.errors.phoneNumber ? 'phone-error' : 'phone-hint'}
        />
        <span className="field-hint" id="phone-hint">مثال: ۰۹۱۲۱۲۳۴۵۶۷</span>
        {form.formState.errors.phoneNumber && <span className="field-error" id="phone-error" role="alert">{form.formState.errors.phoneNumber.message}</span>}
      </div>
      <button type="submit" className="primary-button w-full" disabled={pending}>{pending ? 'در حال ارسال…' : 'دریافت کد'}</button>
    </form>
  )
}
