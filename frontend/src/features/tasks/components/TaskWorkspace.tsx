import { useState } from 'react'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { ResourceState } from '../../../shared/ui/StateUi'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { useCreateTask, useTaskOptions, useTasks } from '../hooks/task-hooks'
import { TaskCard } from './TaskCard'
import { TaskForm } from './TaskForm'

/** Tasks workspace page: list, create form and pagination. */
export function TaskWorkspace() {
  const [formOpen, setFormOpen] = useState(false)
  const tasks = useTasks()
  const taskOptions = useTaskOptions()
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const create = useCreateTask()
  const items = tasks.data?.pages.flatMap(page => page.items) ?? []

  return (
    <div className="page-container space-y-7">
      <header className="page-header entity-surface entity-task">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <EntityLabel entity="task" />
            <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">کارها</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
              اقدام‌های روشن را زیر هدف یا پروژه نگه دارید، یا با یک تاریخ مشخص به‌صورت مستقل برنامه‌ریزی کنید.
            </p>
          </div>
          <button className="primary-button w-full sm:w-auto" type="button" onClick={() => setFormOpen(value => !value)}>
            {formOpen ? 'بستن فرم' : 'کار جدید'}
          </button>
        </div>
      </header>

      {formOpen && (
        <TaskForm
          goals={goals.data?.items ?? []}
          projects={projects.data?.items ?? []}
          tasks={taskOptions.data?.items ?? []}
          pending={create.isPending}
          error={create.error}
          onSubmit={request => create.mutate(request, { onSuccess: () => setFormOpen(false) })}
        />
      )}

      <ResourceState
        pending={tasks.isPending}
        error={tasks.error}
        empty={items.length === 0}
        pendingText="در حال دریافت کارها…"
        emptyTitle="هنوز کاری نساخته‌اید."
        emptyDescription="اولین اقدام روشن را برای یک هدف، پروژه یا تاریخ مشخص ثبت کنید."
        emptyAction={formOpen ? undefined : <button className="secondary-button" type="button" onClick={() => setFormOpen(true)}>ساخت کار</button>}
        onRetry={() => tasks.refetch()}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(task => <li key={task.id}><TaskCard task={task} /></li>)}
        </ul>
        {tasks.hasNextPage && (
          <button
            className="secondary-button mt-5 w-full sm:w-auto"
            type="button"
            disabled={tasks.isFetchingNextPage}
            onClick={() => tasks.fetchNextPage()}
          >
            {tasks.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش کارهای بیشتر'}
          </button>
        )}
      </ResourceState>
    </div>
  )
}
