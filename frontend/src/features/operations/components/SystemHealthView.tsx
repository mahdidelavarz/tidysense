import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  Activity,
  CircleCheck,
  Coins,
  Database,
  Hourglass,
  MessageHeart,
  Outbox,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from '../../../shared/ui/icons'
import type {
  MetricResultDto,
  OperationsAiDto,
  OperationsAlertDto,
  OperationsHealthDto,
  OperationsMetricsDto,
} from '../types/operations.types'
import { Card, Code, count, Loaded, Meter, OfCount, Tile } from './OperationsUi'

const dollars = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const dateTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })

/** Cost is stored in millionths of a US dollar. */
const cost = (micros: number | string) => `${dollars.format(Number(micros) / 1_000_000)} دلار`
/** Budget alerts carry money; every other alert carries a plain number. */
const amount = (rule: string, value: number | string) => (rule.startsWith('AI_BUDGET') ? cost(value) : count(value))
/** Figures whose numerator is not a part of the denominator (a median, or many per account): no bar, no «از». */
const notShares = new Set(['H1.FLOWS_STARTED', 'H1.TIME_TO_DRAFT_SECONDS', 'H2.SESSIONS_OPENED', 'H2.DECISION_COMPRESSION'])
const familyName: Record<string, string> = { PLANNING: 'برنامه‌ریزی', RECONCILE: 'بازبینی' }

/**
 * «سلامت سیستم»: alerts, queues, the AI runtime and the H1/H2 evidence. Read-only; every figure is
 * a count with its denominator and nothing names a user or shows their text.
 */
export function SystemHealthView({ health, ai, metrics }: {
  health: UseQueryResult<OperationsHealthDto>
  ai: UseQueryResult<OperationsAiDto>
  metrics: UseQueryResult<OperationsMetricsDto>
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusTile health={health.data} />
        <SpendTile ai={ai.data} />
        <CallsTile ai={ai.data} />
        <MaintenanceTile health={health.data} />
      </div>

      <Loaded query={health} pendingText="در حال دریافت هشدارها…">
        {data => (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
            <Card title="هشدارهای فعال"><Alerts alerts={data.alerts} /></Card>
            <Card title="صف‌ها و نگهداری"><Queues health={data} /></Card>
          </div>
        )}
      </Loaded>

      <section aria-label="هوش مصنوعی" className="space-y-4 pt-3">
        <h2 className="lane-title">هوش مصنوعی</h2>
        <Loaded query={ai} pendingText="در حال دریافت وضعیت هوش مصنوعی…">
          {data => <AiRuntime ai={data} />}
        </Loaded>
      </section>

      <section aria-label="شواهد H1 و H2" className="space-y-4 pt-3">
        <h2 className="lane-title">شواهد H1 و H2</h2>
        <Loaded query={metrics} pendingText="در حال دریافت شواهد…">
          {data => <Evidence metrics={data} />}
        </Loaded>
      </section>
    </div>
  )
}

function StatusTile({ health }: { health: OperationsHealthDto | undefined }) {
  const critical = health?.alerts.filter(x => x.severity === 'CRITICAL').length ?? 0
  const warnings = (health?.alerts.length ?? 0) - critical
  const quiet = health !== undefined && health.alerts.length === 0
  return (
    <Tile icon={quiet ? ShieldCheck : TriangleAlert} label="وضعیت">
      {health === undefined ? '—' : quiet ? 'بدون هشدار' : [
        critical > 0 && `${count(critical)} بحرانی`, warnings > 0 && `${count(warnings)} هشدار`,
      ].filter(Boolean).join('، ')}
    </Tile>
  )
}

function SpendTile({ ai }: { ai: OperationsAiDto | undefined }) {
  const spent = ai?.families.reduce((sum, x) => sum + Number(x.spentTodayMicros), 0) ?? 0
  const budget = ai?.families.reduce((sum, x) => sum + Number(x.dailyBudgetMicros), 0) ?? 0
  return (
    <Tile icon={Coins} label="هزینه‌ی امروز" hint={ai && <>جمع بودجه‌ی روزانه‌ی خانواده‌ها<Meter value={{ numerator: spent, denominator: budget }} /></>}>
      {ai ? <>{cost(spent)} <span className="ops-faint text-sm">از {cost(budget)}</span></> : '—'}
    </Tile>
  )
}

function CallsTile({ ai }: { ai: OperationsAiDto | undefined }) {
  const calls = ai?.calls.reduce((sum, x) => sum + Number(x.calls), 0) ?? 0
  return (
    <Tile icon={Activity} label="فراخوانی‌ها در بازه" hint={ai && `در ${count(ai.calls.length)} خانواده`}>
      {ai ? count(calls) : '—'}
    </Tile>
  )
}

function MaintenanceTile({ health }: { health: OperationsHealthDto | undefined }) {
  return (
    <Tile icon={CircleCheck} label="آخرین نگهداری"
      hint={health?.lastMaintenanceAt ? dateTime.format(new Date(health.lastMaintenanceAt)) : undefined}>
      {health === undefined ? '—'
        : !health.lastMaintenanceAt ? 'هنوز اجرا نشده'
          : health.lastMaintenanceOutcome === 'SUCCEEDED' ? 'موفق' : 'ناموفق'}
    </Tile>
  )
}

function Alerts({ alerts }: { alerts: readonly OperationsAlertDto[] }) {
  if (alerts.length === 0) return <p className="notice">هشدار فعالی وجود ندارد.</p>
  return (
    <ul className="space-y-2.5" aria-label="هشدارهای فعال">
      {alerts.map(alert => {
        const critical = alert.severity === 'CRITICAL'
        const measured = Number(alert.threshold) > 0
        return (
          <li key={`${alert.rule}-${alert.scope}`} className="ops-alert" data-severity={critical ? 'critical' : 'warning'}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={critical ? 'status-badge bg-attention-tint text-attention' : 'status-badge bg-caution-tint text-caution'}>
                {critical ? 'بحرانی' : 'هشدار'}
              </span>
              <Code>{alert.rule}</Code>
              <span className="text-text-tertiary" aria-hidden="true">·</span>
              <Code>{alert.scope}</Code>
            </div>
            {measured && (
              <p className="mt-2 text-sm text-text-secondary">
                {/* A negative value means there is nothing to measure yet, such as maintenance that never ran. */}
                {Number(alert.value) < 0
                  ? 'هنوز مقداری ثبت نشده است'
                  : `مقدار ${amount(alert.rule, alert.value)} از آستانه‌ی ${amount(alert.rule, alert.threshold)}`}
              </p>
            )}
            {measured && Number(alert.value) >= 0 && (
              <Meter value={{ numerator: Number(alert.value), denominator: Number(alert.threshold) }}
                tone={critical ? 'tone-attention' : 'tone-caution'} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Queues({ health }: { health: OperationsHealthDto }) {
  return (
    <dl className="divide-y divide-border-subtle">
      <Queue icon={<MessageHeart size={18} />} label="توضیح‌های گیرکرده" hint="توضیح بازبینی که ساخته نشده" value={health.stuckExplanations} />
      <Queue icon={<Sparkles size={18} />} label="تلاش‌های برنامه‌ریزی گیرکرده" hint="بیش از زمان مجاز در جریان" value={health.stuckPlanningAttempts} />
      <Queue icon={<Outbox size={18} />} label="رویدادهای منتشرنشده" hint="هنوز ناشری وجود ندارد" value={health.pendingOutboxMessages} />
    </dl>
  )
}

function Queue({ icon, label, hint, value }: { icon: ReactNode; label: string; hint: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="lane-tile" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-sm font-bold">{label}</dt>
        <p className="text-xs text-text-secondary">{hint}</p>
      </div>
      <dd className="text-lg font-extrabold">{count(value)}</dd>
    </div>
  )
}

function AiRuntime({ ai }: { ai: OperationsAiDto }) {
  return (
    <div className="space-y-4">
      <p className={ai.globalKillSwitch ? 'status-badge bg-attention-tint text-attention' : 'status-badge status-positive'}>
        کلید توقف سراسری: {ai.globalKillSwitch ? 'روشن' : 'خاموش'}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ai.families.map(family => (
          <section key={family.family} className="card ops-family" aria-label={`خانواده‌ی ${familyName[family.family] ?? family.family}`}>
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-baseline gap-2 font-extrabold">
                {familyName[family.family] ?? family.family} <Code>{family.family}</Code>
              </h3>
              <span className="ops-provider"><Database size={14} aria-hidden="true" /><Code>{family.provider}</Code>{family.sample && ' · نمونه'}</span>
            </header>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="کلیدها">
              <Switch label="توقف" on={family.killSwitch || family.providerDisabled} onText="روشن" offText="خاموش" />
              <Switch label="تلاش دوباره" on={family.retryEnabled} onText="روشن" offText="خاموش" quiet />
              <Switch label="مدار" on={family.circuitOpen} onText="باز" offText="بسته" />
              <Switch label="سقف هزینه‌ی ارائه‌دهنده" on={family.spendLatched} onText="رسیده" offText="نرسیده" />
            </ul>
            <p className="mt-3 flex justify-between text-xs text-text-secondary">
              <span>هزینه‌ی امروز از بودجه‌ی روزانه</span>
              <span>{cost(family.spentTodayMicros)} از {cost(family.dailyBudgetMicros)}</span>
            </p>
            <Meter value={{ numerator: Number(family.spentTodayMicros), denominator: Number(family.dailyBudgetMicros) }} />
          </section>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card ops-scroll p-0 sm:p-0">
          <table className="ops-table">
            <caption>فراخوانی‌های ارائه‌دهنده در بازه</caption>
            <thead>
              <tr>{['خانواده', 'تعداد', 'میانه (میلی‌ثانیه)', 'صدک ۹۵', 'توکن ورودی / خروجی', 'هزینه'].map(x => <th key={x} scope="col">{x}</th>)}</tr>
            </thead>
            <tbody>
              {ai.calls.length === 0 && <tr><td colSpan={6} className="text-text-secondary">در این بازه فراخوانی‌ای ثبت نشده است.</td></tr>}
              {ai.calls.map(x => (
                <tr key={x.family}>
                  <th scope="row">{familyName[x.family] ?? x.family}</th>
                  <td>{count(x.calls)}</td><td>{count(x.latencyP50Ms)}</td><td>{count(x.latencyP95Ms)}</td>
                  <td>{count(x.inputTokens)} / {count(x.outputTokens)}</td><td>{cost(x.costMicros)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card title="نتیجه‌ی گام‌ها در بازه">
          {ai.outcomes.length === 0 ? <p className="text-sm text-text-secondary">در این بازه نتیجه‌ای ثبت نشده است.</p> : (
            <ul className="divide-y divide-border-subtle" aria-label="نتیجه‌ی گام‌ها">
              {ai.outcomes.map(x => (
                <li key={`${x.family}-${x.outcome}-${x.failureClass}-${x.gate}`} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{familyName[x.family] ?? x.family}</p>
                    <p className="flex flex-wrap gap-x-2 text-xs text-text-secondary">
                      <Code>{x.outcome}</Code>
                      {x.failureClass && <Code>{x.failureClass}</Code>}
                      {x.gate && <span>دروازه: <Code>{x.gate}</Code></span>}
                    </p>
                  </div>
                  <span className="font-extrabold">{count(x.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function Switch({ label, on, onText, offText, quiet = false }: {
  label: string
  on: boolean
  onText: string
  offText: string
  quiet?: boolean
}) {
  // A switch that stops work is drawn when on; retry on is the normal state.
  const raised = on && !quiet
  return (
    <li className={raised ? 'ops-switch ops-switch-on' : 'ops-switch'}>
      {label}: <b>{on ? onText : offText}</b>
    </li>
  )
}

function Evidence({ metrics }: { metrics: OperationsMetricsDto }) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-6 text-text-secondary">
        نسخه‌ی واژه‌نامه‌ی معیارها: <Code>{metrics.catalogVersion}</Code> · هر ردیف «صورت از مخرج» است؛ درصدی بدون مخرج نشان داده نمی‌شود و آستانه‌ای تعیین نشده است.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {metrics.primary.map(metric => <MetricCard key={metric.id} metric={metric} />)}
      </div>
      <details className="card">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold">
          <Users size={18} aria-hidden="true" />
          حساب‌های داخلی (جدا از جمعیت اصلی)
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {metrics.internal.map(metric => <MetricCard key={metric.id} metric={metric} />)}
        </div>
      </details>
      <section className="card" aria-label="بیرون از داده‌ی محصول">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <Hourglass size={17} aria-hidden="true" /> بیرون از داده‌ی محصول
        </h3>
        <ul className="flex flex-wrap gap-2">
          {metrics.external.map(x => (
            <li key={x.id} className="ops-switch"><Code>{x.id}</Code><span dir="ltr" className="text-text-secondary">{x.instrument}</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function MetricCard({ metric }: { metric: MetricResultDto }) {
  const share = !notShares.has(metric.id)
  return (
    <section className="card ops-metric" aria-label={metric.id}>
      <h3 className="font-extrabold"><Code>{metric.id}</Code></h3>
      <p dir="ltr" className="mt-1 text-start text-xs text-text-secondary">{metric.numerator} / {metric.denominator}</p>
      {metric.rows.length === 0 ? <p className="mt-3 text-sm text-text-secondary">در این بازه رکوردی نیست.</p> : (
        <ul className="mt-3 space-y-2.5">
          {metric.rows.map(row => {
            const value = { numerator: Number(row.numerator), denominator: Number(row.denominator) }
            return (
              <li key={row.segment} className="ops-bar-row">
                <span className="ops-bar-label">{row.segment ? <Code>{row.segment}</Code> : 'همه'}</span>
                {share ? <Meter value={value} /> : <span />}
                {share ? <OfCount value={value} />
                  : <span className="ops-of">صورت <b className="ops-of-n">{count(value.numerator)}</b> · مخرج {count(value.denominator)}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
