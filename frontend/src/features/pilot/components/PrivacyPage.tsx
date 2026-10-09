import { Link } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { usePilotNotice, useSetAiConsent } from '../hooks/pilot-hooks'

const title = 'حریم خصوصی و داده‌ها'

/**
 * What is kept, for how long, where planning text goes and how to have an
 * account erased. Every number and name comes from the server's running
 * configuration, so this text cannot say something the system does not do.
 * It is readable without a session.
 */
export function PrivacyPage() {
  const user = useCurrentUser().data
  const notice = usePilotNotice()
  const consent = useSetAiConsent()
  const [withdrawing, setWithdrawing] = useState(false)

  const frame = (content: ReactNode) => user
    ? <div className="page"><PageHeader title={title} />{content}</div>
    : (
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="page-title">{title}</h1>
          <Link className="text-link mt-2 inline-block" to="/login">بازگشت به ورود</Link>
        </header>
        {content}
      </div>
    )

  if (notice.isPending) return frame(<LoadingState text="در حال دریافت…" />)
  if (notice.isError) return frame(<ErrorState onRetry={() => notice.refetch()} />)
  const data = notice.data
  const days = (value: number | string) => `${formatNumber(Number(value))} روز`
  const closeWithdraw = () => {
    setWithdrawing(false)
    consent.reset()
  }

  return frame(
    <div className="space-y-4">
      <section className="card" aria-labelledby="privacy-kept">
        <h2 className="font-bold" id="privacy-kept">چه چیزی و تا کی نگه داشته می‌شود</h2>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-7 text-text-secondary">
          <li>هدف‌ها، پروژه‌ها، کارها، روتین‌ها و یادداشت‌های سریع شما تا وقتی حساب دارید نگه داشته می‌شوند.</li>
          <li>پیش‌نویس‌های برنامه‌ریزی و نوشته‌ای که برایشان داده‌اید {days(data.draftDays)} پس از پایان پیش‌نویس پاک می‌شوند.</li>
          <li>تاریخچه هر بازبینی {days(data.sessionHistoryDays)} پس از بسته‌شدن آن پاک می‌شود؛ پاسخ‌های شما به پرسش‌های اختیاری هم همین مدت می‌مانند.</li>
          <li>اطلاعات فنی عملکرد (بدون متن شما) {days(data.diagnosticsDays)} نگه داشته می‌شود.</li>
          <li>سابقه تصمیم‌های شما (چه کاری، چه زمانی؛ بدون عنوان و متن) می‌ماند و پس از حذف حساب به شما وصل نیست.</li>
        </ul>
      </section>

      <section className="card" aria-labelledby="privacy-ai">
        <h2 className="font-bold" id="privacy-ai">هوش مصنوعی</h2>
        {data.aiProviderName ? (
          <>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              برنامه‌ریزی با هوش مصنوعی فقط با اجازه شما انجام می‌شود. در آن صورت نوشته برنامه‌ریزی، پاسخ‌های شما و خلاصه‌ای از همین حساب برای سرویس <bdi className="font-bold text-text-primary">{data.aiProviderName}</bdi> فرستاده می‌شود که سرورهایش بیرون از ایران است. توضیحِ بازبینی فقط با شمارش‌ها و کدها ساخته می‌شود و متن شما را نمی‌فرستد. تایدی‌سنس متن فرستاده‌شده و پاسخ خام سرویس را ذخیره نمی‌کند.
            </p>
            {user && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className={`status-badge ${user.aiConsentGranted ? 'status-active' : 'status-neutral'}`}>
                  {user.aiConsentGranted ? 'اجازه داده‌اید' : 'اجازه نداده‌اید'}
                </p>
                {user.aiConsentGranted
                  ? <button className="secondary-button" type="button" onClick={() => setWithdrawing(true)}>پس گرفتن اجازه</button>
                  : <Link className="text-link" to="/planning">دادن اجازه در صفحه برنامه‌ریزی</Link>}
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm leading-7 text-text-secondary">در این نسخه هیچ متنی برای سرویس هوش مصنوعی بیرونی فرستاده نمی‌شود.</p>
        )}
      </section>

      <section className="card" aria-labelledby="privacy-erasure">
        <h2 className="font-bold" id="privacy-erasure">حذف حساب و داده‌ها</h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          برای حذف حساب و همه داده‌هایتان{' '}
          {data.supportContact
            ? <>به <bdi className="font-bold text-text-primary" dir="auto">{data.supportContact}</bdi> پیام بدهید.</>
            : 'با پشتیبانی تماس بگیرید.'}
          {' '}پس از تأیید اینکه درخواست از خود شماست، حساب و هرچه نوشته‌اید از سامانه پاک می‌شود و نسخه‌های پشتیبان و گزارش‌های فنی حداکثر تا {days(data.erasureCompletionDays)} بعد از بین می‌روند. این کار برگشت‌پذیر نیست.
        </p>
        {data.supportContact && <p className="mt-2 text-sm text-text-secondary">برای هر پرسش یا مشکل دیگر هم از همین راه در تماس باشید.</p>}
      </section>

      <p className="text-xs text-text-secondary">نسخه این توضیح: <bdi dir="ltr">{data.noticeVersion}</bdi></p>

      {withdrawing && (
        <ConfirmationDialog
          title="اجازه استفاده از هوش مصنوعی پس گرفته شود؟"
          description="از این پس نوشته‌ای برای سرویس هوش مصنوعی فرستاده نمی‌شود و برنامه‌ریزی با هوش مصنوعی انجام نمی‌شود. آنچه قبلاً فرستاده شده قابل بازگرداندن نیست. ساخت دستی در دسترس می‌ماند."
          pending={consent.isPending}
          onClose={closeWithdraw}
          actions={(
            <>
              <button className="secondary-button" type="button" disabled={consent.isPending} onClick={closeWithdraw}>انصراف</button>
              <button
                className="primary-button"
                type="button"
                disabled={consent.isPending}
                onClick={() => consent.mutate({ granted: false, noticeVersion: null }, {
                  onSuccess: () => {
                    setWithdrawing(false)
                    showToast('اجازه پس گرفته شد.')
                  },
                })}
              >
                {consent.isPending ? 'در حال ثبت…' : 'پس گرفتن اجازه'}
              </button>
            </>
          )}
        >
          <FormError error={consent.error} />
        </ConfirmationDialog>
      )}
    </div>,
  )
}
