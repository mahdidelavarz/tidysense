import { useNavigate } from '@tanstack/react-router'
import { FolderKanban, Sun, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { getDevelopmentOtp } from '../services/auth-api'
import { useRequestOtp, useVerifyOtp } from '../hooks/auth-hooks'
import { DevelopmentOtpToast } from './DevelopmentOtpToast'
import { OtpStep } from './OtpStep'
import { PhoneStep } from './PhoneStep'

const loginHighlights = [
  { icon: Sun, text: 'هر روز فقط کارهای همان روز را ببینید.' },
  { icon: FolderKanban, text: 'تلاش‌های بزرگ را به پروژه‌های قابل‌مدیریت بشکنید.' },
  { icon: Target, text: 'هدف‌هایتان را روشن و جلوی چشم نگه دارید.' },
]

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
        await navigate({ to: user.setupComplete ? '/today' : '/first-entry' })
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
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      {/* Brand panel: a full half on desktop, a compact band on phones. */}
      <aside className="flex flex-col justify-between gap-8 bg-accent px-6 py-8 text-white sm:px-10 lg:py-14">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white text-xl font-extrabold text-accent" aria-hidden="true">ت</span>
          <span className="text-xl font-extrabold tracking-tight">تایدی‌سنس</span>
        </div>
        <div className="hidden lg:block">
          <p className="text-3xl font-extrabold leading-relaxed">برنامه‌ای که با زندگی واقعی شما کنار می‌آید.</p>
          <ul className="mt-8 space-y-4 text-white/90">
            {loginHighlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden="true"><Icon size={20} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm text-white/70 lg:block">هدف، پروژه و کار روزانه در یک جای آرام.</p>
      </aside>

      <section className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold">ورود به حساب</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {phone ? 'کد تأیید پیامک‌شده را وارد کنید.' : 'شماره موبایل خود را وارد کنید تا کد ورود برایتان پیامک شود.'}
          </p>
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
          {error && <p role="alert" className="notice-attention mt-5 font-medium">{error}</p>}
        </div>
      </section>
      {import.meta.env.DEV && developmentCode && (
        <DevelopmentOtpToast code={developmentCode} onDismiss={() => setDevelopmentCode(null)} />
      )}
    </div>
  )
}
