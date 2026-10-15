import { Link } from '@tanstack/react-router'
import { ArrowLeft, Hourglass, History, ListChecks, StickyNote, X } from '../../../shared/ui/icons'
import { formatNumber } from '../../../shared/lib/date'
import { useReconcileOverview, useResolveReconcilePrompt } from '../hooks/reconcile-hooks'

/**
 * The once-a-day Reconcile offer, a frosted card at the foot of Today's
 * photograph. It is an offer, never a gate: it renders nothing while loading
 * or on error, and closing it ("not now") hides it for the rest of the local
 * day without resolving anything.
 */
export function TodayReconcileEntry() {
  const overview = useReconcileOverview()
  const resolve = useResolveReconcilePrompt()
  if (!overview.data?.showPrompt) return null

  const { severity, counts } = overview.data
  const actionable = Number(counts.actionableBacklogCount)
  const captures = Number(counts.unresolvedCaptureCount)
  const reviews = Number(counts.reviewDueCount)
  const oldest = counts.oldestUnresolvedAgeDays == null ? 0 : Number(counts.oldestUnresolvedAgeDays)

  return (
    <section className="glass-card" aria-label="پیشنهاد بازبینی">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/92 text-[#1c2e34]" aria-hidden="true">
        <History size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-extrabold leading-[1.375rem]">
          {actionable > 0 || captures > 0 ? 'بازبینی روزهای قبل' : 'مرور تعهدها'}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {actionable > 0 && (
            <span className="glass-chip"><ListChecks size={12} aria-hidden="true" />{formatNumber(actionable)} کار مانده</span>
          )}
          {captures > 0 && (
            <span className="glass-chip"><StickyNote size={12} aria-hidden="true" />{formatNumber(captures)} یادداشت سریع</span>
          )}
          {reviews > 0 && <span className="glass-chip">{formatNumber(reviews)} مرور تعهد</span>}
          {oldest > 0 && (
            <span className="glass-chip" data-tone="warm">
              <Hourglass size={12} aria-hidden="true" />
              <span className="sr-only">قدیمی‌ترین مورد: </span>
              {formatNumber(oldest)} روز
            </span>
          )}
        </div>
      </div>
      <Link className="glass-button" to="/reconcile" aria-label="شروع بازبینی">
        <ArrowLeft size={18} aria-hidden="true" />
      </Link>
      <button
        className="glass-close"
        type="button"
        aria-label="فعلاً نه"
        disabled={resolve.isPending}
        // A light prompt is simply dismissed; a larger one is recorded as an explicit skip.
        onClick={() => resolve.mutate(severity === 'LIGHT' || severity === 'NONE' ? 'DISMISSED' : 'SKIPPED')}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </section>
  )
}
