import { useState } from 'react'
import { SectionHeading } from '../../../shared/ui/SectionHeading'
import { ResourceState } from '../../../shared/ui/StateUi'
import { useCreateGoal, useGoals } from '../hooks/goal-hooks'
import { GoalCard } from './GoalCard'
import { GoalCreateForm } from './GoalCreateForm'

/** Self-contained Goals section of the workspace dashboard: list, create form and pagination. */
export function GoalsPanel() {
  const [formOpen, setFormOpen] = useState(false)
  const goals = useGoals()
  const create = useCreateGoal()
  const items = goals.data?.pages.flatMap(page => page.items) ?? []

  return (
    <section aria-labelledby="goals-heading" className="space-y-5">
      <SectionHeading
        id="goals-heading"
        title="هدف‌ها"
        description="نتیجه‌ها و جهت‌هایی که خودتان تحقق آن‌ها را تأیید می‌کنید."
        fetching={goals.isFetching && !goals.isPending}
        actionLabel={formOpen ? 'بستن فرم' : 'هدف جدید'}
        onAction={() => setFormOpen(value => !value)}
      />
      {formOpen && (
        <GoalCreateForm
          pending={create.isPending}
          error={create.error}
          onSubmit={request => create.mutate(request, { onSuccess: () => setFormOpen(false) })}
        />
      )}
      <ResourceState
        pending={goals.isPending}
        error={goals.error}
        empty={items.length === 0}
        pendingText="در حال دریافت هدف‌ها…"
        emptyTitle="هنوز هدفی نساخته‌اید."
        emptyDescription="اولین نتیجه مهمی را که می‌خواهید به آن برسید ثبت کنید."
        emptyAction={formOpen ? undefined : <button className="secondary-button" type="button" onClick={() => setFormOpen(true)}>ساخت هدف</button>}
        onRetry={() => goals.refetch()}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(goal => <li key={goal.id}><GoalCard goal={goal} /></li>)}
        </ul>
        {goals.hasNextPage && (
          <button
            className="secondary-button mt-5 w-full sm:w-auto"
            type="button"
            disabled={goals.isFetchingNextPage}
            onClick={() => goals.fetchNextPage()}
          >
            {goals.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش هدف‌های بیشتر'}
          </button>
        )}
      </ResourceState>
    </section>
  )
}
