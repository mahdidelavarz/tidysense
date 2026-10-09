import { Link } from '@tanstack/react-router'
import { toApiError } from '../../../shared/api/http'
import { FormError } from '../../../shared/ui/FormUi'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { usePilotNotice, useSetAiConsent } from '../hooks/pilot-hooks'

/**
 * Asked before any planning text is sent to the AI provider. It names the
 * provider and says the text leaves the country; declining keeps every
 * manual path. The server enforces the same rule, so this card is the
 * explanation, not the guard.
 */
export function AiConsentCard({ onManual }: { onManual: () => void }) {
  const notice = usePilotNotice()
  const consent = useSetAiConsent()

  if (notice.isPending) return <LoadingState text="در حال دریافت توضیح استفاده از هوش مصنوعی…" />
  if (notice.isError || !notice.data.aiProviderName) {
    return (
      <ErrorState
        title="توضیح استفاده از هوش مصنوعی دریافت نشد."
        description="تا این توضیح را نبینید و نپذیرید، چیزی برای سرویس هوش مصنوعی فرستاده نمی‌شود. ساخت دستی در دسترس است."
        onRetry={() => notice.refetch()}
        action={<button className="primary-button" type="button" onClick={onManual}>ساخت دستی</button>}
      />
    )
  }
  const provider = notice.data.aiProviderName
  const noticeVersion = notice.data.noticeVersion
  const changed = consent.error && toApiError(consent.error).code === 'AI_CONSENT_NOTICE_CHANGED'
  return (
    <section className="card" aria-labelledby="ai-consent-title">
      <h2 className="font-bold" id="ai-consent-title">اجازه شما برای برنامه‌ریزی با هوش مصنوعی</h2>
      <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-7 text-text-secondary">
        <li>
          برای ساخت پیش‌نویس، نوشته شما، پاسخ‌هایتان به پرسش‌های تکمیلی و خلاصه‌ای از همین حساب (عنوان و تاریخ هدف، پروژه‌ها، کارها و روتین‌های مرتبط) برای سرویس <bdi className="font-bold text-text-primary">{provider}</bdi> فرستاده می‌شود.
        </li>
        <li>سرورهای این سرویس بیرون از ایران هستند؛ یعنی این متن از کشور خارج می‌شود و نگه‌داری آن در آنجا تابع قواعد همان سرویس است، نه تایدی‌سنس.</li>
        <li>شماره تلفن شما فرستاده نمی‌شود. چیزی را که نمی‌خواهید از کشور خارج شود در نوشته برنامه‌ریزی نیاورید.</li>
        <li>هوش مصنوعی فقط پیشنهاد می‌دهد؛ تا خودتان پیش‌نویس را مرور و تأیید نکنید چیزی ساخته یا عوض نمی‌شود.</li>
        <li>بدون این اجازه، برنامه‌ریزی با هوش مصنوعی انجام نمی‌شود، ولی ساخت دستی هدف، پروژه، کار و روتین مثل همیشه در دسترس است. هر وقت بخواهید می‌توانید این اجازه را در صفحه «حریم خصوصی» پس بگیرید.</li>
      </ul>
      {changed
        ? <p className="notice-attention mt-4" role="alert">این توضیح به‌روز شده است. متن تازه را بخوانید و دوباره تصمیم بگیرید.</p>
        : <div className="mt-4"><FormError error={consent.error} /></div>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="primary-button"
          type="button"
          disabled={consent.isPending}
          onClick={() => consent.mutate({ granted: true, noticeVersion })}
        >
          {consent.isPending ? 'در حال ثبت…' : 'موافقم، با هوش مصنوعی برنامه‌ریزی کن'}
        </button>
        <button className="secondary-button" type="button" disabled={consent.isPending} onClick={onManual}>خودم دستی می‌سازم</button>
        <Link className="text-link" to="/privacy">حریم خصوصی و داده‌ها</Link>
      </div>
    </section>
  )
}
