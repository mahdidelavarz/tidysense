import { Plus, Target } from 'lucide-react'
import { useState } from 'react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SegmentedControl, type StatusFilter, statusFilterOptions } from '../../../shared/ui/SegmentedControl'
import { LoadMoreButton, ResourceState } from '../../../shared/ui/StateUi'
import { useGoals } from '../hooks/goal-hooks'
import { GoalCard } from './GoalCard'

/** Goals list page: filter, list and the entry point to creating a Goal. */
export function GoalsPage() {
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE')
  const goals = useGoals(filter === 'all' ? undefined : filter)
  const openCreate = useUiStore(state => state.openCreate)
  const items = goals.data?.pages.flatMap(page => page.items) ?? []

  return (
    <div className="page-wide">
      <PageHeader
        title="هدف‌ها"
        description="نتیجه‌ها و جهت‌هایی که برایتان مهم است. تحقق هر هدف را خودتان تأیید می‌کنید."
        action={(
          <button className="primary-button shrink-0" type="button" onClick={() => openCreate('goal')}>
            <Plus size={20} aria-hidden="true" />
            هدف جدید
          </button>
        )}
      />
      <div className="mb-5 flex items-center gap-3">
        <SegmentedControl label="فیلتر وضعیت هدف‌ها" value={filter} options={statusFilterOptions} onChange={setFilter} />
        {goals.isFetching && !goals.isPending && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
      </div>
      <ResourceState
        pending={goals.isPending}
        error={goals.error}
        empty={items.length === 0}
        pendingText="در حال دریافت هدف‌ها…"
        emptyIcon={Target}
        emptyTitle={filter === 'ACTIVE' ? 'هدف فعالی ندارید.' : 'هنوز هدفی نساخته‌اید.'}
        emptyDescription="نتیجه مهمی را که می‌خواهید به آن برسید ثبت کنید."
        emptyAction={<button className="secondary-button" type="button" onClick={() => openCreate('goal')}>ثبت یک هدف</button>}
        onRetry={() => goals.refetch()}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(goal => <li key={goal.id}><GoalCard goal={goal} /></li>)}
        </ul>
        <LoadMoreButton
          visible={goals.hasNextPage}
          loading={goals.isFetchingNextPage}
          label="نمایش هدف‌های بیشتر"
          onClick={() => goals.fetchNextPage()}
        />
      </ResourceState>
    </div>
  )
}
