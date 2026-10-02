import { Plus, Repeat } from 'lucide-react'
import { useState } from 'react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SegmentedControl, type StatusFilter, statusFilterOptions } from '../../../shared/ui/SegmentedControl'
import { LoadMoreButton, ResourceState } from '../../../shared/ui/StateUi'
import { useRoutines } from '../hooks/routine-hooks'
import { RoutineCard } from './RoutineCard'

/** Routines list page: filter, list and the entry point to creating a Routine. */
export function RoutinesPage() {
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE')
  const routines = useRoutines(filter === 'all' ? undefined : filter)
  const openCreate = useUiStore(state => state.openCreate)
  const items = routines.data?.pages.flatMap(page => page.items) ?? []

  return (
    <div className="page">
      <PageHeader
        title="روتین‌ها"
        description="کارهایی که تکرار می‌شوند. هر روتین در روزها و ساعت‌های خودش در «امروز» دیده می‌شود."
        action={(
          <button className="primary-button shrink-0" type="button" onClick={() => openCreate('routine')}>
            <Plus size={20} aria-hidden="true" />
            روتین جدید
          </button>
        )}
      />
      <div className="mb-5 flex items-center gap-3">
        <SegmentedControl label="فیلتر وضعیت روتین‌ها" value={filter} options={statusFilterOptions} onChange={setFilter} />
        {routines.isFetching && !routines.isPending && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
      </div>
      <ResourceState
        pending={routines.isPending}
        error={routines.error}
        empty={items.length === 0}
        pendingText="در حال دریافت روتین‌ها…"
        emptyIcon={Repeat}
        emptyTitle={filter === 'ACTIVE' ? 'روتین فعالی ندارید.' : 'هنوز روتینی نساخته‌اید.'}
        emptyDescription="کاری را که می‌خواهید مرتب تکرار شود، با روزها و ساعت‌هایش ثبت کنید."
        emptyAction={<button className="secondary-button" type="button" onClick={() => openCreate('routine')}>ثبت یک روتین</button>}
        onRetry={() => routines.refetch()}
      >
        <ul className="space-y-3">
          {items.map(routine => <li key={routine.id}><RoutineCard routine={routine} /></li>)}
        </ul>
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
