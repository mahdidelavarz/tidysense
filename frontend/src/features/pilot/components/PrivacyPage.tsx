import { Database, Sparkles, Trash2 } from '../../../shared/ui/icons'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { usePilotNotice } from '../hooks/pilot-hooks'

const title = 'حریم خصوصی و داده‌ها'

/**
 * What is kept, for how long, where planning text goes and how to have an
 * account erased. Every number comes from the server's running configuration,
 * so this text cannot say something the system does not do. The AI model or
 * its provider is never named (Discussion 027 §3).
 * It is readable without a session.
 */
export function PrivacyPage() {
  const user = useCurrentUser().data
  const notice = usePilotNotice()

  const frame = (content: ReactNode) => user
    ? <div className="page"><PageHeader title={title} />{content}</div>
    : (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-12">
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

  return frame(
    <div className="space-y-4">
      <section className="card rounded-3xl" aria-labelledby="privacy-kept">
        <h2 className="flex items-center gap-3 text-lg font-bold" id="privacy-kept">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-strong" aria-hidden="true">
            <Database size={20} />
          </span>
          چه چیزی و تا کی نگه داشته می‌شود
        </h2>
        <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-7 text-text-secondary marker:text-accent">
          <li>هدف‌ها، پروژه‌ها، کارها، روتین‌ها و یادداشت‌های سریع شما تا وقتی حساب دارید نگه داشته می‌شوند.</li>
          <li>پیش‌نویس‌های برنامه‌ریزی و نوشته‌ای که برایشان داده‌اید {days(data.draftDays)} پس از پایان پیش‌نویس پاک می‌شوند.</li>
          <li>تاریخچه هر بازبینی {days(data.sessionHistoryDays)} پس از بسته‌شدن آن پاک می‌شود؛ پاسخ‌های شما به پرسش‌های اختیاری هم همین مدت می‌مانند.</li>
          <li>اطلاعات فنی عملکرد (بدون متن شما) {days(data.diagnosticsDays)} نگه داشته می‌شود.</li>
          <li>سابقه تصمیم‌های شما (چه کاری، چه زمانی؛ بدون عنوان و متن) می‌ماند و پس از حذف حساب به شما وصل نیست.</li>
        </ul>
      </section>

      <section className="card rounded-3xl" aria-labelledby="privacy-ai">
        <h2 className="flex items-center gap-3 text-lg font-bold" id="privacy-ai">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-strong" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          هوش مصنوعی
        </h2>
        {data.aiReceivesPlanningText ? (
          <div className="mt-3 space-y-3 text-sm leading-7 text-text-secondary">
            <p>
              وقتی با هوش مصنوعی برنامه می‌ریزید، نوشته برنامه‌ریزی، پاسخ‌هایتان به پرسش‌ها و خلاصه‌ای از هدف‌ها و کارهای همین حساب فقط برای ساختن پیش‌نویس به یک مدل هوش مصنوعی فرستاده می‌شود. سرورهای آن بیرون از ایران است؛ یعنی این متن از کشور خارج می‌شود.
            </p>
            <p>
              تایدی‌سنس نسخه‌ای از متن فرستاده‌شده یا پاسخ خام مدل را نگه نمی‌دارد. شماره تلفن شما هرگز فرستاده نمی‌شود و توضیح بازبینی فقط با شمارش‌ها و کدها ساخته می‌شود، بدون عنوان و متن کارهای شما.
            </p>
            <p>نمی‌خواهید متنی فرستاده شود؟ کار و روتین را دستی بسازید؛ آن مسیر هیچ چیزی بیرون نمی‌فرستد.</p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-7 text-text-secondary">در این نسخه هیچ متنی برای مدل هوش مصنوعی بیرونی فرستاده نمی‌شود.</p>
        )}
      </section>

      <section className="card rounded-3xl" aria-labelledby="privacy-erasure">
        <h2 className="flex items-center gap-3 text-lg font-bold" id="privacy-erasure">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-strong" aria-hidden="true">
            <Trash2 size={20} />
          </span>
          حذف حساب و داده‌ها
        </h2>
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

    </div>,
  )
}
