import { Link } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import { ErrorState, LoadingState, NotFoundState } from '../../../shared/ui/StateUi'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { useOperationsAi, useOperationsHealth, useOperationsMetrics } from '../hooks/operations-hooks'
import type {
  MetricResultDto,
  OperationsAiDto,
  OperationsHealthDto,
  OperationsMetricsDto,
  OperationsRange,
} from '../types/operations.types'

const ranges: ReadonlyArray<{ value: OperationsRange; label: string }> = [
  { value: '7', label: '۷ روز' },
  { value: '28', label: '۲۸ روز' },
  { value: '90', label: '۹۰ روز' },
]

const dollars = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const dateTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })

/** Cost is stored in millionths of a US dollar. */
const cost = (micros: number | string) => `${dollars.format(Number(micros) / 1_000_000)} دلار`
const count = (value: number | string) => formatNumber(Number(value))
const yesNo = (value: boolean) => (value ? 'بله' : 'خیر')
/** Budget alerts carry money; every other alert carries a plain number. */
const amount = (rule: string, value: number | string) => (rule.startsWith('AI_BUDGET') ? cost(value) : count(value))

/**
 * The operator page: alerts, the AI runtime and the H1/H2 evidence, read-only. Every figure is a
 * count shown with its denominator; nothing on the page identifies a user or shows their text.
 */
export function OperationsPage() {
  const user = useCurrentUser()
  const allowed = user.data?.isOperator === true
  const [range, setRange] = useState<OperationsRange>('28')
  const days = Number(range)
  const health = useOperationsHealth(allowed)
  const ai = useOperationsAi(days, allowed)
  const metrics = useOperationsMetrics(days, allowed)

  // The page does not exist for anyone else; the server answers their requests the same way.
  if (!allowed) return <NotFoundState action={<Link className="primary-button" to="/today">رفتن به امروز</Link>} />

  return (
    <div className="page-wide">
      <PageHeader
        title="عملیات"
        description="هشدارها، وضعیت هوش مصنوعی و شواهد آزمایشی. فقط خواندنی است و هیچ کاربر یا متنی را نشان نمی‌دهد."
      />
      <Section title="هشدارها و نگهداری" query={health} pendingText="در حال دریافت هشدارها…">
        {data => <HealthSection health={data} />}
      </Section>
      <div className="mb-5 mt-10 flex items-center gap-3">
        <SegmentedControl label="بازهٔ زمانی" value={range} options={ranges} onChange={setRange} />
        {(ai.isFetching || metrics.isFetching) && !(ai.isPending || metrics.isPending) && (
          <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>
        )}
      </div>
      <Section title="هوش مصنوعی" query={ai} pendingText="در حال دریافت وضعیت هوش مصنوعی…">
        {data => <AiSection ai={data} />}
      </Section>
      <Section title="شواهد H1 و H2" query={metrics} pendingText="در حال دریافت شواهد…">
        {data => <MetricsSection metrics={data} />}
      </Section>
    </div>
  )
}

function Section<T>({ title, query, pendingText, children }: {
  title: string
  query: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => unknown }
  pendingText: string
  children: (data: T) => ReactNode
}) {
  return (
    <section className="mb-10" aria-label={title}>
      <h2 className="section-title mb-3">{title}</h2>
      {query.isPending ? <LoadingState text={pendingText} />
        : query.error || query.data === undefined
          ? <ErrorState onRetry={() => query.refetch()} description="ارتباط را بررسی کنید و دوباره تلاش کنید." />
          : children(query.data)}
    </section>
  )
}

function HealthSection({ health }: { health: OperationsHealthDto }) {
  return (
    <div className="space-y-4">
      {health.alerts.length === 0
        ? <p className="card text-sm text-text-secondary">هشدار فعالی وجود ندارد.</p>
        : (
          <ul className="space-y-2" aria-label="هشدارهای فعال">
            {health.alerts.map(alert => (
              <li key={`${alert.rule}-${alert.scope}`} className="card flex flex-wrap items-center gap-3">
                <span className={alert.severity === 'CRITICAL' ? 'status-badge bg-attention-tint text-attention' : 'status-badge status-active'}>
                  {alert.severity === 'CRITICAL' ? 'بحرانی' : 'هشدار'}
                </span>
                <code dir="ltr" className="text-sm font-bold">{alert.rule}</code>
                <code dir="ltr" className="text-sm text-text-secondary">{alert.scope}</code>
                {Number(alert.threshold) > 0 && (
                  <span className="text-sm text-text-secondary">
                    {/* A negative value means there is nothing to measure yet, such as maintenance that never ran. */}
                    {Number(alert.value) < 0
                      ? 'هنوز مقداری ثبت نشده است'
                      : `مقدار ${amount(alert.rule, alert.value)} از آستانهٔ ${amount(alert.rule, alert.threshold)}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      <dl className="card grid gap-3 text-sm sm:grid-cols-2">
        <Term label="آخرین اجرای نگهداری">
          {health.lastMaintenanceAt
            ? `${dateTime.format(new Date(health.lastMaintenanceAt))} · ${health.lastMaintenanceOutcome === 'SUCCEEDED' ? 'موفق' : 'ناموفق'}`
            : 'هنوز اجرا نشده'}
        </Term>
        <Term label="توضیح‌های گیرکرده">{count(health.stuckExplanations)}</Term>
        <Term label="تلاش‌های برنامه‌ریزی گیرکرده">{count(health.stuckPlanningAttempts)}</Term>
        <Term label="رویدادهای منتشرنشده (ناشر وجود ندارد)">{count(health.pendingOutboxMessages)}</Term>
      </dl>
    </div>
  )
}

function AiSection({ ai }: { ai: OperationsAiDto }) {
  return (
    <div className="space-y-4">
      <Table
        caption={`وضعیت خانواده‌ها · کلید توقف سراسری: ${ai.globalKillSwitch ? 'روشن' : 'خاموش'}`}
        head={['خانواده', 'ارائه‌دهنده', 'نمونه', 'کلید توقف', 'تلاش دوباره', 'مدار باز', 'سقف هزینهٔ ارائه‌دهنده', 'هزینهٔ امروز', 'بودجهٔ روزانه']}
        rows={ai.families.map(x => [
          <Code key="f">{x.family}</Code>, <Code key="p">{x.provider}</Code>, yesNo(x.sample),
          x.killSwitch || x.providerDisabled ? 'روشن' : 'خاموش', yesNo(x.retryEnabled), yesNo(x.circuitOpen),
          x.spendLatched ? 'رسیده' : 'نرسیده', cost(x.spentTodayMicros), cost(x.dailyBudgetMicros),
        ])}
      />
      <Table
        caption="فراخوانی‌های ارائه‌دهنده در بازه"
        empty="در این بازه فراخوانی‌ای ثبت نشده است."
        head={['خانواده', 'تعداد', 'میانهٔ زمان (میلی‌ثانیه)', 'صدک ۹۵ (میلی‌ثانیه)', 'توکن ورودی', 'توکن خروجی', 'هزینه']}
        rows={ai.calls.map(x => [
          <Code key="f">{x.family}</Code>, count(x.calls), count(x.latencyP50Ms), count(x.latencyP95Ms),
          count(x.inputTokens), count(x.outputTokens), cost(x.costMicros),
        ])}
      />
      <Table
        caption="نتیجهٔ گام‌های عملیات در بازه"
        empty="در این بازه نتیجه‌ای ثبت نشده است."
        head={['خانواده', 'نتیجه', 'دستهٔ خطا', 'دروازهٔ ردکننده', 'تعداد']}
        rows={ai.outcomes.map(x => [
          <Code key="f">{x.family}</Code>, <Code key="o">{x.outcome}</Code>,
          x.failureClass ? <Code key="c">{x.failureClass}</Code> : '—', x.gate ? <Code key="g">{x.gate}</Code> : '—',
          count(x.count),
        ])}
      />
    </div>
  )
}

function MetricsSection({ metrics }: { metrics: OperationsMetricsDto }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        نسخهٔ واژه‌نامهٔ معیارها: <Code>{metrics.catalogVersion}</Code>. هر ردیف «صورت از مخرج» است؛ درصدی بدون مخرج نشان داده نمی‌شود و آستانه‌ای در اینجا تعیین نشده است.
      </p>
      {metrics.primary.map(metric => <MetricTable key={metric.id} metric={metric} />)}
      <details className="card">
        <summary className="cursor-pointer text-sm font-bold">حساب‌های داخلی (جدا از جمعیت اصلی)</summary>
        <div className="mt-4 space-y-4">
          {metrics.internal.map(metric => <MetricTable key={metric.id} metric={metric} />)}
        </div>
      </details>
      <Table
        caption="معیارهایی که از دادهٔ محصول به دست نمی‌آیند"
        head={['معیار', 'ابزار لازم']}
        rows={metrics.external.map(x => [<Code key="i">{x.id}</Code>, <span key="t" dir="ltr" className="block text-start">{x.instrument}</span>])}
      />
    </div>
  )
}

function MetricTable({ metric }: { metric: MetricResultDto }) {
  return (
    <Table
      caption={<Code>{metric.id}</Code>}
      note={<span dir="ltr" className="block text-start">{metric.numerator} / {metric.denominator}</span>}
      empty="در این بازه رکوردی نیست."
      head={['بخش', 'صورت', 'مخرج']}
      rows={metric.rows.map(row => [
        row.segment ? <Code key="s">{row.segment}</Code> : 'همه', count(row.numerator), count(row.denominator),
      ])}
    />
  )
}

function Table({ caption, note, head, rows, empty }: {
  caption: ReactNode
  note?: ReactNode
  head: string[]
  rows: ReactNode[][]
  empty?: string
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="mb-3 text-start font-bold">
          {caption}
          {note && <span className="mt-1 block text-xs font-normal text-text-secondary">{note}</span>}
        </caption>
        <thead>
          <tr className="border-b border-border text-text-secondary">
            {head.map(label => <th key={label} scope="col" className="px-2 py-2 text-start font-medium">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty && (
            <tr><td colSpan={head.length} className="px-2 py-3 text-text-secondary">{empty}</td></tr>
          )}
          {rows.map((row, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are a fixed, ordered read of one response.
            <tr key={index} className="border-b border-border last:border-0">
              {row.map((cell, cellIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells follow the column order.
                <td key={cellIndex} className="px-2 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="mt-1 font-bold">{children}</dd>
    </div>
  )
}

/** Codes and identifiers are Latin and read left to right inside the RTL page. */
function Code({ children }: { children: ReactNode }) {
  return <code dir="ltr">{children}</code>
}
