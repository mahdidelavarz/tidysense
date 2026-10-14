import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft } from '../../../shared/ui/icons'

const codeLength = 4
const codeSchema = z.object({ code: z.string().regex(/^\d{4}$/, 'کد چهار رقمی را وارد کنید.') })
export type OtpFields = z.infer<typeof codeSchema>

/**
 * Second sign-in step: the code as four boxes, with resend once allowed.
 * The boxes are a picture of one real input laid over them, so typing,
 * pasting and the phone's one-time-code suggestion all work as usual.
 */
export function OtpStep({ pending, resendRemainingSeconds, onVerify, onResend }: {
  pending: boolean
  resendRemainingSeconds: number
  onVerify: (code: string) => void
  onResend: () => void
}) {
  const form = useForm<OtpFields>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const code = form.watch('code') ?? ''
  const canResend = resendRemainingSeconds <= 0
  const error = form.formState.errors.code

  return (
    <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(values => onVerify(values.code))} noValidate aria-busy={pending}>
      <div>
        <label className="sr-only" htmlFor="code">کد تأیید</label>
        <div className="otp" dir="ltr">
          <input
            id="code"
            className="otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={codeLength}
            data-autofocus
            {...form.register('code', { setValueAs: (value: string) => value.replace(/\D/g, '').slice(0, codeLength) })}
            aria-invalid={!!error}
            aria-describedby={error ? 'code-error' : undefined}
          />
          {Array.from({ length: codeLength }, (_, index) => index).map(index => (
            <span key={index} className="otp-box" data-active={index === Math.min(code.length, codeLength - 1)} data-filled={index < code.length} aria-hidden="true">
              {code[index] ?? ''}
            </span>
          ))}
        </div>
        {error && <span className="field-error" id="code-error" role="alert">{error.message}</span>}
      </div>
      <button type="submit" className="primary-button min-h-13.5 w-full rounded-[1.125rem] text-[0.9375rem]" disabled={pending || code.length < codeLength}>
        {pending ? 'در حال ورود…' : 'ورود'}
        {!pending && <ArrowLeft size={18} aria-hidden="true" />}
      </button>
      <p className="text-center text-[0.78125rem] text-text-secondary">
        {canResend
          ? <button type="button" className="min-h-11 font-extrabold text-entity-task" disabled={pending} onClick={onResend}>ارسال دوباره کد</button>
          : <>ارسال دوباره تا <b className="text-text-primary">{new Intl.NumberFormat('fa-IR').format(resendRemainingSeconds)}</b> ثانیه</>}
      </p>
    </form>
  )
}
