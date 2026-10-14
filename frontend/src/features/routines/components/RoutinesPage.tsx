import { ChevronDown, Pause, Plus, Repeat } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatLongDate, formatNumber, toIsoDate } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { LoadMoreButton, ResourceState } from '../../../shared/ui/StateUi'
import { useTaskParentTitle } from '../../tasks/hooks/task-hooks'
import { useToday } from '../../today/hooks/today-hooks'
import { useRoutineWeek, useRoutines } from '../hooks/routine-hooks'
import type { RoutineDto } from '../types/routine.types'
import { RoutineCard } from './RoutineCard'

/**
 * Routines list page: the active Routines split by whether they have slots
 * today, each with this week as bars, and the stopped ones folded away at the
 * foot. Creating is the create button's (and, on desktop, the page's own).
 */
export function RoutinesPage() {
  const routines = useRoutines()
  const week = useRoutineWeek()
  const todayView = useToday()
  const openCreate = useUiStore(state => state.openCreate)
  const [showStopped, setShowStopped] = useState(false)
  // Task and Routine share the exclusive Goal-or-Project parent, so they share its title lookup.
  const parentTitle = useTaskParentTitle()
  const items = routines.data?.pages.flatMap(page => page.items) ?? []
  const today = todayView.data?.localDate ?? toIsoDate(new Date())
  const occurrences = todayView.data?.routineOccurrences ?? []
  const slotsOf = (routine: RoutineDto) => occurrences.filter(occurrence => occurrence.routineId === routine.id)
  const active = items.filter(routine => routine.status === 'ACTIVE')
  const stopped = items.filter(routine => routine.status !== 'ACTIVE')
  const due = active.filter(routine => slotsOf(routine).length > 0)
  const free = active.filter(routine => slotsOf(routine).length === 0)

  const card = (routine: RoutineDto) => (
    <li key={routine.id}>
      <RoutineCard
        routine={routine}
        parentTitle={parentTitle(routine)}
        week={week.data?.routines.find(item => item.routineId === routine.id)}
        today={today}
        slots={slotsOf(routine)}
      />
    </li>
  )

  return (
    <div className="page">
      <PageHeader
        title="روتین‌ها"
        description={!routines.hasNextPage && active.length > 0
          ? `${formatNumber(active.length)} روتین فعال، ${formatNumber(occurrences.length)} نوبت امروز`
          : undefined}
        action={(
          <button className="primary-button hidden shrink-0 lg:inline-flex" type="button" onClick={() => openCreate('routine')}>
            <Plus size={20} aria-hidden="true" />
            روتین جدید
          </button>
        )}
      />
      <ResourceState
        pending={routines.isPending}
        error={routines.error}
        empty={items.length === 0}
        pendingText="در حال دریافت روتین‌ها…"
        emptyIcon={Repeat}
        emptyTitle="هنوز روتینی نساخته‌اید."
        emptyDescription="کاری را که می‌خواهید مرتب تکرار شود، با روزها و ساعت‌هایش ثبت کنید."
        emptyAction={<button className="secondary-button" type="button" onClick={() => openCreate('routine')}>ثبت یک روتین</button>}
        onRetry={() => routines.refetch()}
      >
        <div className="space-y-6">
          {due.length > 0 && (
            <section aria-labelledby="routines-due">
              <h2 className="list-heading">
                <span id="routines-due">امروز نوبت دارند</span>
                <span className="count-pill" aria-hidden="true">{formatNumber(due.length)}</span>
                <span className="text-xs font-semibold text-text-secondary">{formatLongDate(today)}</span>
              </h2>
              <ul className="space-y-3">{due.map(card)}</ul>
            </section>
          )}
          {free.length > 0 && (
            <section aria-labelledby="routines-free">
              <h2 className="list-heading">
                <span id="routines-free">امروز نوبت ندارند</span>
                <span className="count-pill" aria-hidden="true">{formatNumber(free.length)}</span>
              </h2>
              <ul className="space-y-3">{free.map(card)}</ul>
            </section>
          )}
          {stopped.length > 0 && (
            <section aria-label="روتین‌های متوقف‌شده">
              <button
                className="flex min-h-14 w-full items-center gap-2.5 rounded-[1.25rem] border border-dashed border-border px-4 text-start"
                type="button"
                aria-expanded={showStopped}
                aria-controls="routines-stopped"
                onClick={() => setShowStopped(value => !value)}
              >
                <Pause size={20} className="text-text-secondary" aria-hidden="true" />
                <span className="font-extrabold">متوقف‌شده</span>
                <span className="text-xs text-text-secondary">{formatNumber(stopped.length)} روتین</span>
                <ChevronDown size={18} className={`ms-auto text-text-tertiary transition-transform ${showStopped ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <ul className="mt-3 space-y-3" id="routines-stopped" hidden={!showStopped}>{stopped.map(card)}</ul>
            </section>
          )}
        </div>
        <LoadMoreButton
          visible={routines.hasNextPage}
          loading={routines.isFetchingNextPage}
          label="نمایش روتین‌های بیشتر"
          onClick={() => routines.fetchNextPage()}
        />
      </ResourceState>
    </div>
  )
}
