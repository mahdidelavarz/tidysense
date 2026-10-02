import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
  createProject,
  getProject,
  listProjects,
  previewProjectTerminal,
  terminateProject,
  updateProject,
} from '../services/projects-api'
import type {
  CreateProjectRequest,
  ProjectTerminalPreview,
  ProjectTerminalStatus,
  UpdateProjectRequest,
} from '../types/project.types'

/** Query key factory for Project queries. The single source of truth other Project hooks and mutations invalidate against. */
export const projectKeys = {
  all: ['projects'] as const,
  list: ['projects', 'list'] as const,
  /** Unpaginated lookup list used by Task parent selects. */
  options: ['projects', 'options'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
}

/** Cursor-paginated Project list for the Projects panel, loaded one page at a time. */
export function useProjects(status?: string) {
  return useInfiniteQuery({
    // The filter is part of the key, so every variant is still invalidated by the `list` prefix.
    queryKey: [...projectKeys.list, status ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listProjects(status, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
}

/** Flat, unpaginated Project list for the Task parent-selection dropdown. */
export function useProjectOptions() {
  return useQuery({ queryKey: projectKeys.options, queryFn: () => listProjects(undefined, undefined, 100) })
}

/** Fetches one Project for the Project detail page. */
export function useProject(id: string) {
  return useQuery({ queryKey: projectKeys.detail(id), queryFn: () => getProject(id) })
}

/** Creates a Project and refreshes the lists that must reflect it. */
export function useCreateProject() {
  const client = useQueryClient()
  return useMutation({
    // Wrapped (not passed by reference) so TanStack Query's internal
    // mutation context argument never reaches the plain HTTP function.
    mutationFn: (request: CreateProjectRequest) => createProject(request),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: projectKeys.list }),
        client.invalidateQueries({ queryKey: projectKeys.options }),
      ])
    },
  })
}

/** Updates a Project's editable fields and keeps detail/list caches authoritative. */
export function useUpdateProject(projectId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateProjectRequest) => updateProject(projectId, request),
    onSuccess: async data => {
      client.setQueryData(projectKeys.detail(projectId), data)
      await Promise.all([
        client.invalidateQueries({ queryKey: projectKeys.list }),
        client.invalidateQueries({ queryKey: projectKeys.options }),
      ])
    },
  })
}

/**
 * Drives the two-step explicit terminal transition (preview, then confirm)
 * for one Project: request a preview, hold it until the user decides, apply
 * or cancel. Keeping this state in the hook keeps ProjectReadView thin.
 */
export function useProjectTerminal(projectId: string) {
  const client = useQueryClient()
  const [preview, setPreview] = useState<ProjectTerminalPreview | null>(null)

  const previewMutation = useMutation({
    mutationFn: ({ status, version }: { status: ProjectTerminalStatus; version: number }) =>
      previewProjectTerminal(projectId, status, version),
    onSuccess: setPreview,
  })

  const terminalMutation = useMutation({
    mutationFn: (value: ProjectTerminalPreview) => terminateProject(projectId, value),
    onSuccess: async data => {
      client.setQueryData(projectKeys.detail(projectId), data)
      setPreview(null)
      await client.invalidateQueries({ queryKey: projectKeys.list })
    },
  })

  const cancel = useCallback(() => setPreview(null), [])
  const confirm = useCallback(() => {
    if (preview) terminalMutation.mutate(preview)
  }, [preview, terminalMutation])

  return {
    preview,
    requestPreview: previewMutation.mutate,
    previewPending: previewMutation.isPending,
    previewError: previewMutation.error,
    terminalPending: terminalMutation.isPending,
    terminalError: terminalMutation.error,
    cancel,
    confirm,
  }
}
