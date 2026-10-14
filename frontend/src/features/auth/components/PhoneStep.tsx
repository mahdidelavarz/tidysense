import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, Smartphone } from '../../../shared/ui/icons'

const phoneSchema = z.object({ phoneNumber: z.string().regex(/^(09\d{9}|98\d{10}|\+98\d{10})$/, 'شماره موبایل معتبر وارد کنید.') })
export type PhoneFields = z.infer<typeof phoneSchema>

/** First login step: collects and validates the phone number that will receive the OTP. */
export function PhoneStep({ pending, onSubmit }: { pending: boolean; onSubmit: (phoneNumber: string) => void }) {
  const form = useForm<PhoneFields>({ resolver: zodResolver(phoneSchema) })
  return (
    <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(values => onSubmit(values.phoneNumber))} noValidate aria-busy={pending}>
      <div>
        <label className="sr-only" htmlFor="phone">شماره موبایل</label>
        <div className="phone-field">
          <Smartphone size={22} className="shrink-0 text-text-secondary" aria-hidden="true" />
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="09__ ___ ____"
            data-autofocus
            className="min-w-0 flex-1 bg-transparent text-left text-xl font-bold tracking-wide outline-none placeholder:text-text-tertiary"
            {...form.register('phoneNumber')}
            aria-invalid={!!form.formState.errors.phoneNumber}
            aria-describedby={form.formState.errors.phoneNumber ? 'phone-error' : undefined}
          />
        </div>
        {form.formState.errors.phoneNumber && <span className="field-error" id="phone-error" role="alert">{form.formState.errors.phoneNumber.message}</span>}
      </div>
      <button type="submit" className="primary-button min-h-13.5 w-full rounded-[1.125rem] text-[0.9375rem]" disabled={pending}>
        {pending ? 'در حال ارسال…' : 'دریافت کد'}
        {!pending && <ArrowLeft size={18} aria-hidden="true" />}
      </button>
    </form>
  )
}
