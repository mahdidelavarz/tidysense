import { ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SegmentedControl, type StatusFilter, statusFilterOptions } from '../../../shared/ui/SegmentedControl'
import { LoadMoreButton, ResourceState } from '../../../shared/ui/StateUi'
import { useTasks } from '../hooks/task-hooks'
import { TaskCard } from './TaskCard'

/** Tasks list page: filter, list and the entry point to creating a Task. */
export function TasksPage() {
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE')
  const tasks = useTasks(filter === 'all' ? undefined : filter)
  const openCreate = useUiStore(state => state.openCreate)
  const items = tasks.data?.pages.flatMap(page => page.items) ?? []

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
      <div className="mb-5 flex items-center gap-3">
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
        <ul className="space-y-3">
          {items.map(task => <li key={task.id}><TaskCard task={task} /></li>)}
        </ul>
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
