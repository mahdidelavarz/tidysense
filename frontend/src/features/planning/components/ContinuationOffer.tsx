import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { formatDayMonth, formatNumber } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { Sparkles } from '../../../shared/ui/icons'
import { useDeclinePlanningContinuation, usePlanningContinuations } from '../hooks/planning-hooks'
import type { PlanningContinuationDto } from '../types/planning.types'

const ordinals = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم']

/** «هفتهٔ اول», «هفتهٔ دوم», … and «هفتهٔ ۱۲م» after ten. */
export function weekName(week: number) {
  return `هفتهٔ ${ordinals[week - 1] ?? `${formatNumber(week)}م`}`
}

/** How the week went, in the person's words: only what happened, nothing judged. */
export function evidenceLine({ evidence }: Pick<PlanningContinuationDto, 'evidence'>) {
  const parts = [
    `${formatNumber(Number(evidence.completedTasks))} کار انجام شد`,
    Number(evidence.leftTasks) > 0 && `${formatNumber(Number(evidence.leftTasks))} کار مانده`,
    Number(evidence.carriedTasks) > 0 && `${formatNumber(Number(evidence.carriedTasks))} جابه‌جا شد`,
    Number(evidence.droppedTasks) > 0 && `${formatNumber(Number(evidence.droppedTasks))} کنار گذاشته شد`,
  ].filter(Boolean)
  const slots = Number(evidence.routineDone) + Number(evidence.routineMissed)
  if (slots > 0) parts.push(`روتین‌ها ${formatNumber(Number(evidence.routineDone))} از ${formatNumber(slots)} نوبت`)
  return parts.join('، ')
}

/**
 * The next week of a planned Goal or Project, offered near the end of its week
 * (029 §3). Nothing is generated until «برنامهٔ هفتهٔ بعد» is pressed, and the
 * draft it makes is reviewed and confirmed like any other. «فعلاً نه» ends the
 * offer; the Goal and its work stay as they are.
 */
export function ContinuationOffer({ offer, today }: { offer: PlanningContinuationDto; today: string }) {
  const headingId = useId()
  const decline = useDeclinePlanningContinuation()
  const state = offer.endDate < today ? 'تمام شد' : offer.endDate === today ? 'امروز تمام می‌شود' : 'فردا تمام می‌شود'
  return (
    <section className="ai-feedback" aria-labelledby={headingId}>
      <div className="flex items-start gap-3">
        <span className="ai-tile" aria-hidden="true"><Sparkles size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold leading-7" id={headingId}>
            {weekName(Number(offer.week))} «{offer.title}» {state}
          </h2>
          <p className="mt-0.5 text-sm leading-6 text-text-secondary">{evidenceLine(offer)}.</p>
          <p className="mt-1 text-xs text-text-secondary">
            هفتهٔ بعد، از {formatDayMonth(offer.nextStartDate)} تا {formatDayMonth(offer.nextEndDate)}، با توجه به همین ساخته می‌شود.
          </p>
        </div>
      </div>
      <FormError error={decline.error} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="primary-button min-h-11 flex-1 sm:flex-none" to="/planning" search={{ continue: offer.windowId }}>
          برنامهٔ هفتهٔ بعد
        </Link>
        <button
          className="secondary-button min-h-11"
          type="button"
          disabled={decline.isPending}
          onClick={() => decline.mutate({ windowId: offer.windowId, expectedVersion: Number(offer.version) }, {
            onSuccess: () => showToast(`باشد. هر وقت خواستید، از صفحهٔ «${offer.title}» برنامه بچینید.`),
          })}
        >
          فعلاً نه
        </button>
      </div>
    </section>
  )
}

/** Every offered week, or only the one of a Goal or Project. Renders nothing when none is offered. */
export function ContinuationOffers({ today, scopeId, className = '' }: { today: string; scopeId?: string; className?: string }) {
  const offers = (usePlanningContinuations().data ?? []).filter(offer => !scopeId || offer.scopeId === scopeId)
  if (offers.length === 0) return null
  return (
    <div className={`space-y-3 ${className}`}>
      {offers.map(offer => <ContinuationOffer key={offer.windowId} offer={offer} today={today} />)}
    </div>
  )
}
