import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { getDevelopmentOtp } from '../services/auth-api'
import { useRequestOtp, useVerifyOtp } from '../hooks/auth-hooks'
import { DevelopmentOtpToast } from './DevelopmentOtpToast'
import { OtpStep } from './OtpStep'
import { PhoneStep } from './PhoneStep'

/** Two-step OTP login: phone entry, then code verification. */
export function LoginView() {
  const [phone, setPhone] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [resendUntil, setResendUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null)
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()
  const navigate = useNavigate()
  const busy = requestOtp.isPending || verifyOtp.isPending

  // Drives the "resend in N seconds" countdown display.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // The development OTP preview is a temporary toast; auto-dismiss it.
  useEffect(() => {
    if (!developmentCode) return
    const timer = window.setTimeout(() => setDevelopmentCode(null), 10000)
    return () => window.clearTimeout(timer)
  }, [developmentCode])

  function send(phoneNumber: string) {
    setError('')
    setDevelopmentCode(null)
    requestOtp.mutate(phoneNumber, {
      onSuccess: async response => {
        setPhone(phoneNumber)
        setResendUntil(Date.now() + response.retryAfterSeconds * 1000)
        if (import.meta.env.DEV) {
          // Local dev convenience only; the endpoint does not exist outside
          // the Development profile, and a failure here must not block login.
          try {
            setDevelopmentCode(await getDevelopmentOtp(phoneNumber))
          } catch {
            // intentionally ignored
          }
        }
      },
      onError: cause => {
        const apiError = toApiError(cause)
        setError(apiError.code === 'RATE_LIMITED'
          ? 'درخواست‌های زیادی ثبت شده است. کمی بعد دوباره تلاش کنید.'
          : 'ارسال کد ممکن نشد. دوباره تلاش کنید.')
      },
    })
  }

  function verify(code: string) {
    if (!phone) return
    setError('')
    verifyOtp.mutate({ phoneNumber: phone, code }, {
      onSuccess: async user => {
        setDevelopmentCode(null)
        await navigate({ to: user.setupComplete ? '/' : '/first-entry' })
      },
      onError: cause => {
        const apiError = toApiError(cause)
        setError(apiError.code === 'RATE_LIMITED'
          ? 'تلاش‌های زیادی انجام شده است. کمی بعد دوباره تلاش کنید.'
          : 'کد نامعتبر یا منقضی شده است.')
      },
    })
  }

  const resendRemaining = Math.max(0, Math.ceil((resendUntil - now) / 1000))

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <section className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white" aria-hidden="true">ت</span>
          <div>
            <p className="text-sm font-bold text-accent">تایدی‌سنس</p>
            <h1 className="text-2xl font-bold">ورود به حساب</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-text-secondary">برای ادامه، شماره موبایل خود را وارد کنید.</p>
        {!phone
          ? <PhoneStep pending={busy} onSubmit={send} />
          : (
            <OtpStep
              phone={phone}
              pending={busy}
              resendRemainingSeconds={resendRemaining}
              onVerify={verify}
              onResend={() => send(phone)}
              onEditPhone={() => { setPhone(null); setError(''); setDevelopmentCode(null) }}
            />
          )}
        {error && <p role="alert" className="mt-5 rounded-lg border border-attention/40 bg-attention-tint p-3 text-sm font-medium text-text-primary">{error}</p>}
      </section>
      {import.meta.env.DEV && developmentCode && (
        <DevelopmentOtpToast code={developmentCode} onDismiss={() => setDevelopmentCode(null)} />
      )}
    </div>
  )
}
