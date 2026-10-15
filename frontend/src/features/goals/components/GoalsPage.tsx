import { Link } from '@tanstack/react-router'
import { CalendarClock, ChevronDown, ChevronLeft, CircleCheck, Plus, Target } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatNumber, toIsoDate } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import { PhotoHero } from '../../../shared/ui/PhotoHero'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { AccountButton } from '../../shell/components/AccountButton'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { soonest } from '../../structure/components/ProgressFacts'
import { StructureSwitch } from '../../structure/components/StructureSwitch'
import { useProgress } from '../../structure/hooks/progress-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useGoalOptions } from '../hooks/goal-hooks'
import { useIsDesktop } from '../../../shared/lib/use-desktop'
import { GoalCard } from './GoalCard'
import { GoalsDesk } from './GoalsDesk'

/**
 * Goals: the Goals view of the one Goals-and-Projects place. Goals in
 * progress, each with what is under it and how far it has come; the Goal
 * whose review is nearest offered on the photograph; finished Goals folded
 * at the foot.
 */
export function GoalsPage() {
  return useIsDesktop() ? <GoalsDesk /> : <GoalsPhone />
}

function GoalsPhone() {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const progress = useProgress()
  const openCreate = useUiStore(state => state.openCreate)
  const [showClosed, setShowClosed] = useState(false)
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  const items = goals.data?.items ?? []
  const active = items.filter(goal => goal.status === 'ACTIVE')
  const closed = items.filter(goal => goal.status !== 'ACTIVE')
  const review = soonest(active, goal => goal.reviewDate, today)

  return (
    <div className="page page-sky">
      <PhotoHero
        title="هدف‌ها"
        end={(
          <>
            <button className="hero-action" type="button" onClick={() => openCreate('goal')}>
              <Plus size={20} aria-hidden="true" />
              هدف جدید
            </button>
            <AccountButton />
          </>
        )}
        below={(
          <StructureSwitch
            current="goals"
            goals={goals.data ? active.length : undefined}
            projects={projects.data?.items.filter(project => project.status === 'ACTIVE').length}
          />
        )}
      >
        {review && (
          <Link className="glass-card" to="/goals/$goalId" params={{ goalId: review.item.id }}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.8125rem] bg-white/92 text-[#1c2e34]" aria-hidden="true"><CalendarClock size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-extrabold">بازبینی «{review.item.title}»</span>
              <span className="block truncate text-xs text-white/90">
                {review.days <= 0 ? 'زمانش رسیده است' : `موعدش ${formatNumber(review.days)} روز دیگر است`}: ادامه، تغییر یا پایان
              </span>
            </span>
            <ChevronLeft size={20} className="shrink-0" aria-hidden="true" />
          </Link>
        )}
      </PhotoHero>

      {goals.isPending ? <LoadingState text="در حال دریافت هدف‌ها…" />
        : goals.isError ? <ErrorState onRetry={() => goals.refetch()} />
          : items.length === 0 ? (
            <EmptyState
              icon={Target}
              title="هنوز هدفی نساخته‌اید."
              description="نتیجه مهمی را که می‌خواهید به آن برسید ثبت کنید."
              action={<button className="secondary-button" type="button" onClick={() => openCreate('goal')}>ثبت یک هدف</button>}
            />
          ) : (
            <div className="space-y-6">
              {active.length > 0 && (
                <section aria-labelledby="goals-active">
                  <h2 className="list-heading">
                    <span id="goals-active">در جریان</span>
                    <span className="count-pill" aria-hidden="true">{formatNumber(active.length)}</span>
                  </h2>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {active.map(goal => (
                      <li key={goal.id}>
                        <GoalCard goal={goal} today={today} progress={progress.data?.goals.find(item => item.goalId === goal.id)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {closed.length > 0 && (
                <section aria-label="هدف‌های پایان‌یافته">
                  <FoldedGroup
                    open={showClosed}
                    onToggle={() => setShowClosed(value => !value)}
                    id="goals-closed"
                    label="پایان‌یافته"
                    detail={[
                      closed.some(goal => goal.status === 'ACHIEVED') && `${formatNumber(closed.filter(goal => goal.status === 'ACHIEVED').length)} محقق‌شده`,
                      closed.some(goal => goal.status === 'ABANDONED') && `${formatNumber(closed.filter(goal => goal.status === 'ABANDONED').length)} رهاشده`,
                    ].filter(Boolean).join('، ')}
                  />
                  <ul className="mt-3 grid gap-3 md:grid-cols-2" id="goals-closed" hidden={!showClosed}>
                    {closed.map(goal => (
                      <li key={goal.id}>
                        <GoalCard goal={goal} today={today} progress={progress.data?.goals.find(item => item.goalId === goal.id)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
    </div>
  )
}

/** A dashed row that unfolds a group kept out of the way, such as finished items. */
export function FoldedGroup({ open, onToggle, id, label, detail }: {
  open: boolean
  onToggle: () => void
  id: string
  label: string
  detail: string
}) {
  return (
    <button
      className="flex min-h-14 w-full items-center gap-2.5 rounded-[1.25rem] border border-dashed border-border px-4 text-start"
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={onToggle}
    >
      <CircleCheck size={20} className="text-text-secondary" aria-hidden="true" />
      <span className="font-extrabold">{label}</span>
      <span className="text-xs text-text-secondary">{detail}</span>
      <ChevronDown size={18} className={`ms-auto text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  )
}
