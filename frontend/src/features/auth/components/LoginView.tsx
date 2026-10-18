import { Link, useNavigate } from '@tanstack/react-router'
import photo from '../../../shared/assets/night.jpg'
import { FolderKanban, ShieldCheck, Sun, Target } from '../../../shared/ui/icons'
import { useEffect, useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { getDevelopmentOtp } from '../services/auth-api'
import { useRequestOtp, useVerifyOtp } from '../hooks/auth-hooks'
import { DevelopmentOtpToast } from './DevelopmentOtpToast'
import { OtpStep } from './OtpStep'
import { PhoneStep } from './PhoneStep'

// Vite's dev server, or a local Docker rehearsal built with VITE_SHOW_LOGIN_CODE. Never a server build.
const showDevelopmentCode = import.meta.env.DEV || import.meta.env.VITE_SHOW_LOGIN_CODE === 'true'

const loginHighlights = [
  { icon: Sun, text: 'هر روز فقط کارهای همان روز' },
  { icon: FolderKanban, text: 'تلاش‌های بزرگ، در قدم‌های کوچک' },
  { icon: Target, text: 'هدف‌ها همیشه جلوی چشم' },
]

/**
 * Two-step OTP sign-in (a first sign-in creates the account): phone, then
 * code. On a phone the form is a sheet over the photograph; on desktop the
 * photograph is the start half of the screen.
 */
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
        if (showDevelopmentCode) {
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
    <div className="login">
      {/* The photograph: behind the whole screen on a phone, the start half on desktop. */}
      <header className="login-photo">
        <img className="absolute inset-0 size-full object-cover" style={{ objectPosition: '50% 35%' }} src={photo} alt="" />
        <div className="login-veil" aria-hidden="true" />
        <div className="login-intro">
          <span className="flex items-center gap-2.5">
            <span className="login-mark" aria-hidden="true">ت</span>
            <span className="text-xl font-extrabold">تایدی‌سنس</span>
          </span>
          <p className="mt-1.5 font-display text-[1.6875rem] font-bold leading-[1.55] lg:text-[2.25rem]">برنامه‌ای که با زندگی واقعی شما کنار می‌آید.</p>
          <ul className="space-y-2">
            {loginHighlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-[0.78125rem] font-bold lg:text-base">
                <span className="flex size-6.5 shrink-0 items-center justify-center rounded-[0.5625rem] bg-white/20" aria-hidden="true"><Icon size={15} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <section className="login-sheet" aria-labelledby="login-title">
        <h1 className="display-title text-[1.4375rem]" id="login-title">{phone ? 'کد را وارد کنید' : 'ورود یا ثبت‌نام'}</h1>
        {phone ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] leading-7 text-text-secondary">
            به <bdi className="font-bold text-text-primary" dir="ltr">{phone}</bdi> پیامک شد.
            <button className="font-extrabold text-entity-task" type="button" onClick={() => { setPhone(null); setError(''); setDevelopmentCode(null) }}>ویرایش شماره</button>
          </p>
        ) : (
          <p className="mt-0.5 text-[0.8125rem] leading-7 text-text-secondary">شماره موبایل خود را وارد کنید؛ یک کد چهار رقمی برایتان پیامک می‌شود.</p>
        )}
        {!phone
          ? <PhoneStep pending={busy} onSubmit={send} />
          : (
            <OtpStep
              pending={busy}
              resendRemainingSeconds={resendRemaining}
              onVerify={verify}
              onResend={() => send(phone)}
            />
          )}
        {error && <p role="alert" className="notice-attention mt-4 font-medium">{error}</p>}
        <p className="mt-5 text-center">
          <Link className="inline-flex min-h-11 items-center gap-1.5 text-[0.78125rem] font-bold text-text-secondary hover:text-text-primary" to="/privacy">
            <ShieldCheck size={15} aria-hidden="true" />
            حریم خصوصی و داده‌ها
          </Link>
        </p>
      </section>
      {showDevelopmentCode && developmentCode && (
        <DevelopmentOtpToast code={developmentCode} onDismiss={() => setDevelopmentCode(null)} />
      )}
    </div>
  )
}
