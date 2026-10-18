import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import photo from '../../../shared/assets/night.jpg'
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, FolderKanban, History, Hourglass, Pencil, Repeat, Sparkles, Sun, Target,
} from '../../../shared/ui/icons'
import { markGuidesSeen } from '../types/welcome.storage'

/**
 * Each guide states one promise and shows it on a still example of the real
 * screen (Discussion 028 §4). A promise that does not hold is reworded, never
 * stretched: «با یک لمس» returns with one-tap Reconcile (STEP-19).
 */
const guides: ReadonlyArray<{ badge: string; badgeIcon: typeof Sun; title: string; body: string; scene: () => ReactNode }> = [
  {
    badge: 'زیر ۲ دقیقه',
    badgeIcon: Hourglass,
    title: 'از یک جمله، تا یک برنامه‌ی کامل',
    body: 'بگویید به کجا می‌خواهید برسید. هوش مصنوعی هدف، پروژه‌ها، کارها و روتین‌ها را می‌چیند؛ شما فقط مرور و تأیید می‌کنید.',
    scene: PlanScene,
  },
  {
    badge: 'زیر ۵ ثانیه',
    badgeIcon: Sparkles,
    title: 'هر فکری، همان لحظه یک کار',
    body: 'یک خط بنویسید و ثبت کنید. تاریخ و جزئیات اختیاری‌اند؛ هر وقت خواستید اضافه‌شان کنید.',
    scene: CaptureScene,
  },
  {
    badge: 'همه یک‌جا',
    badgeIcon: History,
    title: 'کار مانده، دوباره در برنامه',
    body: 'کارهایی که از روزهای قبل مانده‌اند یک‌جا جمع می‌شوند تا برای هرکدام تصمیم بگیرید: امروز، روزی دیگر یا کنار گذاشتن.',
    scene: ReconcileScene,
  },
]

/**
 * The first open on a phone, before sign-in: a welcome image, then three
 * guides with skip (on the first two) and back (after the first). Finishing
 * or skipping marks the guides seen on this device and goes to sign-in.
 */
export function WelcomeFlow() {
  const navigate = useNavigate()
  // 0 is the welcome image; 1–3 are the guides.
  const [step, setStep] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)

  // Each page is a new screen for a screen reader: move focus to its title.
  useEffect(() => {
    if (step > 0) heading.current?.focus()
  }, [step])

  function finish() {
    markGuidesSeen()
    void navigate({ to: '/login', replace: true })
  }

  if (step === 0) {
    return (
      <main className="welcome">
        <img className="absolute inset-0 size-full object-cover" style={{ objectPosition: '50% 40%' }} src={photo} alt="" />
        <div className="welcome-veil" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-2.5 pt-14 text-white">
          <span className="welcome-mark" aria-hidden="true">ت</span>
          <h1 className="text-xl font-extrabold" style={{ textShadow: '0 2px 14px rgb(0 0 0 / 0.35)' }}>TidySense</h1>
        </div>
        <button className="welcome-start" type="button" onClick={() => setStep(1)}>
          شروع
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      </main>
    )
  }

  const guide = guides[step - 1]
  const last = step === guides.length
  const Badge = guide.badgeIcon
  return (
    <main className="guide">
      <div className="flex h-8 items-center gap-3.5">
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={guides.length} aria-valuenow={step} aria-label={`راهنمای ${new Intl.NumberFormat('fa-IR').format(step)} از ${new Intl.NumberFormat('fa-IR').format(guides.length)}`}>
          {guides.map((item, index) => <span key={item.title} className="guide-progress" data-done={index < step} />)}
        </div>
        {!last && <button className="text-[0.8125rem] font-bold text-text-secondary" type="button" onClick={finish}>رد شدن</button>}
      </div>
      <div className="guide-scene" aria-hidden="true">
        <div><span className="guide-ring" /><span className="guide-ring" /><span className="guide-ring" /><span className="guide-ring" /></div>
        <div className="relative flex h-full flex-col justify-center px-6">{guide.scene()}</div>
      </div>
      <div className="mt-6 flex flex-col items-start gap-2.5 px-1.5">
        <span className="guide-badge"><Badge size={15} aria-hidden="true" />{guide.badge}</span>
        <h1 className="guide-title" ref={heading} tabIndex={-1}>{guide.title}</h1>
        <p className="text-[0.90625rem] leading-[1.95] text-text-secondary">{guide.body}</p>
      </div>
      <div className="mt-auto flex gap-2.5 pt-6">
        <button className="primary-button min-h-14 flex-1 rounded-[1.125rem] text-base" type="button" onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? 'شروع کنیم' : 'بعدی'}
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        {step > 1 && (
          <button className="secondary-button min-h-14 w-14 rounded-[1.125rem] px-0" type="button" aria-label="قبلی" onClick={() => setStep(step - 1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </main>
  )
}

/** Guide 1: a sentence, the AI arranging it, the draft to confirm. */
function PlanScene() {
  const rows = [
    { icon: FolderKanban, entity: 'project', title: 'آمادگی آزمون', meta: '۵ کار' },
    { icon: FolderKanban, entity: 'project', title: 'مکالمه با همکار', meta: '۳ کار' },
    { icon: Repeat, entity: 'routine', title: 'ده دقیقه لغت', meta: 'هر شب' },
  ] as const
  return (
    <>
      <div className="guide-card">
        <p className="flex items-center gap-1.5 text-[0.71875rem] font-extrabold text-text-secondary"><Pencil size={13} />شما می‌نویسید</p>
        <p className="mt-1.5 font-display text-[0.9375rem] leading-[1.85]">«می‌خواهم تا آخر آذر آلمانی‌ام B1 شود؛ هفته‌ای سه عصر وقت دارم.»</p>
      </div>
      <div className="flex flex-col items-center">
        <span className="h-3 w-0.5 bg-border" />
        <span className="guide-ai"><Sparkles size={16} />هوش مصنوعی می‌چیند</span>
        <span className="h-3 w-0.5 bg-border" />
      </div>
      <div className="guide-card">
        <p className="entity-goal flex items-center gap-2.5">
          <span className="entity-icon size-8.5 rounded-xl"><Target size={18} /></span>
          <b className="font-display text-[0.96875rem]">آلمانی را تا B1 برسانم</b>
        </p>
        <ul className="mt-2 divide-y divide-border-subtle">
          {rows.map(row => (
            <li key={row.title} className={`entity-${row.entity} flex min-h-10 items-center gap-2.5 text-[0.84375rem] font-bold`}>
              <span className="entity-icon size-7 rounded-[0.5625rem]"><row.icon size={15} /></span>
              {row.title}
              <span className="ms-auto text-[0.71875rem] font-semibold text-text-secondary">{row.meta}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="rounded-[0.5625rem] bg-surface-sunken px-2.5 py-0.5 text-[0.71875rem] font-extrabold text-text-secondary">پیش‌نویس</span>
          <span className="flex h-8.5 items-center gap-1.5 rounded-xl bg-accent px-4 text-[0.78125rem] font-extrabold text-on-accent"><Check size={15} />تأیید</span>
        </div>
      </div>
    </>
  )
}

/** Guide 2: one line typed, today chosen, the Task already in Today. */
function CaptureScene() {
  return (
    <>
      <div className="guide-card">
        <div className="flex items-center gap-2 rounded-2xl bg-surface-sunken p-1.5 ps-3">
          <span className="flex-1 font-bold">زنگ به دندان‌پزشک</span>
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-on-accent"><ChevronLeft size={18} className="rotate-90" /></span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[0.71875rem] font-bold">
          <span className="entity-task flex items-center gap-1 rounded-lg px-2 py-0.5 entity-chip"><Sun size={13} />امروز</span>
          <span className="rounded-lg border border-border px-2 py-0.5 text-text-secondary">فردا</span>
          <span className="rounded-lg border border-border px-2 py-0.5 text-text-secondary">بدون تاریخ</span>
          <span className="ms-auto text-text-secondary">اختیاری</span>
        </div>
      </div>
      <div className="flex justify-center py-2.5">
        <span className="flex size-7 items-center justify-center rounded-full border border-border bg-surface text-text-secondary"><ChevronLeft size={14} className="-rotate-90" /></span>
      </div>
      <div className="guide-card">
        <p className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-extrabold"><span className="flex size-7 items-center justify-center rounded-lg bg-sun-tint text-sun-strong"><Sun size={15} /></span>امروز</span>
          <span className="text-[0.71875rem] text-text-secondary">یکشنبه ۲۰ مهر</span>
        </p>
        <ul className="mt-2 space-y-1 text-[0.84375rem] font-bold">
          <li className="flex items-center gap-2.5 rounded-xl px-2 py-2" style={{ background: 'color-mix(in srgb, var(--color-entity-task) 12%, var(--color-surface))' }}>
            <span className="size-4.5 rounded-full border-2 border-entity-task" />زنگ به دندان‌پزشک
            <span className="ms-auto rounded-md bg-surface px-2 text-[0.6875rem] text-entity-task">تازه</span>
          </li>
          <li className="flex items-center gap-2.5 px-2 py-2"><span className="size-4.5 rounded-full border-2 border-entity-task" />ارسال فاکتور مهر</li>
          <li className="flex items-center gap-2.5 px-2 py-2"><span className="size-4.5 rounded-full border-2 border-entity-routine" />پیاده‌روی عصر</li>
        </ul>
      </div>
    </>
  )
}

/** Guide 3: what was left from earlier days, gathered in one place, with today or another day for each. */
function ReconcileScene() {
  return (
    <div className="guide-card">
        <p className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-extrabold"><span className="flex size-7 items-center justify-center rounded-lg bg-moon-tint text-moon-strong"><History size={15} /></span>از روزهای قبل</span>
          <span className="rounded-md bg-surface-sunken px-2 text-[0.6875rem] font-bold text-text-secondary">۳ کار</span>
        </p>
        <ul className="mt-2 divide-y divide-border-subtle text-[0.84375rem] font-bold">
          <li className="flex items-center gap-2.5 py-2.5">
            <span className="size-4.5 rounded-full border-2 border-entity-task" />ارسال گزارش هفتگی
            <span className="ms-auto flex items-center gap-1 rounded-md bg-positive-tint px-2 text-[0.6875rem] text-positive"><Check size={12} />امروز</span>
          </li>
          <li className="py-2.5">
            <span className="flex items-center gap-2.5"><span className="size-4.5 rounded-full border-2 border-entity-task" />خرید هدیه</span>
            <span className="mt-2 grid grid-cols-2 gap-2 text-[0.78125rem]">
              <span className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent text-on-accent"><Sun size={14} />امروز</span>
              <span className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border"><CalendarDays size={14} />روز دیگر</span>
            </span>
          </li>
          <li className="flex items-center gap-2.5 py-2.5">
            <span className="size-4.5 rounded-full border-2 border-entity-task" />تمرین لغات
            <span className="ms-auto flex items-center gap-1 rounded-md bg-surface-sunken px-2 text-[0.6875rem] text-text-secondary"><CalendarDays size={12} />پنجشنبه</span>
          </li>
        </ul>
      </div>
  )
}
