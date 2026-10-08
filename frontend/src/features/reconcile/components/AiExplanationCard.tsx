import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { useReconcileExplanation } from '../hooks/reconcile-hooks'
import {
  actionTitles,
  explanationFailureLabels,
  formatFacts,
  recommendationStatusText,
  ruleLabels,
} from '../types/reconcile.format'
import type {
  ReconcileActionDraft,
  ReconcileActionType,
  ReconcileRecommendationDto,
  ReconcileSessionDto,
} from '../types/reconcile.types'

const datedActions = new Set<string>(['REPLAN_TASKS', 'SEQUENCE_CARRY_ALL'])

type UseRecommendation = {
  /** Starts an action that needs no further input; the server previews it next. */
  onAction: (draft: ReconcileActionDraft) => void
  /** Starts an action that first needs a date from the user. */
  onDatedAction: (draft: ReconcileActionDraft) => void
}

/**
 * The optional AI explanation of a Reconcile session. It sits beside the
 * deterministic lanes and never replaces them: its text is labelled as an
 * explanation, the rule it rests on is named separately, and using a
 * recommendation only opens the ordinary server preview. When it is
 * unavailable, failed or outdated, the lanes below are unchanged.
 */
export function AiExplanationCard({ session, onAction, onDatedAction }: { session: ReconcileSessionDto } & UseRecommendation) {
  const { request, cancel, dismiss } = useReconcileExplanation(session.id)
  const { availability, sample, explanation } = session.ai
  const canAsk = availability === 'AVAILABLE'

  if (!explanation && availability === 'NOT_ELIGIBLE') return null

  const requestCode = request.error ? toApiError(request.error).code : null

  return (
    <section className="card" aria-labelledby="reconcile-ai">
      <h2 className="flex items-center gap-2 font-bold" id="reconcile-ai">
        <Sparkles size={18} aria-hidden="true" />
        توضیح هوش مصنوعی
        <span className="status-badge status-neutral">{sample ? 'نمونه' : 'اختیاری'}</span>
      </h2>

      {!explanation && !canAsk && (
        <p className="mt-2 text-sm text-text-secondary">
          توضیح هوشمند اکنون خاموش است. همه تصمیم‌های پایین مثل همیشه در دسترس‌اند.
        </p>
      )}

      {(!explanation || explanation.status === 'FAILED') && canAsk && (
        <>
          {explanation?.status === 'FAILED' && (
            <p className="notice-attention mt-3" role="alert">
              {explanationFailureLabels[explanation.failureCode ?? ''] ?? 'توضیح آماده نشد.'}{' '}
              چیزی تغییر نکرده است و تصمیم‌های پایین همچنان در دسترس‌اند.
            </p>
          )}
          <p className="mt-2 text-sm text-text-secondary">
            {sample
              ? 'این نسخه از یک توضیح نمونه استفاده می‌کند و چیزی به سرویس بیرونی فرستاده نمی‌شود.'
              : 'فقط کدها و شمارش‌های همین بازبینی برای دستیار هوشمند فرستاده می‌شود؛ عنوان و متن کارهای شما فرستاده نمی‌شود.'}{' '}
            توضیح چیزی را تغییر نمی‌دهد.
          </p>
          <button className="secondary-button mt-3" type="button" disabled={request.isPending} onClick={() => request.mutate()}>
            {request.isPending ? 'در حال درخواست…' : explanation ? 'تلاش دوباره' : 'توضیح بده'}
          </button>
        </>
      )}

      {requestCode && (
        <p className="notice-attention mt-3" role="alert">
          {explanationFailureLabels[requestCode] ?? 'درخواست توضیح انجام نشد.'}{' '}
          تصمیم‌های پایین همچنان در دسترس‌اند.
        </p>
      )}

      {explanation?.status === 'RUNNING' && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm" role="status">در حال آماده‌سازی توضیح… لازم نیست منتظر بمانید.</p>
          <button className="ghost-button min-h-9 px-3" type="button" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            انصراف
          </button>
        </div>
      )}

      {explanation?.status === 'READY' && (
        <>
          {explanation.isCurrent
            ? <p className="mt-3 text-sm leading-7">{explanation.summary}</p>
            : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm text-text-secondary">از زمان این توضیح، وضعیت کارها تغییر کرده است.</p>
                {canAsk && (
                  <button className="ghost-button min-h-9 px-3" type="button" disabled={request.isPending} onClick={() => request.mutate()}>
                    توضیح تازه
                  </button>
                )}
              </div>
            )}
          {explanation.recommendations.length > 0 && (
            <ul className="mt-4 space-y-3 border-t border-border-subtle pt-4" aria-label="پیشنهادها">
              {explanation.recommendations.map(recommendation => (
                <li key={recommendation.id}>
                  <Recommendation
                    recommendation={recommendation}
                    dismissing={dismiss.isPending && dismiss.variables === recommendation.id}
                    onDismiss={() => dismiss.mutate(recommendation.id)}
                    onAction={onAction}
                    onDatedAction={onDatedAction}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-text-secondary">
            این متن توضیح است، نه تصمیم. تا پیش‌نمایش را تأیید نکنید چیزی تغییر نمی‌کند.
          </p>
        </>
      )}
    </section>
  )
}

function Recommendation({ recommendation, dismissing, onDismiss, onAction, onDatedAction }: {
  recommendation: ReconcileRecommendationDto
  dismissing: boolean
  onDismiss: () => void
} & UseRecommendation) {
  // The user may leave some Tasks out before previewing; a sequence is always taken whole.
  const [excluded, setExcluded] = useState<string[]>([])
  const actionType = recommendation.actionType as ReconcileActionType
  const open = recommendation.status === 'OPEN'
  const selectable = open && !recommendation.sequenceId && recommendation.taskIds.length > 1
  const selected = recommendation.taskIds.filter(id => !excluded.includes(id))
  const label = actionTitles[actionType] ?? recommendation.actionType
  const titles = new Map(recommendation.tasks.map(task => [task.id, task.title]))
  const sequenceFacts = recommendation.sequenceId ? recommendation.evidence[0] : undefined
  // In a sequence the facts describe the chain as a whole, so its members carry none of their own.
  const taskFacts = (taskId: string) => {
    const unit = sequenceFacts ? undefined : recommendation.evidence.find(item => item.taskIds.includes(taskId))
    return unit ? formatFacts(unit) : []
  }

  const use = () => {
    const draft: ReconcileActionDraft = recommendation.sequenceId
      ? { actionType, sequenceId: recommendation.sequenceId, recommendationId: recommendation.id }
      : { actionType, taskIds: selected, recommendationId: recommendation.id }
    if (datedActions.has(actionType)) onDatedAction(draft)
    else onAction(draft)
  }

  return (
    <article className={open ? '' : 'opacity-70'} aria-label={`پیشنهاد: ${label}`}>
      <p className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="status-badge status-neutral">قاعده: {ruleLabels[recommendation.ruleId] ?? recommendation.ruleId}</span>
        <span className="font-bold">{label}</span>
      </p>
      {sequenceFacts && <Facts phrases={formatFacts(sequenceFacts)} />}
      <ul className="mt-2 space-y-1 text-sm">
        {recommendation.taskIds.map(id => (
          <li key={id}>
            {selectable ? (
              <label className="flex items-start gap-2">
                <input
                  className="mt-1 size-4 shrink-0 accent-accent"
                  type="checkbox"
                  checked={!excluded.includes(id)}
                  onChange={event => setExcluded(event.target.checked
                    ? excluded.filter(value => value !== id)
                    : [...excluded, id])}
                />
                <span className="wrap-break-word">{titles.get(id) ?? 'کار'}</span>
              </label>
            ) : <span className="wrap-break-word">{titles.get(id) ?? 'کار'}</span>}
            <Facts phrases={taskFacts(id)} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm leading-7 text-text-secondary">
        <span className="font-bold text-text-primary">توضیح هوش مصنوعی: </span>
        {recommendation.explanation}
      </p>
      {open ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="secondary-button min-h-9 px-3" type="button" disabled={selected.length === 0} onClick={use}>
            دیدن پیش‌نمایش
          </button>
          <button className="ghost-button min-h-9 px-3" type="button" disabled={dismissing} onClick={onDismiss}>
            نمی‌خواهم
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm">{recommendationStatusText(recommendation.status, recommendation.commandStatus)}</p>
      )}
    </article>
  )
}

/** Facts computed by the planner, shown apart from the rule and from the AI text. */
function Facts({ phrases }: { phrases: string[] }) {
  if (phrases.length === 0) return null
  return (
    <p className="text-xs text-text-secondary">
      <span className="font-bold">واقعیت‌ها: </span>
      {phrases.join(' · ')}
    </p>
  )
}
