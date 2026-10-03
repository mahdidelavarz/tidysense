import { Link } from '@tanstack/react-router'
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
      <h2 className="section-title" id="planning-details">برنامه‌ریزی</h2>
      <div className="mt-3">
        <Link className="secondary-button" to="/planning" search={scope}>برنامه‌ریزی قدم‌های بعدی</Link>
      </div>
      {ownsFacts && <RememberedFacts scope={scope} />}
    </section>
  )
}

function RememberedFacts({ scope }: { scope: PlanningScopeInput }) {
  const facts = usePlanningFacts(scope)
  const remove = useRemovePlanningFact(scope)
  if (!facts.data || facts.data.length === 0) return null

  return (
    <div className="card mt-4">
      <p className="font-bold">جزئیاتی که برای برنامه‌ریزی نگه داشته شده</p>
      <p className="text-sm text-text-secondary">این موارد در پیش‌نویس‌های بعدی به کار می‌روند. ساخت و ویرایش دستی شما را محدود نمی‌کنند.</p>
      <ul className="mt-3 space-y-3">
        {facts.data.map(fact => {
          const label = `${factTypeLabels[fact.factType] ?? fact.factType}: ${factValueLabel(fact.value)}`
          return (
            <li key={fact.id} className="flex flex-wrap items-center justify-between gap-3">
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
    </div>
  )
}
