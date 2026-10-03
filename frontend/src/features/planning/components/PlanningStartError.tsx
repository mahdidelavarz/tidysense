import { toApiError } from '../../../shared/api/http'
import { FormError } from '../../../shared/ui/FormUi'
import { startErrorLabels } from '../types/planning.format'

/**
 * Why a planning attempt could not be started. An unavailable or rate-limited
 * assistant is said in plain words, together with what did not change; every
 * other failure uses the shared form error.
 */
export function PlanningStartError({ error }: { error: unknown }) {
  if (!error) return null
  const copy = startErrorLabels[toApiError(error).code]
  if (!copy) return <FormError error={error} />
  return (
    <div className="notice-attention" role="alert">
      <p className="font-bold">انجام نشد</p>
      <p className="mt-1">{copy}</p>
    </div>
  )
}
