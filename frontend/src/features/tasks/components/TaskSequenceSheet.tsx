import { useEffect, useId, useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { Lock } from '../../../shared/ui/icons'
import { FormError } from '../../../shared/ui/FormUi'
import { SelectField } from '../../../shared/ui/SelectField'
import { Sheet } from '../../../shared/ui/Sheet'
import { useChangeTaskSequence, useTaskOptions, useTaskSequencePreview } from '../hooks/task-hooks'
import type { TaskDto, TaskSequenceAction, TaskSequencePreview } from '../types/task.types'

const titles: Record<TaskSequenceAction, string> = {
  FOLLOW: 'بعد از کار دیگری',
  MOVE_EARLIER: 'یک قدم زودتر',
  MOVE_LATER: 'یک قدم دیرتر',
  MOVE_TO: 'جابه‌جایی در ترتیب',
  LEAVE: 'بیرون از ترتیب',
}

/** The Tasks a Task may follow: active, of the same Goal, Project or none, and not itself (025 §3). */
export function followCandidates(task: Pick<TaskDto, 'id' | 'goalId' | 'projectId'>, tasks: TaskDto[]) {
  return tasks.filter(item => item.id !== task.id && item.status === 'ACTIVE' &&
    (item.goalId ?? null) === (task.goalId ?? null) && (item.projectId ?? null) === (task.projectId ?? null))
}

/**
 * One change to a Task's place in a sequence (029 §9.2): «بعد از…», a step
 * earlier or later, a place it was dragged to (`after`: the step it now
 * follows, or null for the first), or out of the order. The server previews what the change
 * does, who will wait and whose place moves, and «تأیید» applies exactly
 * that preview; if anything changed meanwhile it is refused and previewed again.
 */
export function TaskSequenceSheet({ task, action, after = null, onClose }: {
  task: TaskDto
  action: TaskSequenceAction
  after?: Pick<TaskDto, 'id' | 'title'> | null
  onClose: () => void
}) {
  const options = useTaskOptions()
  const preview = useTaskSequencePreview(task.id)
  const change = useChangeTaskSequence(task.id)
  const [predecessorId, setPredecessorId] = useState('')
  const candidates = followCandidates(task, options.data?.items ?? [])
  const following = action === 'FOLLOW'
  const ask = preview.mutate
  // The step a Task is placed after: the one chosen to follow, or the one it was dragged below.
  const placedAfter = following ? predecessorId || null : action === 'MOVE_TO' ? after?.id ?? null : null

  // A move or a release is previewed at once; «بعد از…» once the Task to follow is chosen.
  useEffect(() => {
    if (!following) ask({ action, predecessorId: placedAfter })
    else if (placedAfter) ask({ action, predecessorId: placedAfter })
  }, [action, following, placedAfter, ask])

  const data = preview.data
  const steps = data?.steps ?? []
  const before = candidates.find(item => item.id === predecessorId)
  const summary = action === 'FOLLOW'
    ? before ? `«${task.title}» بعد از «${before.title}» می‌آید و تا انجام آن منتظر می‌ماند.` : undefined
    : action === 'LEAVE'
      ? `«${task.title}» از این ترتیب بیرون می‌آید و مستقل می‌شود؛ ترتیب بقیه سر جایش می‌ماند.`
      : action === 'MOVE_TO'
        ? after ? `«${task.title}» بعد از «${after.title}» انجام می‌شود.` : `«${task.title}» اولین مرحله‌ی این ترتیب می‌شود.`
        : `«${task.title}» یک قدم ${action === 'MOVE_EARLIER' ? 'زودتر' : 'دیرتر'} انجام می‌شود.`

  return (
    <Sheet title={titles[action]} entity="task" onClose={onClose} locked={change.isPending}>
      <form
        className="form-stack"
        noValidate
        aria-busy={preview.isPending || change.isPending}
        onSubmit={event => {
          event.preventDefault()
          if (!data) return
          change.mutate({ ...data, predecessorId: placedAfter }, {
            onSuccess: onClose,
            // A changed sequence is previewed again; the person confirms what is true now.
            onError: () => ask({ action, predecessorId: placedAfter }),
          })
        }}
      >
        {following && (
          candidates.length === 0
            ? <p className="notice">کار فعال دیگری با همین هدف یا پروژه نیست که این کار بعد از آن بیاید.</p>
            : (
              <SelectField
                label="بعد از کدام کار؟"
                hint="این کار تا انجام آن کار منتظر می‌ماند."
                value={predecessorId}
                options={candidates.map(item => ({ value: item.id, label: item.title }))}
                onChange={setPredecessorId}
                searchPlaceholder="نام کار…"
              />
            )
        )}
        {summary && (!following || predecessorId) && <p className="text-sm leading-7">{summary}</p>}
        {preview.isPending && <p className="text-xs text-text-secondary" role="status">در حال پیش‌نمایش…</p>}
        {data && steps.length > 0 && <SequenceSteps steps={steps} currentId={task.id} heading="ترتیب بعد از این تغییر" />}
        {data && steps.length === 0 && (
          <p className="notice">با بیرون آمدن این کار، دیگر ترتیبی نمی‌ماند و کار باقی‌مانده هم مستقل می‌شود.</p>
        )}
        <FormError error={change.error ?? preview.error} previewed />
        <div className="sheet-actions">
          <button className="secondary-button" type="button" disabled={change.isPending} onClick={onClose}>انصراف</button>
          <button className="primary-button" type="submit" disabled={!data || preview.isPending || change.isPending}>
            {change.isPending ? 'در حال ذخیره…' : 'تأیید'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

/**
 * The order a server preview describes, the Task acted on marked, and who will
 * wait. `currentTitle` names that Task when it is not created yet.
 */
export function SequenceSteps({ steps, currentId, heading, currentTitle }: {
  steps: TaskSequencePreview['steps']
  currentId: string
  heading: string
  currentTitle?: string
}) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h3 className="text-xs font-extrabold text-text-secondary" id={id}>{heading}</h3>
      <ol className="mt-2 space-y-1.5">
        {steps.map((step, index) => (
          <li
            key={step.taskId}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${step.taskId === currentId ? 'bg-entity-task/10' : 'bg-surface-sunken'}`}
            aria-current={step.taskId === currentId ? 'step' : undefined}
          >
            <span className="question-number" aria-hidden="true">{formatNumber(index + 1)}</span>
            <span className={`min-w-0 flex-1 truncate text-sm ${step.status === 'COMPLETED' ? 'text-text-secondary line-through' : 'font-bold'}`}>
              {step.taskId === currentId && currentTitle !== undefined ? currentTitle || 'این کار' : step.title}
            </span>
            {step.waits && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                <Lock size={12} aria-hidden="true" />
                منتظر می‌ماند
              </span>
            )}
            {step.changed && step.taskId !== currentId && <span className="sr-only">جایش عوض می‌شود</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}
