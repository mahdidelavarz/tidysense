import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { ChevronDown, Compass, StickyNote } from '../../../shared/ui/icons'
import { showToast } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { usePlanningFacts, useRemovePlanningFact } from '../hooks/planning-hooks'
import { factTypeLabels, factValueLabel, strengthLabels } from '../types/planning.format'
import type { PlanningScopeInput } from '../types/planning.types'

/**
 * Planning on an active Goal or Project detail page: the contextual entry to
 * plan its next steps, and the planning details remembered for it. The list is
 * optional context, so it stays out of the way while loading and when empty.
 * `ownsFacts` is false for a Project under a Goal, which uses its Goal's details.
 */
export function PlanningFactsSection({ scope, ownsFacts = true }: { scope: PlanningScopeInput; ownsFacts?: boolean }) {
  return (
    <section className="mt-8" aria-labelledby="planning-details">
      <h2 className="lane-title" id="planning-details">برنامه‌ریزی</h2>
      <div className="mt-4">
        <Link className="secondary-button" to="/planning" search={scope}>
          <Compass size={18} aria-hidden="true" />
          برنامه‌ریزی قدم‌های بعدی
        </Link>
      </div>
      {ownsFacts && <RememberedFacts scope={scope} />}
    </section>
  )
}

/**
 * On the planning page, once a Goal or Project is chosen: «۳ نکته در یادم مانده»,
 * folded, opening to the same list with its remove buttons.
 */
export function RememberedFactsCard({ scope }: { scope: PlanningScopeInput }) {
  const facts = usePlanningFacts(scope)
  const [open, setOpen] = useState(false)
  const listId = useId()
  if (!facts.data || facts.data.length === 0) return null
  return (
    <section className="intent-card p-0! sm:p-0!">
      <button className="flex w-full items-center gap-3 p-4 text-start" type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(value => !value)}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sun-tint text-sun-strong" aria-hidden="true"><StickyNote size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">{formatNumber(facts.data.length)} نکته در یادم مانده</span>
          <span className="block truncate text-xs text-text-secondary">{facts.data.map(fact => factValueLabel(fact.value)).join('، ')}</span>
        </span>
        <ChevronDown size={20} className={open ? 'rotate-180' : ''} aria-hidden="true" />
      </button>
      <div id={listId} hidden={!open} className="px-4 pb-4">{open && <FactList scope={scope} />}</div>
    </section>
  )
}

function RememberedFacts({ scope }: { scope: PlanningScopeInput }) {
  const facts = usePlanningFacts(scope)
  if (!facts.data || facts.data.length === 0) return null

  return (
    <div className="decision-card mt-4 p-4 sm:p-5">
      <p className="font-bold">جزئیاتی که برای برنامه‌ریزی نگه داشته شده</p>
      <FactList scope={scope} />
    </div>
  )
}

/** The remembered details of one scope, each removable from future planning. */
function FactList({ scope }: { scope: PlanningScopeInput }) {
  const facts = usePlanningFacts(scope)
  const remove = useRemovePlanningFact(scope)
  if (!facts.data) return null

  return (
    <>
      <p className="text-sm text-text-secondary">این موارد در پیش‌نویس‌های بعدی به کار می‌روند. ساخت و ویرایش دستی شما را محدود نمی‌کنند.</p>
      <ul className="mt-3 divide-y divide-border-subtle">
        {facts.data.map(fact => {
          const label = `${factTypeLabels[fact.factType] ?? fact.factType}: ${factValueLabel(fact.value)}`
          return (
            <li key={fact.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block wrap-break-word font-bold">{label}</span>
                <span className="block text-sm text-text-secondary">
                  {fact.status === 'EXPIRED' ? 'تاریخش گذشته و دیگر به کار نمی‌رود' : strengthLabels[fact.strength] ?? fact.strength}
                </span>
              </span>
              <button
                className="secondary-button min-h-9 px-3"
                type="button"
                disabled={remove.isPending}
                aria-label={`حذف: ${label}`}
                onClick={() => remove.mutate(fact, { onSuccess: () => showToast('از برنامه‌ریزی‌های بعدی حذف شد.') })}
              >
                حذف
              </button>
            </li>
          )
        })}
      </ul>
      <FormError error={remove.error} />
    </>
  )
}
