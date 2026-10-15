import type { UseQueryResult } from '@tanstack/react-query'
import type { CSSProperties, ReactNode } from 'react'
import { formatDayMonth } from '../../../shared/lib/date'
import { EntityMark, type EntityKind } from '../../../shared/ui/EntityUi'
import {
  type AppIcon,
  CircleCheck,
  Lock,
  MessageHeart,
  Sparkles,
  UserCheck,
  Users,
} from '../../../shared/ui/icons'
import type { LowRatingReasonDto, MetricResultDto, OperationsInsightsDto, OperationsMetricsDto } from '../types/operations.types'
import { Card, Code, count, Loaded, Meter, OfCount, type Ratio, rowOf, rowsOf, SmallSample, SmallSampleBelow, Tile } from './OperationsUi'

const decimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })
const mean = (value: Ratio) => (value.denominator > 0 ? decimal.format(value.numerator / value.denominator) : '—')
const sum = (...values: Ratio[]): Ratio => values.reduce(
  (total, x) => ({ numerator: total.numerator + x.numerator, denominator: Math.max(total.denominator, x.denominator) }),
  { numerator: 0, denominator: 0 })

const surfaceName: Record<string, string> = { PLANNING_DRAFT: 'پیش‌نویس برنامه', RECONCILE_EXPLANATION: 'خلاصه‌ی بازبینی' }
const kindName: Record<string, string> = {
  TIMING: 'زمان‌بندی', RECURRENCE: 'تکرار', CONSTRAINT: 'محدودیت', CONTENT: 'محتوا', OWNERSHIP: 'مالکیت',
  ENTITY_TYPE: 'نوع مورد', CONTRADICTION: 'ناسازگاری', UNKNOWN: 'نامشخص',
}
const ratingName: Record<number, string> = { 5: 'عالی', 4: 'خوب', 3: 'معمولی', 2: 'ضعیف', 1: 'بد' }

/**
 * «سنجش محصول» (Discussion 027 §5, §10): whether the product is useful, from what it records. The
 * main number counts each account once; the faint one counts every attempt or answer. Every rate
 * is «x از y», a denominator under 10 is marked as a small sample, nothing is coloured as good or
 * bad, internal accounts are left out and counted, and no user text appears except reasons.
 */
export function ProductInsightsView({ insights, metrics }: {
  insights: UseQueryResult<OperationsInsightsDto>
  metrics: UseQueryResult<OperationsMetricsDto>
}) {
  return (
    <Loaded query={insights} pendingText="در حال دریافت سنجش محصول…">
      {data => <Insights data={data} h1={metrics.data?.primary} />}
    </Loaded>
  )
}

function Insights({ data, h1 }: { data: OperationsInsightsDto; h1: readonly MetricResultDto[] | undefined }) {
  const f = data.figures
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-xs leading-6 text-text-secondary">
        <p>
          {count(data.internalAccountCount)} حساب داخلی کنار گذاشته شده · تعریف‌ها: نسخه‌ی <Code>{data.catalogVersion}</Code>
        </p>
        <p>
          عدد اصلی: <b className="text-text-primary">هر حساب یک‌بار</b> · عدد کم‌رنگ: همه‌ی تلاش‌ها یا پاسخ‌ها ·{' '}
          <SmallSample /> یعنی مخرج کمتر از ۱۰
        </p>
      </div>

      <People f={f} />
      <Funnel f={f} h1={h1} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Removed f={f} />
        <Questions f={f} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Execution f={f} />
        <Reconcile f={f} />
      </div>
      <Retention f={f} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Satisfaction f={f} />
        <Reasons f={f} reasons={data.reasons} />
      </div>
    </div>
  )
}

type Figures = readonly MetricResultDto[]

function People({ f }: { f: Figures }) {
  const accounts = rowOf(f, 'P.ACCOUNTS')
  const execution = rowOf(f, 'P.TASKS_DONE_7D', 'AI')
  const executionAccounts = rowOf(f, 'P.TASKS_DONE_7D_ACCOUNTS')
  return (
    <section aria-label="خلاصه" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Tile icon={Users} label="کاربران" hint={`${count(accounts.numerator)} ثبت‌نام در این بازه`}>
        {count(accounts.denominator)}
      </Tile>
      <RatioTile icon={UserCheck} label="فعال‌سازی" value={rowOf(f, 'P.ACTIVATION')} hint="به اولین برنامه‌ی اعمال‌شده رسیدند" />
      <RatioTile icon={CircleCheck} label="فعال در ۷ روز آخر" value={rowOf(f, 'P.WEEKLY_ACTIVE')} hint="کاری انجام دادند، بازبینی کردند یا برنامه ریختند" />
      <RatioTile icon={MessageHeart} label="رضایت از پاسخ‌ها" value={rowOf(f, 'P.SATISFIED_ACCOUNTS')} hint="حساب با میانگین ۴ یا بیشتر" />
      <RatioTile icon={Sparkles} label="اجرای برنامه‌ها" value={execution}
        hint={<>
          کار ساخته‌ی هوش مصنوعی که ظرف ۷ روز انجام شد
          <span className="mt-1 block">هر حساب یک‌بار: <OfCount faint value={executionAccounts} unit="حساب" /> بیشتر از کارهای دستی</span>
        </>} />
    </section>
  )
}

function RatioTile({ icon, label, value, hint }: { icon: AppIcon; label: string; value: Ratio; hint: ReactNode }) {
  return (
    <Tile icon={icon} label={label} hint={<>{hint}<Meter value={value} /></>}>
      <OfCount value={value} />
    </Tile>
  )
}

const stages: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'STARTED', label: 'شروع نوشتن' },
  { id: 'DRAFT', label: 'پیش‌نویس آماده' },
  { id: 'DECIDED', label: 'تصمیم گرفته شد' },
  { id: 'ACCEPTED', label: 'تأیید شد' },
  { id: 'APPLIED', label: 'اعمال شد' },
  { id: 'ALIVE_7D', label: 'زنده تا ۷ روز' },
]

function Funnel({ f, h1 }: { f: Figures; h1: readonly MetricResultDto[] | undefined }) {
  const unchanged = rowOf(h1, 'H1.ACCEPTANCE', 'UNCHANGED')
  const edited = rowOf(h1, 'H1.ACCEPTANCE', 'EDITED')
  const ended = sum(rowOf(h1, 'H1.DRAFT_DISPOSITION', 'CANCELLED_BY_USER'), rowOf(h1, 'H1.DRAFT_DISPOSITION', 'EXPIRED_WITHOUT_DECISION'))
  const time = rowOf(h1, 'H1.TIME_TO_DRAFT_SECONDS')
  const usefulness = rowsOf(h1, 'H1.USEFULNESS_RESPONSE')
  const useful: Ratio = {
    numerator: usefulness.filter(x => x.segment === '4' || x.segment === '5').reduce((total, x) => total + x.numerator, 0),
    denominator: usefulness[0]?.denominator ?? 0,
  }
  return (
    <Card title="قیف برنامه‌ریزی" note="حساب‌هایی که به هر مرحله رسیدند؛ زیرش تلاش‌ها">
      <ol className="space-y-3" aria-label="مرحله‌های قیف">
        {stages.map((stage, index) => {
          const accounts = rowOf(f, 'P.FUNNEL_ACCOUNTS', stage.id)
          const flows = rowOf(f, 'P.FUNNEL_FLOWS', stage.id)
          const previous = index > 0 ? rowOf(f, 'P.FUNNEL_ACCOUNTS', stages[index - 1].id) : undefined
          return (
            <li key={stage.id} className="ops-funnel-row">
              <span className="font-bold">{stage.label}</span>
              <Meter value={accounts} tone="tone-strong" />
              <span className="flex flex-col">
                <OfCount value={accounts} unit="حساب" />
                <OfCount faint value={flows} unit="تلاش" />
              </span>
              <span className="ops-faint text-xs">
                {previous && previous.numerator > accounts.numerator ? `${count(previous.numerator - accounts.numerator)} حساب ریزش` : ''}
              </span>
            </li>
          )
        })}
      </ol>
      <ul className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-4 text-xs" aria-label="جزئیات پیش‌نویس‌ها">
        {h1 === undefined ? <li className="ops-chip">جزئیات پیش‌نویس‌ها در دسترس نیست</li> : (
          <>
            <li className="ops-chip">تأیید بدون تغییر: <OfCount faint value={unchanged} unit="پیش‌نویس" /></li>
            <li className="ops-chip">تأیید با ویرایش: <OfCount faint value={edited} unit="پیش‌نویس" /></li>
            <li className="ops-chip">رد یا رها شد: <OfCount faint value={ended} unit="پیش‌نویس" /></li>
            <li className="ops-chip">میانه‌ی زمان تا پیش‌نویس: <b className="text-text-primary">{count(time.numerator)} ثانیه</b> روی {count(time.denominator)} جریان</li>
            {/* 027 §10: usefulness is read beside behaviour, never alone. */}
            <li className="ops-chip">سودمندی ۴ یا ۵: <OfCount faint value={useful} unit="برنامه‌ی اعمال‌شده" /></li>
          </>
        )}
      </ul>
    </Card>
  )
}

const removedTypes: ReadonlyArray<{ id: string; entity: EntityKind; label: string }> = [
  { id: 'TASK', entity: 'task', label: 'کار' },
  { id: 'ROUTINE', entity: 'routine', label: 'روتین' },
  { id: 'PROJECT', entity: 'project', label: 'پروژه' },
  { id: 'GOAL', entity: 'goal', label: 'هدف' },
]

function Removed({ f }: { f: Figures }) {
  return (
    <Card title="قبل از تأیید چه چیزهایی برداشته می‌شود؟" note="تیک‌هایی که کاربر برداشت">
      <ul className="space-y-4">
        {removedTypes.map(type => {
          const items = rowOf(f, 'P.REMOVED_BEFORE_ACCEPTING', type.id)
          const accounts = rowOf(f, 'P.REMOVED_BEFORE_ACCEPTING_ACCOUNTS', type.id)
          return (
            <li key={type.id} className={`entity-${type.entity}`}>
              <div className="flex items-center gap-2.5">
                <EntityMark entity={type.entity} />
                <span className="flex-1 font-bold">{type.label}</span>
                <span className="flex flex-col items-end">
                  <OfCount value={accounts} unit="حساب" />
                  <OfCount faint value={items} unit="مورد" />
                </span>
              </div>
              <Meter value={accounts} tone="tone-entity" />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Questions({ f }: { f: Figures }) {
  const parts = rowsOf(f, 'P.CLARIFICATION')
  const kinds = [...new Set(parts.map(x => x.segment.split(':')[0]))]
  const part = (kind: string, name: string) => rowOf(f, 'P.CLARIFICATION', `${kind}:${name}`)
  const withAnswers = rowOf(f, 'P.ACCEPTANCE_BY_ANSWERS_ACCOUNTS', 'WITH_ANSWERS')
  const withoutAnswers = rowOf(f, 'P.ACCEPTANCE_BY_ANSWERS_ACCOUNTS', 'WITHOUT_ANSWERS')
  return (
    <Card title="پرسش‌ها" note="بر اساس نوع پرسش؛ بدون متن پرسش‌ها و پاسخ‌ها">
      {kinds.length === 0 ? <p className="text-sm text-text-secondary">در این بازه پرسشی پرسیده نشده است.</p> : (
        <ul className="divide-y divide-border-subtle">
          {kinds.map(kind => (
            <li key={kind} className="py-3 first:pt-0">
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-bold">{kindName[kind] ?? kind} <Code>{kind}</Code></span>
                <span className="text-xs text-text-secondary">
                  جواب‌داده: <OfCount value={rowOf(f, 'P.CLARIFICATION_ACCOUNTS', kind)} unit="حساب" />
                </span>
              </p>
              <dl className="ops-stats mt-2">
                <Stat label="پرسیده شد">{count(part(kind, 'ASKED').numerator)}</Stat>
                <Stat label="جواب داده شد"><OfCount faint value={part(kind, 'ANSWERED')} /></Stat>
                <Stat label="«خودت بنویس»"><OfCount faint value={part(kind, 'OTHER')} /></Stat>
                <Stat label="رد شد"><OfCount faint value={part(kind, 'SKIPPED')} /></Stat>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <p className="notice mt-4 text-xs">
        پیش‌نویس با جواب تأیید شد: <OfCount value={withAnswers} unit="حساب" /> (<OfCount faint value={rowOf(f, 'P.ACCEPTANCE_BY_ANSWERS', 'WITH_ANSWERS')} unit="پیش‌نویس" />)
        {' · '}بدون جواب: <OfCount value={withoutAnswers} unit="حساب" /> (<OfCount faint value={rowOf(f, 'P.ACCEPTANCE_BY_ANSWERS', 'WITHOUT_ANSWERS')} unit="پیش‌نویس" />)
      </p>
    </Card>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ops-stat">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Execution({ f }: { f: Figures }) {
  const groups: ReadonlyArray<{ id: string; title: string; unit: string; accounts: ReactNode }> = [
    {
      id: 'P.TASKS_DONE_7D', title: 'کارهای انجام‌شده ظرف ۷ روز', unit: 'کار',
      accounts: <>هر حساب یک‌بار: <OfCount value={rowOf(f, 'P.TASKS_DONE_7D_ACCOUNTS')} unit="حساب" /> که هر دو نوع کار داشتند، کارهای هوش مصنوعی را بیشتر انجام دادند.</>,
    },
    {
      id: 'P.ROUTINE_SLOTS_DONE', title: 'نوبت‌های روتین انجام‌شده', unit: 'نوبت',
      accounts: <>هر حساب یک‌بار: <OfCount value={rowOf(f, 'P.ROUTINE_SLOTS_DONE_ACCOUNTS')} unit="حساب" /> که هر دو نوع روتین داشتند، نوبت‌های هوش مصنوعی را بیشتر انجام دادند.</>,
    },
    {
      id: 'P.TASKS_CARRIED_OVER_TWICE', title: 'کارهایی که بیش از ۲ بار جابه‌جا شدند', unit: 'کار',
      accounts: <>هر حساب یک‌بار: هوش مصنوعی <OfCount value={rowOf(f, 'P.TASKS_CARRIED_OVER_TWICE_ACCOUNTS', 'AI')} unit="حساب" /> · دستی <OfCount value={rowOf(f, 'P.TASKS_CARRIED_OVER_TWICE_ACCOUNTS', 'MANUAL')} unit="حساب" /></>,
    },
  ]
  return (
    <Card title="آیا برنامه‌ها اجرا می‌شوند؟" note="ساخته‌ی هوش مصنوعی در برابر دستی">
      <div className="space-y-5">
        {groups.map(group => (
          <section key={group.id} aria-label={group.title}>
            <h3 className="mb-2 text-sm font-extrabold">{group.title}</h3>
            <ul className="space-y-2">
              {(['AI', 'MANUAL'] as const).map(origin => {
                const value = rowOf(f, group.id, origin)
                return (
                  <li key={origin} className="ops-bar-row">
                    <span className="ops-bar-label">{origin === 'AI' ? 'هوش مصنوعی' : 'دستی'}</span>
                    <Meter value={value} tone={origin === 'AI' ? 'tone-ai' : undefined} />
                    <OfCount faint={false} value={value} unit={group.unit} />
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-xs leading-6 text-text-secondary">{group.accounts}</p>
          </section>
        ))}
      </div>
    </Card>
  )
}

const decisionKinds: ReadonlyArray<{ id: string; label: string; tone: string }> = [
  { id: 'DONE', label: 'انجام شد', tone: 'mix-done' },
  { id: 'TODAY', label: 'امروز', tone: 'mix-today' },
  { id: 'MOVED', label: 'روز دیگر', tone: 'mix-moved' },
  { id: 'KEEP', label: 'نگه داشت', tone: 'mix-keep' },
  { id: 'DROP', label: 'کنار گذاشت', tone: 'mix-drop' },
]

function Reconcile({ f }: { f: Figures }) {
  const sessions = rowOf(f, 'P.RECONCILE_SESSIONS')
  const perSession = rowOf(f, 'P.RECONCILE_DECISIONS_PER_SESSION')
  const reverted = rowOf(f, 'P.RECONCILE_REVERTED')
  const total = perSession.numerator
  return (
    <Card title="بازبینی">
      <dl className="ops-stats">
        <Stat label="جلسه‌های بازبینی">
          <b className="text-lg">{count(sessions.numerator)}</b>
          <span className="ops-faint block text-xs">از {count(sessions.denominator)} حساب</span>
        </Stat>
        <Stat label="تصمیم در هر جلسه">
          <b className="text-lg">{mean(perSession)}</b>
          <span className="ops-faint block text-xs">{count(perSession.numerator)} تصمیم در {count(perSession.denominator)} جلسه</span>
        </Stat>
        <Stat label="تصمیم برگردانده‌شده">
          <OfCount value={rowOf(f, 'P.RECONCILE_REVERTED_ACCOUNTS')} unit="حساب" />
          <span className="block"><OfCount faint value={reverted} unit="تصمیم" /></span>
        </Stat>
      </dl>
      <div className="ops-mix mt-4" aria-hidden="true">
        {decisionKinds.map(kind => {
          const value = rowOf(f, 'P.RECONCILE_DECISION_MIX', kind.id).numerator
          return value > 0 ? <span key={kind.id} className={`block h-full ${kind.tone}`} style={{ flexGrow: value }} /> : null
        })}
      </div>
      <ul className="mt-3 space-y-1.5 text-xs" aria-label="ترکیب تصمیم‌ها">
        {decisionKinds.map(kind => (
          <li key={kind.id} className="flex flex-wrap items-center gap-x-2">
            <span className={`ops-dot ${kind.tone}`} aria-hidden="true" />
            <span className="w-20 font-bold">{kind.label}</span>
            <OfCount value={rowOf(f, 'P.RECONCILE_DECISION_MIX_ACCOUNTS', kind.id)} unit="حساب" />
            <OfCount faint value={{ numerator: rowOf(f, 'P.RECONCILE_DECISION_MIX', kind.id).numerator, denominator: total }} unit="تصمیم" />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Retention({ f }: { f: Figures }) {
  const cells = rowsOf(f, 'P.COHORT_RETENTION')
  const cohorts = [...new Set(cells.map(x => x.segment.split(':')[0]))]
  const weeks = [0, 1, 2, 3, 4]
  return (
    <Card title="ماندگاری" note="کاربرانی که هر هفته بعد از ثبت‌نام کاری انجام دادند یا برنامه ریختند">
      {cohorts.length === 0 ? <p className="text-sm text-text-secondary">در این بازه کسی ثبت‌نام نکرده است.</p> : (
        <div className="ops-scroll">
          <table className="ops-table ops-cohort">
            <caption className="sr-only">ماندگاری هفتگی هر هم‌دوره</caption>
            <thead>
              <tr>
                <th scope="col">هم‌دوره</th>
                <th scope="col">ثبت‌نام</th>
                {weeks.map(week => <th key={week} scope="col">هفته‌ی {count(week)}</th>)}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(cohort => {
                const size = cells.find(x => x.segment.startsWith(`${cohort}:`))?.denominator ?? 0
                return (
                  <tr key={cohort}>
                    <th scope="row">
                      هفته‌ی {formatDayMonth(cohort)}
                      {size < SmallSampleBelow && <SmallSample />}
                    </th>
                    <td>{count(size)}</td>
                    {weeks.map(week => {
                      const cell = cells.find(x => x.segment === `${cohort}:${week}`)
                      if (!cell) return <td key={week} />
                      const share = cell.denominator > 0 ? cell.numerator / cell.denominator : 0
                      return (
                        <td key={week}>
                          <span className="ops-cell" style={{ '--share': share } as CSSProperties}
                            title={`${count(cell.numerator)} از ${count(cell.denominator)}`}>
                            {count(cell.numerator)}
                            <span className="sr-only"> از {count(cell.denominator)}</span>
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Satisfaction({ f }: { f: Figures }) {
  const prompts = rowsOf(f, 'P.SATISFACTION_PROMPTS')
  const ratings = rowsOf(f, 'P.SATISFACTION_RATING')
  const surfaces = [...new Set(prompts.map(x => x.segment.split(':')[0]))]
  const answers = ratings.reduce((total, x) => total + x.numerator, 0)
  const all = rowsOf(f, 'P.SATISFACTION_MEAN').reduce(
    (total, x) => ({ numerator: total.numerator + x.numerator, denominator: total.denominator + x.denominator }),
    { numerator: 0, denominator: 0 })
  const outcome = (name: string) => prompts.filter(x => x.segment.endsWith(`:${name}`)).reduce((total, x) => total + x.numerator, 0)
  return (
    <Card title="رضایت از پاسخ‌های هوش مصنوعی" note="بعد از هر پاسخ، روزی یک‌بار برای هر حساب در هر بخش">
      <div className="grid gap-4">
        <div className="ops-highlight">
          <p className="text-xs font-bold text-text-secondary">هر حساب یک‌بار</p>
          <p className="mt-1 text-2xl font-extrabold"><OfCount value={rowOf(f, 'P.SATISFIED_ACCOUNTS')} /></p>
          <p className="text-xs text-text-secondary">حساب، میانگین ۴ یا بیشتر</p>
          <p className="ops-faint mt-2 text-xs">همه‌ی پاسخ‌ها: میانگین {mean(all)} روی {count(all.denominator)}</p>
        </div>
        <ul className="space-y-2" aria-label="پخش امتیازها">
          {[5, 4, 3, 2, 1].map(rating => {
            const n = ratings.filter(x => x.segment.endsWith(`:${rating}`)).reduce((total, x) => total + x.numerator, 0)
            return (
              <li key={rating} className="ops-bar-row">
                <span className="ops-bar-label">{ratingName[rating]}</span>
                <Meter value={{ numerator: n, denominator: answers }} />
                <OfCount faint value={{ numerator: n, denominator: answers }} />
              </li>
            )
          })}
        </ul>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="به تفکیک بخش">
        {surfaces.map(surface => {
          const value = rowOf(f, 'P.SATISFACTION_MEAN', surface)
          return (
            <li key={surface} className="ops-chip">
              {surfaceName[surface] ?? surface}: <b className="text-text-primary">{mean(value)}</b> روی {count(value.denominator)} پاسخ
              {value.denominator < SmallSampleBelow && <SmallSample />}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span>نشان داده شد <b>{count(outcome('ANSWERED') + outcome('CLOSED') + outcome('SHOWN'))}</b></span>
        <span>جواب داده شد <b>{count(outcome('ANSWERED'))}</b></span>
        <span>بسته شد بی‌جواب <b>{count(outcome('CLOSED'))}</b></span>
        <span>هنوز بی‌پاسخ <b>{count(outcome('SHOWN'))}</b></span>
        <span>بسته‌شدن امتیاز پایین نیست.</span>
      </p>
    </Card>
  )
}

function Reasons({ f, reasons }: { f: Figures; reasons: readonly LowRatingReasonDto[] }) {
  return (
    <Card title="دلیل‌های نارضایتی"
      note={<><OfCount value={rowOf(f, 'P.LOW_RATING_REASONS')} /> امتیاز «بد» و «ضعیف» توضیح داشتند</>}>
      <p className="notice mb-3 flex gap-2 text-xs">
        <Lock size={16} className="mt-1 shrink-0" aria-hidden="true" />
        فقط متنی که کاربر خودش برای بازخورد نوشته؛ بدون نام و شماره نشان داده می‌شود، ۱۸۰ روز می‌ماند و با حذف حساب پاک می‌شود.
      </p>
      {reasons.length === 0 ? <p className="text-sm text-text-secondary">در این بازه توضیحی نوشته نشده است.</p> : (
        <ul className="space-y-2.5" aria-label="دلیل‌ها">
          {reasons.map((reason, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: reasons carry no identity by design; order is the server's.
            <li key={index} className="ops-reason">
              <p className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <span className="ops-rating">{ratingName[Number(reason.rating)] ?? count(reason.rating)}</span>
                <span>{surfaceName[reason.surface] ?? reason.surface}</span>
                <span className="ms-auto">{formatDayMonth(reason.shownOn)}</span>
              </p>
              <p className="mt-1.5 text-sm leading-7">«{reason.text}»</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
