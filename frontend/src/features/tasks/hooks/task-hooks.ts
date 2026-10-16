import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { reconcileKeys } from '../../reconcile/hooks/reconcile-hooks'
import { progressKey } from '../../structure/hooks/progress-hooks'
import { todayKey } from '../../today/hooks/today-hooks'
import {
  carryTask, changeTaskSequence, completeTask, createTask, dropTask, getTask, listTasks, previewNewTaskSequence, previewTaskSequence,
  restoreTask, undoCompleteTask, updateTask,
} from '../services/tasks-api'
import type {
  CreateTaskRequest, NewTaskSequencePreviewRequest, TaskDto, TaskSequenceAction, TaskSequencePreview, UpdateTaskRequest,
} from '../types/task.types'

/** Query key factory for Task queries. The single source of truth other Task hooks and mutations invalidate against. */
export const taskKeys = {
  all: ['tasks'] as const,
  list: ['tasks', 'list'] as const,
  /** Unpaginated lookup list used by the sequence-predecessor select. */
  options: ['tasks', 'options'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
}

/** Cursor-paginated Task list for the Tasks workspace, loaded one page at a time. */
export function useTasks(status?: string) {
  return useInfiniteQuery({
    // The filter is part of the key, so every variant is still invalidated by the `list` prefix.
    queryKey: [...taskKeys.list, status ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listTasks(status, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
}

/** Flat, unpaginated Task list used to offer same-scope predecessors for the sequence select. */
export function useTaskOptions() {
  return useQuery({ queryKey: taskKeys.options, queryFn: () => listTasks(undefined, undefined, 100) })
}

/** Looks up the title of a Task's Goal or Project for its badge. Until the lists arrive the badge names only the kind. */
export function useTaskParentTitle() {
  const goals = useGoalOptions().data?.items
  const projects = useProjectOptions().data?.items
  return (task: Pick<TaskDto, 'goalId' | 'projectId'>) => task.projectId
    ? projects?.find(project => project.id === task.projectId)?.title
    : task.goalId ? goals?.find(goal => goal.id === task.goalId)?.title : undefined
}

/** Fetches one Task for the Task detail page. */
export function useTask(id: string) {
  return useQuery({ queryKey: taskKeys.detail(id), queryFn: () => getTask(id) })
}

/** Creates a Task and refreshes the Task lists and Today (a new dated Task may appear there). */
export function useCreateTask() {
  const client = useQueryClient()
  return useMutation({
    // Wrapped (not passed by reference) so TanStack Query's internal
    // mutation context argument never reaches the plain HTTP function.
    mutationFn: (request: CreateTaskRequest) => createTask(request),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: taskKeys.all }),
        client.invalidateQueries({ queryKey: todayKey }),
        client.invalidateQueries({ queryKey: reconcileKeys.all }),
      ])
    },
  })
}

/**
 * Every Task lifecycle mutation (update/carry/drop/restore/complete) returns
 * the new authoritative TaskDto and must: cache it at its detail key, and
 * invalidate the list/options/Today/Reconcile queries it can affect. Shared
 * here so each mutation hook below stays a one-line `onSuccess`.
 */
function useTaskCacheSync() {
  const client = useQueryClient()
  return useCallback(async (task: TaskDto) => {
    client.setQueryData(taskKeys.detail(task.id), task)
    await Promise.all([
      client.invalidateQueries({ queryKey: taskKeys.list }),
      client.invalidateQueries({ queryKey: taskKeys.options }),
      client.invalidateQueries({ queryKey: todayKey }),
      client.invalidateQueries({ queryKey: reconcileKeys.all }),
      client.invalidateQueries({ queryKey: progressKey }),
    ])
  }, [client])
}

/** Carries a dated Task to another planned date. Later Tasks of its sequence stay where they are. */
export function useCarryTask(taskId: string) {
  const sync = useTaskCacheSync()
  return useMutation({
    mutationFn: ({ expectedVersion, plannedDate }: { expectedVersion: number; plannedDate: string }) =>
      carryTask(taskId, expectedVersion, plannedDate),
    onSuccess: sync,
  })
}

/** Updates a Task's editable fields under an optimistic version check. */
export function useUpdateTask(taskId: string) {
  const sync = useTaskCacheSync()
  return useMutation({
    mutationFn: (request: UpdateTaskRequest) => updateTask(taskId, request),
    onSuccess: sync,
  })
}

/** Drops an active Task out of Today/active lists; it remains recoverable via restore. */
export function useDropTask(taskId: string) {
  const sync = useTaskCacheSync()
  return useMutation({
    mutationFn: (expectedVersion: number) => dropTask(taskId, expectedVersion),
    onSuccess: sync,
  })
}

/** Restores a dropped Task back to active, optionally with a new planned date. */
export function useRestoreTask(taskId: string) {
  const sync = useTaskCacheSync()
  return useMutation({
    mutationFn: ({ expectedVersion, plannedDate }: { expectedVersion: number; plannedDate: string | null }) =>
      restoreTask(taskId, expectedVersion, plannedDate),
    onSuccess: sync,
  })
}

/**
 * Marks a Task complete for a given local date. Unlike the other Task
 * mutations this is not bound to one fixed id: Today completes whichever
 * card the user acts on, so the id travels with each call's variables.
 */
export function useCompleteTask() {
  const sync = useTaskCacheSync()
  return useMutation({
    mutationFn: ({ taskId, expectedVersion, completedForLocalDate }: {
      taskId: string
      expectedVersion: number
      completedForLocalDate: string
    }) => completeTask(taskId, expectedVersion, completedForLocalDate),
    onSuccess: sync,
  })
}

/**
 * Undoes a done tick (018 note). Like completing, the id travels with each
 * call, because a list undoes whichever row the user presses.
 */
export function useUndoCompleteTask() {
  const sync = useTaskCacheSync()
  return useMutation({
    mutationFn: ({ taskId, expectedVersion }: { taskId: string; expectedVersion: number }) =>
      undoCompleteTask(taskId, expectedVersion),
    onSuccess: sync,
  })
}

/** What a sequence change would do, asked of the server each time; nothing is stored or cached. */
export function useTaskSequencePreview(taskId: string) {
  return useMutation({
    mutationFn: ({ action, predecessorId }: { action: TaskSequenceAction; predecessorId?: string | null }) =>
      previewTaskSequence(taskId, action, predecessorId),
  })
}

/** Applies exactly the change a preview showed. Every re-placed Task may have changed, so all Task views refresh. */
export function useChangeTaskSequence(taskId: string) {
  const sync = useTaskCacheSync()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (preview: TaskSequencePreview & { predecessorId?: string | null }) => changeTaskSequence(taskId,
      preview.action as TaskSequenceAction, preview.predecessorId ?? null, preview.expectedMembers),
    onSuccess: async task => {
      await sync(task)
      await client.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

/** What «بعد از…» on the New Task form will do; asked of the server each time, nothing is stored. */
export function useNewTaskSequencePreview() {
  return useMutation({
    mutationFn: (request: NewTaskSequencePreviewRequest) => previewNewTaskSequence(request),
  })
}
