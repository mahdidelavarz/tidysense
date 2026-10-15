import type { ReactNode } from 'react'
import { formatDayMonth, formatNumber, parseIsoDate } from '../../../shared/lib/date'
import { type AppIcon, CalendarDays, CircleAlert, Clock, Flag, Link2, Pencil, Repeat, Sparkles, Target, Users } from '../../../shared/ui/icons'
import { Stepper } from '../../../shared/ui/Stepper'
import type { PlanningDraftDto } from '../types/planning.types'

/** What each step says under the page title. */
const subtitles = [
  'آنچه در سرتان است را بنویسید؛ بقیه‌اش با ما',
  'چند پرسش کوتاه تا پیش‌نویس دقیق‌تر شود · همه اختیاری',
  'پیش‌نویس آماده است · تا تأیید نکنید، چیزی ساخته نمی‌شود',
  'پیش‌نمایش ساخت · فقط همین موارد ساخته می‌شوند',
  'برنامه ساخته شد',
]

/**
 * Planning on desktop (`CodeDesktopPlanningIntent`, `…Questions`, `CodeDesktopPlanning`):
 * the step in the middle, what helps or what was written on one side, and
 * «مسیر تا هدف» on the other. The step's content and actions are the
 * phone's own; the side columns only show what the page already holds.
 */
export function PlanningDesk({ steps, step, actions, context, road, children }: {
  steps: readonly string[]
  step: number
  /** The step's own way back and exit (the phone's flow bar). */
  actions?: ReactNode
  context: ReactNode
  road: ReactNode
  children: ReactNode
}) {
  return (
    <div className="page-desk">
      <header className="desk-header items-center">
        <div className="flex items-center gap-3">
          <span className="ai-tile size-12 rounded-2xl" aria-hidden="true"><Sparkles size={24} /></span>
          <div>
            <h1 className="page-title leading-tight">برنامه‌ریزی</h1>
            <p className="text-xs text-text-secondary">{subtitles[Math.min(step, subtitles.length - 1)]}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          <div className="min-w-80"><Stepper steps={steps} current={step} label="مراحل برنامه‌ریزی" /></div>
        </div>
      </header>
      <div className="desk-planning">
        <aside className="space-y-5" aria-label="کنار نوشته">{context}</aside>
        <div className="min-w-0">{children}</div>
        <aside className="desk-card desk-road-card" aria-label="مسیر تا هدف">{road}</aside>
      </div>
    </div>
  )
}

const hints: ReadonlyArray<{ icon: AppIcon; text: string }> = [
  { icon: Target, text: 'به کجا می‌خواهید برسید' },
  { icon: CalendarDays, text: 'تا کی' },
  { icon: Clock, text: 'هفته‌ای چقدر وقت دارید' },
  { icon: Users, text: 'چه کسی یا چه ابزاری هست' },
  { icon: CircleAlert, text: 'چه چیزی تا حالا مانع شده' },
]

/** The writing step's side: what tends to help a draft. Static guidance; nothing is read from the text. */
export function WritingHints() {
  return (
    <section className="desk-card" aria-labelledby="desk-hints">
      <h2 id="desk-hints" className="mb-3 text-sm font-extrabold text-text-secondary">چه چیزهایی کمک می‌کند</h2>
      <ul className="space-y-2.5">
        {hints.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-sm">
            <span className="lane-tile size-8 rounded-lg" aria-hidden="true"><Icon size={16} /></span>
            {text}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-6 text-text-secondary">لازم نیست مرتب باشد؛ مثل حرف زدن با یک دوست بنویسید.</p>
    </section>
  )
}

/** What the user wrote, with the phone's own way back to rewriting it. */
export function WrittenText({ text, onEdit }: { text: string; onEdit?: () => void }) {
  return (
    <section className="desk-card" aria-labelledby="desk-written">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="desk-written" className="flex items-center gap-1.5 text-sm font-extrabold text-text-secondary">
          <Pencil size={15} aria-hidden="true" />نوشته‌ی شما
        </h2>
        {onEdit && <button className="desk-link" type="button" onClick={onEdit}>ویرایش</button>}
      </div>
      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7">«{text}»</p>
    </section>
  )
}

export function WhyWeAsk() {
  return (
    <section className="desk-card" aria-labelledby="desk-why">
      <h2 id="desk-why" className="mb-2 text-sm font-extrabold text-text-secondary">چرا می‌پرسیم؟</h2>
      <p className="text-sm leading-7 text-text-secondary">
        نوشته‌تان برای ساختن یک پیش‌نویس دقیق چند چیز را نگفته بود. پاسخ ندهید هم پیش‌نویس ساخته می‌شود، فقط کلی‌تر.
      </p>
    </section>
  )
}

type RoadStop = { key: string; date: string; title: string; kind: string; entity: 'goal' | 'project' | 'task' | 'routine' }

const kindWords: Record<string, string> = {
  GOAL: 'هدف', PROJECT: 'پروژه', TASK: 'کار', ROUTINE: 'روتین',
}

/**
 * «مسیر تا هدف»: the draft's own included items in date order on a winding
 * road, from today to the Goal's target date. It shows only dates the draft
 * already proposes; nothing is estimated (028 §5). Before a draft exists the
 * road is empty.
 */
export function PlanningRoad({ draft, today }: { draft?: PlanningDraftDto; today: string }) {
  const included = (draft?.proposals ?? []).filter(item => item.state !== 'EXCLUDED' && !item.excludedByAncestor)
  const goal = included.find(item => item.proposal.entityType === 'GOAL')?.proposal
  const stops: RoadStop[] = []
  for (const { proposal } of included) {
    const type = proposal.entityType
    const date = type === 'TASK' ? proposal.plannedDate ?? proposal.deadline
      : type === 'PROJECT' ? proposal.targetDate
        : type === 'GOAL' ? proposal.targetDate : null
    if (!date || type === 'ROUTINE') continue
    stops.push({
      key: proposal.draftId, date, title: proposal.title, entity: type.toLowerCase() as RoadStop['entity'],
      kind: `${kindWords[type] ?? ''}${type === 'TASK' && !proposal.plannedDate ? ' با مهلت' : ''}، ${formatDayMonth(date)}`,
    })
  }
  stops.sort((a, b) => a.date.localeCompare(b.date) || (a.entity === 'goal' ? 1 : b.entity === 'goal' ? -1 : 0))
  const routines = included.filter(item => item.proposal.entityType === 'ROUTINE').map(item => item.proposal.title)
  const undated = included.filter(item => item.proposal.entityType !== 'ROUTINE').length - stops.length
  const days = goal?.targetDate
    ? Math.round((parseIsoDate(goal.targetDate).getTime() - parseIsoDate(today).getTime()) / 86_400_000)
    : null

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold">مسیر تا هدف</h2>
          <p className="text-xs text-text-secondary">{draft ? 'اگر همین پیش‌نویس را بسازید' : 'بعد از ساخت پیش‌نویس، جاده‌اش اینجا کشیده می‌شود'}</p>
        </div>
        {days !== null && days >= 0 && (
          <p className="text-end text-xs text-text-secondary"><b className="text-2xl text-text-primary">{formatNumber(days)}</b> روز تا {goal?.title}</p>
        )}
      </div>
      {routines.length > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-moon-tint px-3 py-2 text-xs font-bold text-moon-strong">
          <Repeat size={15} aria-hidden="true" />ریتم ثابت در کل مسیر: {routines.join('، ')}
        </p>
      )}
      {draft && stops.length > 0 ? (
        <ol className="desk-road" aria-label="موارد پیش‌نویس به ترتیب تاریخ">
          <li className="desk-road-stop" data-kind="today">
            <span className="desk-road-dot" aria-hidden="true" />
            <span className="desk-road-label"><span className="desk-road-kind">امروز، {formatDayMonth(today)}</span>شروع از همین‌جا</span>
          </li>
          {stops.map((stop, index) => (
            <li key={stop.key} className={`desk-road-stop entity-${stop.entity}`} data-kind={stop.entity} data-side={index % 2 ? 'end' : 'start'}>
              <span className="desk-road-dot" aria-hidden="true">{stop.entity === 'goal' && <Flag size={14} />}</span>
              <span className="desk-road-label"><span className="desk-road-kind">{stop.kind}</span>{stop.title}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="desk-road desk-road-empty" aria-hidden="true">
          <span className="desk-road-dot" />
          <span className="desk-road-dot" />
          <span className="desk-road-dot" />
          <span className="desk-road-dot desk-road-flag"><Flag size={14} /></span>
        </div>
      )}
      <p className="mt-auto flex items-start gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-xs leading-6 text-text-secondary">
        <Link2 size={14} className="mt-1 shrink-0" aria-hidden="true" />
        {draft
          ? undated > 0 ? `${formatNumber(undated)} مورد تاریخ ندارد و روی جاده نیامده است.` : 'فقط تاریخ‌هایی که خود پیش‌نویس پیشنهاد کرده روی جاده‌اند.'
          : 'هر چه دقیق‌تر بنویسید، پرسش‌های کمتری می‌پرسیم.'}
      </p>
    </>
  )
}
