import { addDays } from 'date-fns-jalali'
import { Filter, ListChecks, Plus } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatLongDate, formatNumber, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { showToast, useUiStore } from '../../../shared/lib/ui-store'
import { FormError } from '../../../shared/ui/FormUi'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SegmentedControl, type StatusFilter, statusFilterOptions } from '../../../shared/ui/SegmentedControl'
import { LoadMoreButton, ResourceState } from '../../../shared/ui/StateUi'
import { useToday } from '../../today/hooks/today-hooks'
import { useCompleteTask, useTaskParentTitle, useTasks } from '../hooks/task-hooks'
import { TaskCard, type TaskGroup, taskGroup } from './TaskCard'

/** The time buckets of the list, in the order they are shown. Wording stays neutral: an earlier date is a fact, not a failure. */
const groups: ReadonlyArray<{ id: TaskGroup; label: string }> = [
  { id: 'today', label: 'امروز' },
  { id: 'earlier', label: 'از روزهای قبل' },
  { id: 'tomorrow', label: 'فردا' },
  { id: 'later', label: 'روزهای بعد' },
  { id: 'none', label: 'بدون تاریخ' },
  { id: 'closed', label: 'پایان‌یافته' },
]

/**
 * Tasks list page: one timeline grouped by when each Task is planned, each
 * completed from its ring or opened from its card. The status filter sits
 * behind the filter button; creating is the create button's (and, on
 * desktop, the page's own button).
 */
export function TasksPage() {
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE')
  const [filtering, setFiltering] = useState(false)
  const tasks = useTasks(filter === 'all' ? undefined : filter)
  const complete = useCompleteTask()
  const openCreate = useUiStore(state => state.openCreate)
  const parentTitle = useTaskParentTitle()
  const items = tasks.data?.pages.flatMap(page => page.items) ?? []
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  const tomorrow = toIsoDate(addDays(parseIsoDate(today), 1))
  const open = items.filter(task => task.status === 'ACTIVE')
  const dates: Partial<Record<TaskGroup, string>> = {
    today: formatLongDate(today),
    tomorrow: formatLongDate(tomorrow),
    none: 'هر وقت فرصت شد',
  }

  return (
    <div className="page">
      <PageHeader
        title="کارها"
        description={!tasks.hasNextPage && open.length > 0
          ? `${formatNumber(open.length)} کار باز، ${formatNumber(open.filter(task => task.plannedDate === today).length)} تا برای امروز`
          : undefined}
        action={(
          <>
            <button className="primary-button hidden shrink-0 lg:inline-flex" type="button" onClick={() => openCreate('task')}>
              <Plus size={20} aria-hidden="true" />
              کار جدید
            </button>
            <button
              className="account-button relative"
              type="button"
              aria-label="فیلتر"
              aria-expanded={filtering}
              aria-controls="tasks-filter"
              onClick={() => setFiltering(value => !value)}
            >
              <Filter size={20} aria-hidden="true" />
              {filter !== 'ACTIVE' && <span className="absolute top-2 left-2 size-2 rounded-full bg-entity-task" aria-hidden="true" />}
            </button>
          </>
        )}
      />
      <div id="tasks-filter" className="mb-5 flex items-center gap-3" hidden={!filtering}>
        <SegmentedControl label="فیلتر وضعیت کارها" value={filter} options={statusFilterOptions} onChange={setFilter} />
        {tasks.isFetching && !tasks.isPending && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
      </div>
      <div className="mb-4">
        <FormError error={complete.error} />
      </div>
      <ResourceState
        pending={tasks.isPending}
        error={tasks.error}
        empty={items.length === 0}
        pendingText="در حال دریافت کارها…"
        emptyIcon={ListChecks}
        emptyTitle={filter === 'ACTIVE' ? 'کار فعالی ندارید.' : 'هنوز کاری نساخته‌اید.'}
        emptyDescription="اولین اقدام روشن را برای یک هدف، پروژه یا تاریخ مشخص ثبت کنید."
        emptyAction={<button className="secondary-button" type="button" onClick={() => openCreate('task')}>ثبت یک کار</button>}
        onRetry={() => tasks.refetch()}
      >
        <div className="timeline-page">
          {groups.map(group => {
            // The server's order is kept inside each bucket.
            const members = items.filter(task => taskGroup(task, today, tomorrow) === group.id)
            if (members.length === 0) return null
            return (
              <section key={group.id} aria-labelledby={`tasks-${group.id}`}>
                <h2 className="timeline-head" data-today={group.id === 'today'}>
                  <span className="timeline-head-dot" aria-hidden="true" />
                  <span className="timeline-head-label" id={`tasks-${group.id}`}>{group.label}</span>
                  <span className="count-pill" aria-hidden="true">{formatNumber(members.length)}</span>
                  {dates[group.id] && <span className="text-xs font-semibold text-text-tertiary">{dates[group.id]}</span>}
                </h2>
                <ol className="timeline">
                  {members.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      group={group.id}
                      today={today}
                      parentTitle={parentTitle(task)}
                      completing={complete.isPending && complete.variables?.taskId === task.id}
                      onComplete={() => complete.mutate(
                        { taskId: task.id, expectedVersion: Number(task.version), completedForLocalDate: today },
                        { onSuccess: () => showToast('کار انجام شد.') },
                      )}
                    />
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
        <LoadMoreButton
          visible={tasks.hasNextPage}
          loading={tasks.isFetchingNextPage}
          label="نمایش کارهای بیشتر"
          onClick={() => tasks.fetchNextPage()}
        />
      </ResourceState>
    </div>
  )
}
