import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  ArrowRight, CircleAlert, Clock, Copy, Database, History, ListChecks, Pencil, Activity, Send, ShieldCheck, Smartphone, Sparkles, Trash2,
} from '../../../shared/ui/icons'
import { formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { usePilotNotice } from '../hooks/pilot-hooks'

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
  const navigate = useNavigate()

  const back = user ? (
    <button
      className="icon-button border border-border-subtle bg-surface"
      type="button"
      aria-label="بازگشت"
      onClick={() => (window.history.length > 1 ? window.history.back() : void navigate({ to: '/today' }))}
    >
      <ArrowRight size={20} aria-hidden="true" />
    </button>
  ) : (
    <Link className="ghost-button -ms-2 px-2" to="/login">
      <ArrowRight size={20} aria-hidden="true" />
      بازگشت به ورود
    </Link>
  )

  const frame = (content: ReactNode) => (
    <div className={user ? 'page pb-10' : 'mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-10'}>
      <div className="mb-4 flex min-h-11 items-center">{back}</div>
      <header className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-positive"><ShieldCheck size={15} aria-hidden="true" />حریم خصوصی و داده‌ها</p>
        <h1 className="page-title mt-1">داده‌های شما، بی‌پرده</h1>
        <p className="mt-1 text-sm leading-7 text-text-secondary">چه چیزی نگه می‌داریم، تا کی، کجا می‌رود و چطور همه‌اش را پاک کنید.</p>
      </header>
      {content}
    </div>
  )

  if (notice.isPending) return frame(<LoadingState text="در حال دریافت…" />)
  if (notice.isError) return frame(<ErrorState onRetry={() => notice.refetch()} />)
  const data = notice.data
  const days = (value: number | string) => <><b className="block text-lg leading-6">{formatNumber(Number(value))}</b>روز</>

  return frame(
    <div className="space-y-5">
      <ul className="grid grid-cols-3 gap-2.5">
        <PromiseTile icon={Smartphone} tone="positive" text="شماره‌ها به هوش مصنوعی نمی‌رود" />
        <PromiseTile icon={Sparkles} tone="ai" text="هوش مصنوعی فقط پیشنهاد می‌دهد" />
        <PromiseTile icon={Trash2} tone="attention" text="حذف کامل با یک درخواست" />
      </ul>

      <section className="card rounded-[1.75rem]" aria-labelledby="privacy-ai">
        <h2 className="flex items-center gap-3 text-lg font-extrabold" id="privacy-ai">
          <span className="ai-tile" aria-hidden="true"><Sparkles size={20} /></span>
          برنامه‌ریزی با هوش مصنوعی
        </h2>
        {data.aiReceivesPlanningText ? (
          <>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              وقتی با هوش مصنوعی برنامه می‌ریزید، متن برنامه‌ریزی فقط برای ساختن پیش‌نویس به یک مدل هوش مصنوعی فرستاده می‌شود؛ <b className="text-text-primary">ما متنش را ذخیره نمی‌کنیم.</b>
            </p>
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-caution-tint p-3 text-[0.8125rem] font-bold leading-6 text-caution">
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              سرورهای آن بیرون از ایران است؛ یعنی این متن از کشور خارج می‌شود.
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl">
              <div className="p-3.5" style={{ background: 'var(--ai-tint)' }}>
                <h3 className="text-[0.8125rem] font-extrabold" style={{ color: 'var(--color-ai-ink)' }}>فرستاده می‌شود</h3>
                <ul className="mt-1.5 space-y-1 text-[0.8125rem] font-semibold">
                  <li className="flex items-center gap-2"><Send size={15} className="shrink-0" aria-hidden="true" />نوشته‌ی برنامه‌ریزی و پاسخ‌هایتان به پرسش‌ها</li>
                  <li className="flex items-center gap-2"><Send size={15} className="shrink-0" aria-hidden="true" />خلاصه‌ای از هدف‌ها و کارهای همین حساب</li>
                </ul>
              </div>
              <div className="bg-positive-tint p-3.5">
                <h3 className="text-[0.8125rem] font-extrabold text-positive">هیچ‌وقت فرستاده یا نگه‌داشته نمی‌شود</h3>
                <ul className="mt-1.5 space-y-1 text-[0.8125rem] font-semibold">
                  <li className="flex items-center gap-2"><ShieldCheck size={15} className="shrink-0 text-positive" aria-hidden="true" />شماره تلفن</li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck size={15} className="mt-1 shrink-0 text-positive" aria-hidden="true" />
                    <span>متن بازبینی‌ها<span className="block text-xs font-normal text-text-secondary">توضیح بازبینی فقط با شمارش‌ها و کدها ساخته می‌شود.</span></span>
                  </li>
                  <li className="flex items-center gap-2"><ShieldCheck size={15} className="shrink-0 text-positive" aria-hidden="true" />نسخه‌ای از متن فرستاده‌شده یا پاسخ خام مدل</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 border-t border-border-subtle pt-3 text-[0.8125rem] leading-6 text-text-secondary">
              <Pencil size={16} className="mt-1 shrink-0" aria-hidden="true" />
              نمی‌خواهید متنی فرستاده شود؟ کار و روتین را دستی بسازید؛ آن مسیر هیچ چیزی بیرون نمی‌فرستد.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-7 text-text-secondary">در این نسخه هیچ متنی برای مدل هوش مصنوعی بیرونی فرستاده نمی‌شود.</p>
        )}
      </section>

      <section className="card rounded-[1.75rem]" aria-labelledby="privacy-kept">
        <h2 className="flex items-center gap-3 text-lg font-extrabold" id="privacy-kept">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.8125rem] bg-accent-tint text-accent-strong" aria-hidden="true"><Database size={20} /></span>
          چه چیزی، تا کی
        </h2>
        <ul className="mt-2 divide-y divide-border-subtle">
          <KeptRow icon={ListChecks} title="هدف‌ها، پروژه‌ها، کارها، روتین‌ها و یادداشت‌ها" note="تا وقتی حساب دارید نگه داشته می‌شوند" keep={<><b className="block text-lg leading-6">∞</b>تا حذف حساب</>} />
          <KeptRow icon={Pencil} title="پیش‌نویس برنامه‌ریزی و نوشته‌اش" note="پس از پایان پیش‌نویس پاک می‌شود" keep={days(data.draftDays)} />
          <KeptRow icon={History} title="تاریخچه‌ی بازبینی و پاسخ‌های اختیاری" note="پس از بسته‌شدن بازبینی پاک می‌شود" keep={days(data.sessionHistoryDays)} />
          <KeptRow icon={Activity} title="اطلاعات فنی عملکرد" note="بدون هیچ متنی از شما" keep={days(data.diagnosticsDays)} />
          <KeptRow icon={Sparkles} title="نظر درباره‌ی پاسخ‌های هوش مصنوعی" note="امتیاز و توضیحی که خودتان می‌نویسید؛ بدون نام و شماره، و با حذف حساب پاک می‌شود" keep={days(data.sessionHistoryDays)} />
          <KeptRow icon={Clock} title="سابقه‌ی تصمیم‌ها" note="چه کاری، چه زمانی؛ بدون عنوان و متن" keep={<><b className="block text-sm leading-6">بی‌نام</b>پس از حذف حساب</>} />
        </ul>
      </section>

      <section className="erase-card" aria-labelledby="privacy-erasure">
        <h2 className="flex items-center gap-3 text-lg font-extrabold" id="privacy-erasure">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.8125rem] bg-attention-tint text-attention" aria-hidden="true"><Trash2 size={20} /></span>
          حذف حساب و همه‌ی داده‌ها
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {data.supportContact ? 'به پشتیبانی پیام بدهید.' : 'با پشتیبانی تماس بگیرید.'} وقتی مطمئن شدیم درخواست از خود شماست، حساب و هرچه نوشته‌اید از سامانه پاک می‌شود.
        </p>
        {data.supportContact && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface p-2 ps-3" style={{ boxShadow: 'inset 0 0 0 1px var(--color-border-subtle)' }}>
            <bdi className="min-w-0 flex-1 truncate font-extrabold" dir="ltr">{data.supportContact}</bdi>
            <button
              className="secondary-button min-h-10 shrink-0 px-3"
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(data.supportContact ?? '').then(() => showToast('نشانی کپی شد.'), () => undefined)
              }}
            >
              <Copy size={16} aria-hidden="true" />
              کپی
            </button>
          </div>
        )}
        <p className="mt-3 flex items-start gap-2 text-[0.8125rem] leading-6 text-text-secondary">
          <Clock size={16} className="mt-1 shrink-0" aria-hidden="true" />
          نسخه‌های پشتیبان و گزارش‌های فنی حداکثر تا {formatNumber(Number(data.erasureCompletionDays))} روز بعد از بین می‌روند.
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-[0.8125rem] font-extrabold text-attention">
          <CircleAlert size={16} className="shrink-0" aria-hidden="true" />
          این کار برگشت‌پذیر نیست.
        </p>
      </section>

      <p className="flex justify-between gap-3 px-1 text-xs text-text-secondary">
        {data.supportContact ? <span>پرسشی دارید؟ از همان نشانی.</span> : <span />}
        <span>نسخه‌ی متن <bdi dir="ltr">{data.noticeVersion}</bdi></span>
      </p>
    </div>,
  )
}

function PromiseTile({ icon: Icon, tone, text }: { icon: typeof Sparkles; tone: 'positive' | 'ai' | 'attention'; text: string }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-[1.375rem] bg-surface p-3 text-xs font-extrabold leading-5 shadow-sm">
      <span className="promise-icon" data-tone={tone} aria-hidden="true"><Icon size={18} /></span>
      {text}
    </li>
  )
}

function KeptRow({ icon: Icon, title, note, keep }: { icon: typeof Sparkles; title: string; note: string; keep: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-text-secondary" aria-hidden="true"><Icon size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold leading-6">{title}</span>
        <span className="block text-xs leading-5 text-text-secondary">{note}</span>
      </span>
      <span className="flex min-h-14 w-18 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-sunken text-center text-[0.6875rem] text-text-secondary">
        <span className="sr-only">نگه‌داری: </span>
        {keep}
      </span>
    </li>
  )
}
