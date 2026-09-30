import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { ResourceState } from '../../../shared/ui/StateUi'
import { listGoals } from '../../goals/services/goals-api'
import { formatDate, goalKeys, projectKeys } from '../../parents/components/ParentDashboard'
import { listProjects } from '../../projects/services/projects-api'
import { TaskForm } from './TaskForm'
import { createTask, listTasks, taskKeys, todayKey } from '../services/tasks-api'

export function TaskWorkspace() {
  const client = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const tasks = useInfiniteQuery({
    queryKey: taskKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listTasks(undefined, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
  const taskOptions = useQuery({ queryKey: taskKeys.options, queryFn: () => listTasks(undefined, undefined, 100) })
  const goals = useQuery({ queryKey: goalKeys.options, queryFn: () => listGoals(undefined, undefined, 100) })
  const projects = useQuery({ queryKey: projectKeys.all, queryFn: () => listProjects(undefined, undefined, 100) })
  const create = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      setFormOpen(false)
      await Promise.all([
        client.invalidateQueries({ queryKey: taskKeys.all }),
        client.invalidateQueries({ queryKey: todayKey }),
      ])
    },
  })
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
          onSubmit={request => create.mutate(request)}
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
          {items.map(task => (
            <li key={task.id}>
              <Link className="resource-card entity-task h-full" to="/tasks/$taskId" params={{ taskId: task.id }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <EntityLabel entity="task" />
                    <h2 className="mt-2 truncate text-lg font-bold leading-snug">{task.title}</h2>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                {task.description && <p className="mt-3 line-clamp-2 text-sm leading-7 text-text-secondary">{task.description}</p>}
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-subtle pt-3 text-xs text-text-secondary">
                  <span>{ownerLabel(task)}</span>
                  <span>برنامه: {formatDate(task.plannedDate)}</span>
                  {task.isBlocked && <span className="font-bold text-text-primary">مسدود</span>}
                </div>
              </Link>
            </li>
          ))}
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

function ownerLabel(task: { goalId: string | null; projectId: string | null }) {
  if (task.projectId) return 'وابسته به پروژه'
  if (task.goalId) return 'وابسته به هدف'
  return 'مستقل'
}
