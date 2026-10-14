import { Link } from '@tanstack/react-router'
import { CalendarClock, Check, LoaderCircle, Lock, Trash2 } from '../../../shared/ui/icons'
import { TaskNote, TaskParent } from '../../tasks/components/TaskFacts'
import type { TaskDto } from '../../tasks/types/task.types'
import { SwipeActions } from './SwipeActions'

/**
 * One Task in Today's timeline. The node is its completion ring (a lock while
 * it waits for earlier steps, a filled ring once done today); the card opens
 * the Task. Moving it to another day and dropping it are the card's hidden
 * actions. `onComplete` is absent when the row only previews another day.
 */
export function TodayTaskCard({ task, today, parentTitle, completing = false, onComplete, onCarry, onDrop }: {
  task: TaskDto
  /** Today's ISO local date, for how close the deadline is. */
  today: string
  /** Title of the Goal or Project the Task belongs to, when it is known. */
  parentTitle?: string
  completing?: boolean
  onComplete?: () => void
  onCarry: () => void
  onDrop: () => void
}) {
  const done = task.status === 'COMPLETED'
  const state = done ? 'done' : task.isBlocked ? 'waiting' : undefined

  const card = (more?: React.ReactNode) => (
    <div className="timeline-card" data-state={state}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="timeline-title">
          <Link className="stretched-link" to="/tasks/$taskId" params={{ taskId: task.id }}>{task.title}</Link>
        </h3>
        <span className="flex shrink-0 items-center gap-1">
          {!done && <TaskNote task={task} today={today} />}
          {more}
        </span>
      </div>
      <TaskParent task={task} parentTitle={parentTitle} />
      {task.isBlocked && (
        <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-text-secondary">
          <Lock size={13} className="mt-0.75 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-bold text-text-primary">منتظر کارهای پیشین</span>
            {task.blockedBy.length > 0 && `: ${task.blockedBy.map(blocker => blocker.title).join('، ')}`}
          </span>
        </p>
      )}
    </div>
  )

  return (
    <li className="timeline-row">
      <div className="timeline-node">
        <span className="timeline-mark">
          {done ? (
            <span className="ring-done" role="img" aria-label="انجام شد"><Check size={14} /></span>
          ) : task.isBlocked ? (
            <span className="ring-lock" role="img" aria-label="منتظر کارهای پیشین"><Lock size={13} /></span>
          ) : onComplete ? (
            <button
              className="ring-button"
              type="button"
              aria-label={`تکمیل کار: ${task.title}`}
              disabled={completing}
              onClick={onComplete}
            >
              {completing
                ? <LoaderCircle size={20} className="animate-spin text-entity-task" aria-hidden="true" />
                : <span aria-hidden="true" />}
            </button>
          ) : (
            <span className="ring-planned" aria-hidden="true" />
          )}
        </span>
      </div>
      {done ? card() : (
        <SwipeActions
          label={task.title}
          actionCount={2}
          actions={(
            <>
              <button className="swipe-action" data-tone="task" type="button" onClick={onCarry}>
                <CalendarClock size={20} aria-hidden="true" />
                روز دیگر
              </button>
              <button className="swipe-action" data-tone="danger" type="button" onClick={onDrop}>
                <Trash2 size={20} aria-hidden="true" />
                کنار بگذار
              </button>
            </>
          )}
        >
          {card}
        </SwipeActions>
      )}
    </li>
  )
}
