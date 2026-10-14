import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { FolderKanban, Link2, ShieldCheck, Sparkles, Target } from '../../../shared/ui/icons'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { type IntentionFields, intentionSchema } from '../types/planning.schema'
import type { PlanningScopeInput } from '../types/planning.types'
import { PlanningStartError } from './PlanningStartError'

/**
 * Step one, «نوشتن»: the single open input a planning flow starts from, and
 * optionally the Goal or Project it is about. There is no mandatory Goal form,
 * and nothing is created until the user confirms a reviewed draft.
 */
export function PlanningIntentForm({ initialIntention, scope, pending, error, onScope, onSubmit }: {
  initialIntention: string
  scope: PlanningScopeInput
  pending: boolean
  error: unknown
  onScope: (scope: PlanningScopeInput) => void
  onSubmit: (intention: string) => void
}) {
  const form = useForm<IntentionFields>({
    resolver: zodResolver(intentionSchema),
    defaultValues: { intention: initialIntention },
  })
  const scopeId = useId()
  const errorId = useId()
  const fieldError = form.formState.errors.intention?.message

  return (
    <form className="intent-card" onSubmit={form.handleSubmit(values => onSubmit(values.intention))} noValidate aria-busy={pending}>
      <h2 className="display-title text-[1.375rem] leading-9">
        <label htmlFor="planning-intention">روی چه چیزی می‌خواهید پیش بروید؟</label>
      </h2>
      <textarea
        id="planning-intention"
        className="intent-input min-h-36"
        maxLength={2000}
        placeholder="مثلاً: می‌خواهم تا آخر پاییز آلمانی‌ام به سطحی برسد که بتوانم در جلسه حرف بزنم…"
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? errorId : undefined}
        {...form.register('intention')}
      />
      {fieldError && <p className="field-error" id={errorId} role="alert">{fieldError}</p>}

      <ScopeChoice labelId={scopeId} scope={scope} disabled={pending} onChange={onScope} />

      <PlanningStartError error={error} />
      <button className="primary-button mt-4 min-h-13.5 w-full rounded-[1.125rem] text-[0.9375rem]" type="submit" disabled={pending}>
        <Sparkles size={20} aria-hidden="true" />
        {pending ? 'در حال ارسال…' : 'ساخت پیش‌نویس'}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
        <ShieldCheck size={15} aria-hidden="true" />
        تا خودتان تأیید نکنید، چیزی ساخته نمی‌شود.
      </p>
    </form>
  )
}

/**
 * «دربارهٔ چیزی که از قبل دارید؟»: none, or one active Goal or Project. Choosing
 * one plans inside it, exactly as opening planning from that page does.
 */
function ScopeChoice({ labelId, scope, disabled, onChange }: {
  labelId: string
  scope: PlanningScopeInput
  disabled: boolean
  onChange: (scope: PlanningScopeInput) => void
}) {
  const goals = (useGoalOptions().data?.items ?? []).filter(goal => goal.status === 'ACTIVE')
  const projects = (useProjectOptions().data?.items ?? []).filter(project => project.status === 'ACTIVE')
  const none = !scope.goalId && !scope.projectId
  if (goals.length === 0 && projects.length === 0 && none) return null

  return (
    <div className="mt-4 border-t border-border-subtle pt-4">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-extrabold" id={labelId}>
        <Link2 size={16} aria-hidden="true" />
        دربارهٔ چیزی که از قبل دارید؟
        <span className="font-semibold text-text-secondary">(اختیاری)</span>
      </p>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here. */}
      <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-labelledby={labelId}>
        <button className="scope-chip" type="button" aria-pressed={none} disabled={disabled} onClick={() => onChange({})}>
          هیچ‌کدام
        </button>
        {goals.map(goal => (
          <button
            key={goal.id}
            className="scope-chip entity-goal"
            type="button"
            aria-pressed={scope.goalId === goal.id}
            disabled={disabled}
            onClick={() => onChange({ goalId: goal.id })}
          >
            <Target size={15} className="entity-ink shrink-0" aria-hidden="true" />
            <span className="truncate">{goal.title}</span>
          </button>
        ))}
        {projects.map(project => (
          <button
            key={project.id}
            className="scope-chip entity-project"
            type="button"
            aria-pressed={scope.projectId === project.id}
            disabled={disabled}
            onClick={() => onChange({ projectId: project.id })}
          >
            <FolderKanban size={15} className="entity-ink shrink-0" aria-hidden="true" />
            <span className="truncate">{project.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
