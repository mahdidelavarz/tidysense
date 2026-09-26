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
  return <section className="mx-auto max-w-md p-6">
    <h1 className="text-2xl font-bold">ورود به تایدی‌سنس</h1>
    {!phone ? <form className="mt-6 space-y-4" onSubmit={phoneForm.handleSubmit(v => send(v.phoneNumber))}>
      <label className="block" htmlFor="phone">شماره موبایل</label>
      <input id="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
        className="w-full rounded-lg border border-border bg-surface p-3"
        {...phoneForm.register('phoneNumber')} aria-invalid={!!phoneForm.formState.errors.phoneNumber} />
      {phoneForm.formState.errors.phoneNumber && <p role="alert">{phoneForm.formState.errors.phoneNumber.message}</p>}
      <button type="submit" className="rounded-lg bg-accent px-5 py-3 text-white disabled:opacity-50" disabled={busy}>دریافت کد</button>
    </form> : <div className="mt-6">
      <p>کد ارسال‌شده به {phone} را وارد کنید.</p>
      <form className="mt-4 space-y-4" onSubmit={codeForm.handleSubmit(verify)}>
        <label className="block" htmlFor="code">کد تأیید</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={4}
          className="w-full rounded-lg border border-border bg-surface p-3"
          {...codeForm.register('code')} aria-invalid={!!codeForm.formState.errors.code} />
        {codeForm.formState.errors.code && <p role="alert">{codeForm.formState.errors.code.message}</p>}
        <button type="submit" className="rounded-lg bg-accent px-5 py-3 text-white disabled:opacity-50" disabled={busy}>ورود</button>
      </form>
      <button type="button" className="mt-5 underline disabled:opacity-50" disabled={busy || remaining > 0}
        onClick={() => send(phone)}>{remaining > 0 ? `ارسال دوباره تا ${remaining} ثانیه` : 'ارسال دوباره کد'}</button>
      <button type="button" className="mr-4 underline" onClick={() => { setPhone(null); setError(''); setDevelopmentCode(null) }}>ویرایش شماره</button>
    </div>}
    {error && <p role="alert" className="mt-4 text-attention">{error}</p>}
    {import.meta.env.DEV && developmentCode && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-4 rounded-lg bg-surface px-4 py-3 shadow-lg" dir="rtl">
      <span>کد آزمایشی ورود: <strong dir="ltr" className="font-mono">{developmentCode}</strong></span>
      <button type="button" aria-label="بستن اعلان کد" className="text-lg" onClick={() => setDevelopmentCode(null)}>×</button>
    </div>}
  </section>
}
