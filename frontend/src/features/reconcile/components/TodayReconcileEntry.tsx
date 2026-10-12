import { Link } from '@tanstack/react-router'
import { RefreshCcw } from '../../../shared/ui/icons'
import { formatNumber } from '../../../shared/lib/date'
import { useReconcileOverview, useResolveReconcilePrompt } from '../hooks/reconcile-hooks'
import { severityLabels } from '../types/reconcile.format'

/**
 * The once-a-day Reconcile entry on Today. It is an offer, never a gate: it
 * renders nothing while loading or on error, and "not now" hides it for the
 * rest of the local day without resolving anything.
 */
export function TodayReconcileEntry() {
  const overview = useReconcileOverview()
  const resolve = useResolveReconcilePrompt()
  if (!overview.data?.showPrompt) return null

  const { severity, counts } = overview.data
  const actionable = Number(counts.actionableBacklogCount)
  const reviews = Number(counts.reviewDueCount)
  const copy = actionable > 0
    ? severityLabels[severity]?.title ?? severityLabels.LIGHT.title
    : 'زمان مرور چند تعهد رسیده است.'
  const detail = [
    actionable > 0 ? `${formatNumber(actionable)} تصمیم اجرایی` : null,
    reviews > 0 ? `${formatNumber(reviews)} مرور تعهد` : null,
  ].filter(Boolean).join(' · ')

  return (
    <section className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-caution/25 bg-linear-to-l from-caution-tint to-surface p-4 shadow-sm" aria-label="پیشنهاد بازبینی">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-caution/15 text-caution" aria-hidden="true">
        <RefreshCcw size={20} />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-bold leading-7">{copy}</p>
        <p className="text-sm text-text-secondary">{detail}</p>
      </div>
      <div className="flex gap-2">
        <Link className="primary-button min-h-10 px-3.5" to="/reconcile">شروع بازبینی</Link>
        <button
          className="ghost-button min-h-10 px-3"
          type="button"
          disabled={resolve.isPending}
          // A light prompt is simply dismissed; a larger one is recorded as an explicit skip.
          onClick={() => resolve.mutate(severity === 'LIGHT' || severity === 'NONE' ? 'DISMISSED' : 'SKIPPED')}
        >
          فعلاً نه
        </button>
      </div>
    </section>
  )
}
