import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const codeSchema = z.object({ code: z.string().regex(/^\d{4}$/, 'کد چهار رقمی را وارد کنید.') })
export type OtpFields = z.infer<typeof codeSchema>

/** Second login step: enter the OTP, with resend (rate-limited) and edit-phone escapes. */
export function OtpStep({ phone, pending, resendRemainingSeconds, onVerify, onResend, onEditPhone }: {
  phone: string
  pending: boolean
  resendRemainingSeconds: number
  onVerify: (code: string) => void
  onResend: () => void
  onEditPhone: () => void
}) {
  const form = useForm<OtpFields>({ resolver: zodResolver(codeSchema) })
  const canResend = resendRemainingSeconds <= 0

  return (
    <div className="mt-6">
      <p className="rounded-lg bg-accent-tint p-3 text-sm text-accent-strong">کد ارسال‌شده به <bdi dir="ltr">{phone}</bdi> را وارد کنید.</p>
      <form className="mt-5 space-y-5" onSubmit={form.handleSubmit(values => onVerify(values.code))} noValidate aria-busy={pending}>
        <div>
          <label className="field-label" htmlFor="code">کد تأیید</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={4}
            className="field-input text-center font-mono text-xl tracking-[0.5em]"
            {...form.register('code')}
            aria-invalid={!!form.formState.errors.code}
            aria-describedby={form.formState.errors.code ? 'code-error' : undefined}
          />
          {form.formState.errors.code && <span className="field-error" id="code-error" role="alert">{form.formState.errors.code.message}</span>}
        </div>
        <button type="submit" className="primary-button w-full" disabled={pending}>{pending ? 'در حال ورود…' : 'ورود'}</button>
      </form>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="ghost-button" disabled={pending || !canResend} onClick={onResend}>
          {canResend ? 'ارسال دوباره کد' : `ارسال دوباره تا ${resendRemainingSeconds} ثانیه`}
        </button>
        <button type="button" className="ghost-button" onClick={onEditPhone}>ویرایش شماره</button>
      </div>
    </div>
  )
}
