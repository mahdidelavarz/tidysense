import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toApiError } from '../../../shared/api/http'
import { currentUserQueryKey } from './AuthGate'
import { getDevelopmentOtp, requestOtp, verifyOtp } from '../services/auth-api'

const phoneSchema = z.object({ phoneNumber: z.string().regex(/^(09\d{9}|98\d{10}|\+98\d{10})$/, 'شماره موبایل معتبر وارد کنید.') })
const codeSchema = z.object({ code: z.string().regex(/^\d{4}$/, 'کد چهار رقمی را وارد کنید.') })

export function LoginView() {
  const [phone, setPhone] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [resendUntil, setResendUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null)
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema) })
  const codeForm = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema) })
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!developmentCode) return
    const timer = window.setTimeout(() => setDevelopmentCode(null), 10000)
    return () => window.clearTimeout(timer)
  }, [developmentCode])

  async function send(phoneNumber: string) {
    setBusy(true)
    setError('')
    setDevelopmentCode(null)
    try {
      const response = await requestOtp(phoneNumber)
      setPhone(phoneNumber)
      setResendUntil(Date.now() + response.retryAfterSeconds * 1000)
      if (import.meta.env.DEV) {
        try {
          setDevelopmentCode(await getDevelopmentOtp(phoneNumber))
        } catch {
          // The development preview is optional; OTP request success still stands.
        }
      }
    } catch (cause) {
      const apiError = toApiError(cause)
      setError(apiError.code === 'RATE_LIMITED' ? 'درخواست‌های زیادی ثبت شده است. کمی بعد دوباره تلاش کنید.' :
        'ارسال کد ممکن نشد. دوباره تلاش کنید.')
    } finally { setBusy(false) }
  }

  async function verify(values: z.infer<typeof codeSchema>) {
    if (!phone) return
    setBusy(true)
    setError('')
    try {
      const user = await verifyOtp(phone, values.code)
      setDevelopmentCode(null)
      queryClient.setQueryData(currentUserQueryKey, user)
      await navigate({ to: user.setupComplete ? '/' : '/first-entry' })
    } catch (cause) {
      const apiError = toApiError(cause)
      setError(apiError.code === 'RATE_LIMITED' ? 'تلاش‌های زیادی انجام شده است. کمی بعد دوباره تلاش کنید.' :
        'کد نامعتبر یا منقضی شده است.')
    } finally { setBusy(false) }
  }

  const remaining = Math.max(0, Math.ceil((resendUntil - now) / 1000))
  return <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
    <section className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white" aria-hidden="true">ت</span>
        <div>
          <p className="text-sm font-bold text-accent">تایدی‌سنس</p>
          <h1 className="text-2xl font-bold">ورود به حساب</h1>
        </div>
      </div>
      <p className="mt-4 text-sm text-text-secondary">برای ادامه، شماره موبایل خود را وارد کنید.</p>
      {!phone ? <form className="mt-6 space-y-5" onSubmit={phoneForm.handleSubmit(v => send(v.phoneNumber))} noValidate aria-busy={busy}>
        <div>
          <label className="field-label" htmlFor="phone">شماره موبایل</label>
          <input id="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
            className="field-input text-left"
            {...phoneForm.register('phoneNumber')} aria-invalid={!!phoneForm.formState.errors.phoneNumber}
            aria-describedby={phoneForm.formState.errors.phoneNumber ? 'phone-error' : 'phone-hint'} />
          <span className="field-hint" id="phone-hint">مثال: ۰۹۱۲۱۲۳۴۵۶۷</span>
          {phoneForm.formState.errors.phoneNumber && <span className="field-error" id="phone-error" role="alert">{phoneForm.formState.errors.phoneNumber.message}</span>}
        </div>
        <button type="submit" className="primary-button w-full" disabled={busy}>{busy ? 'در حال ارسال…' : 'دریافت کد'}</button>
      </form> : <div className="mt-6">
        <p className="rounded-lg bg-accent-tint p-3 text-sm text-accent-strong">کد ارسال‌شده به <bdi dir="ltr">{phone}</bdi> را وارد کنید.</p>
        <form className="mt-5 space-y-5" onSubmit={codeForm.handleSubmit(verify)} noValidate aria-busy={busy}>
          <div>
            <label className="field-label" htmlFor="code">کد تأیید</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={4}
              className="field-input text-center font-mono text-xl tracking-[0.5em]"
              {...codeForm.register('code')} aria-invalid={!!codeForm.formState.errors.code}
              aria-describedby={codeForm.formState.errors.code ? 'code-error' : undefined} />
            {codeForm.formState.errors.code && <span className="field-error" id="code-error" role="alert">{codeForm.formState.errors.code.message}</span>}
          </div>
          <button type="submit" className="primary-button w-full" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود'}</button>
        </form>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="ghost-button" disabled={busy || remaining > 0}
            onClick={() => send(phone)}>{remaining > 0 ? `ارسال دوباره تا ${remaining} ثانیه` : 'ارسال دوباره کد'}</button>
          <button type="button" className="ghost-button" onClick={() => { setPhone(null); setError(''); setDevelopmentCode(null) }}>ویرایش شماره</button>
        </div>
      </div>}
      {error && <p role="alert" className="mt-5 rounded-lg border border-attention/40 bg-attention-tint p-3 text-sm font-medium text-text-primary">{error}</p>}
    </section>
    {import.meta.env.DEV && developmentCode && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-4 rounded-lg bg-surface px-4 py-3 shadow-lg" dir="rtl">
      <span>کد آزمایشی ورود: <strong dir="ltr" className="font-mono">{developmentCode}</strong></span>
      <button type="button" aria-label="بستن اعلان کد" className="ghost-button size-11 px-0 text-lg" onClick={() => setDevelopmentCode(null)}>×</button>
    </div>}
  </div>
}
