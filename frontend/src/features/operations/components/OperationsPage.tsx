import { Link } from '@tanstack/react-router'
import { type KeyboardEvent, useId, useState } from 'react'
import { type AppIcon, ChartColumns, ChartLine, Lock } from '../../../shared/ui/icons'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import { NotFoundState } from '../../../shared/ui/StateUi'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { useOperationsAi, useOperationsHealth, useOperationsInsights, useOperationsMetrics } from '../hooks/operations-hooks'
import type { OperationsRange, OperationsView } from '../types/operations.types'
import { ProductInsightsView } from './ProductInsightsView'
import { SystemHealthView } from './SystemHealthView'

const ranges: ReadonlyArray<{ value: OperationsRange; label: string }> = [
  { value: '7', label: '۷ روز' },
  { value: '28', label: '۲۸ روز' },
  { value: '90', label: '۹۰ روز' },
]

const views: ReadonlyArray<{ value: OperationsView; label: string; icon: AppIcon }> = [
  { value: 'health', label: 'سلامت سیستم', icon: ChartLine },
  { value: 'insights', label: 'سنجش محصول', icon: ChartColumns },
]

/**
 * The operator page, read-only, in two views: «سلامت سیستم» (alerts, the AI runtime, H1/H2
 * evidence) and «سنجش محصول» (027 §5). Both read the same window. Nothing on it identifies a user;
 * the only user text is the satisfaction reasons, shown without identity.
 */
export function OperationsPage() {
  const user = useCurrentUser()
  const allowed = user.data?.isOperator === true
  const [view, setView] = useState<OperationsView>('health')
  const [range, setRange] = useState<OperationsRange>('28')
  const days = Number(range)
  const health = useOperationsHealth(allowed && view === 'health')
  const ai = useOperationsAi(days, allowed && view === 'health')
  // The funnel reads acceptance and time to draft from the H1 evidence, so both views use it.
  const metrics = useOperationsMetrics(days, allowed)
  const insights = useOperationsInsights(days, allowed && view === 'insights')
  const id = useId()

  // The page does not exist for anyone else; the server answers their requests the same way.
  if (!allowed) return <NotFoundState action={<Link className="primary-button" to="/today">رفتن به امروز</Link>} />

  const refreshing = view === 'health'
    ? (ai.isFetching || metrics.isFetching) && !(ai.isPending || metrics.isPending)
    : insights.isFetching && !insights.isPending

  return (
    <div className="page-wide pb-16">
      <header className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
          <Lock size={14} aria-hidden="true" /> فقط اپراتور · فقط خواندنی
        </p>
        <h1 className="page-title">عملیات</h1>
        <p className="mt-1 text-sm leading-7 text-text-secondary">
          {view === 'health'
            ? 'هشدارها، وضعیت هوش مصنوعی و شواهد آزمایشی. هیچ کاربر یا متنی در این صفحه نیست؛ فقط شمارش‌ها.'
            : 'آیا محصول به کار می‌آید؟ هر عدد با مخرجش؛ بدون آستانه و بدون رنگ خوب و بد.'}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs id={id} value={view} onChange={setView} />
        <div className="flex items-center gap-3">
          {refreshing && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
          <SegmentedControl label="بازه‌ی زمانی" value={range} options={ranges} onChange={setRange} />
        </div>
      </div>

      <div role="tabpanel" id={`${id}-${view}`} aria-labelledby={`${id}-${view}-tab`}>
        {view === 'health'
          ? <SystemHealthView health={health} ai={ai} metrics={metrics} />
          : <ProductInsightsView insights={insights} metrics={metrics} />}
      </div>
    </div>
  )
}

function Tabs({ id, value, onChange }: { id: string; value: OperationsView; onChange: (value: OperationsView) => void }) {
  // Arrow keys move between the two views; in RTL the left arrow goes forward.
  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = views[(views.findIndex(x => x.value === value) + 1) % views.length].value
    onChange(next)
    document.getElementById(`${id}-${next}-tab`)?.focus()
  }
  return (
    <div className="ops-tabs" role="tablist" aria-label="نمای عملیات">
      {views.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          id={`${id}-${option}-tab`}
          className="ops-tab"
          type="button"
          role="tab"
          aria-selected={option === value}
          aria-controls={`${id}-${option}`}
          tabIndex={option === value ? 0 : -1}
          onClick={() => onChange(option)}
          onKeyDown={move}
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  )
}
