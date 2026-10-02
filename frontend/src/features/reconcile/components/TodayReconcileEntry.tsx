import { Link } from '@tanstack/react-router'
import { RefreshCcw } from 'lucide-react'
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
    <section className="card mb-6 border-accent/30 bg-accent-tint" aria-label="پیشنهاد بازبینی">
      <div className="flex items-start gap-3">
        <RefreshCcw size={22} className="mt-1 shrink-0 text-accent-strong" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{copy}</p>
          <p className="text-sm text-text-secondary">{detail}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="primary-button min-h-9 px-3" to="/reconcile">شروع بازبینی</Link>
        <button
          className="ghost-button min-h-9 px-3"
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
