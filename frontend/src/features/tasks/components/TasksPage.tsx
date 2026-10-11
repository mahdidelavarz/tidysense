import { addDays } from 'date-fns-jalali'
import { ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'
import { formatNumber, toIsoDate } from '../../../shared/lib/date'
import { useUiStore } from '../../../shared/lib/ui-store'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SegmentedControl, type StatusFilter, statusFilterOptions } from '../../../shared/ui/SegmentedControl'
import { LoadMoreButton, ResourceState } from '../../../shared/ui/StateUi'
import { useTaskParentTitle, useTasks } from '../hooks/task-hooks'
import type { TaskDto } from '../types/task.types'
import { TaskCard } from './TaskCard'

/** The time buckets of the list, in the order they are shown. Wording stays neutral: an earlier date is a fact, not a failure. */
const groups = [
  { id: 'today', label: 'امروز' },
  { id: 'earlier', label: 'از روزهای قبل' },
  { id: 'tomorrow', label: 'فردا' },
  { id: 'later', label: 'روزهای بعد' },
  { id: 'none', label: 'بدون تاریخ' },
  { id: 'closed', label: 'پایان‌یافته' },
] as const

type GroupId = typeof groups[number]['id']

/** Tasks list page: filter, the list grouped by when each Task is planned, and the entry point to creating a Task. */
export function TasksPage() {
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE')
  const tasks = useTasks(filter === 'all' ? undefined : filter)
  const openCreate = useUiStore(state => state.openCreate)
  const parentTitle = useTaskParentTitle()
  const items = tasks.data?.pages.flatMap(page => page.items) ?? []
  const today = toIsoDate(new Date())
  const tomorrow = toIsoDate(addDays(new Date(), 1))
  const groupOf = (task: TaskDto): GroupId => {
    if (task.status !== 'ACTIVE') return 'closed'
    if (!task.plannedDate) return 'none'
    if (task.plannedDate === today) return 'today'
    if (task.plannedDate === tomorrow) return 'tomorrow'
    return task.plannedDate < today ? 'earlier' : 'later'
  }

  return (
    <div className="page">
      <PageHeader
        title="کارها"
        description="اقدام‌های روشن و مشخص. هر کار زیر یک هدف یا پروژه است، یا مستقل با یک تاریخ."
        action={(
          <button className="primary-button shrink-0" type="button" onClick={() => openCreate('task')}>
            <Plus size={20} aria-hidden="true" />
            کار جدید
          </button>
        )}
      />
      <div className="mb-6 flex items-center gap-3">
        <SegmentedControl label="فیلتر وضعیت کارها" value={filter} options={statusFilterOptions} onChange={setFilter} />
        {tasks.isFetching && !tasks.isPending && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
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
        <div className="space-y-8">
          {groups.map(group => {
            // The server's order is kept inside each bucket.
            const members = items.filter(task => groupOf(task) === group.id)
            if (members.length === 0) return null
            return (
              <section key={group.id} aria-labelledby={`tasks-${group.id}`}>
                <h2 className="section-title flex items-center gap-2" id={`tasks-${group.id}`}>
                  {group.label}
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs" aria-hidden="true">{formatNumber(members.length)}</span>
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {members.map(task => (
                    <li key={task.id}><TaskCard task={task} today={today} parentTitle={parentTitle(task)} /></li>
                  ))}
                </ul>
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
