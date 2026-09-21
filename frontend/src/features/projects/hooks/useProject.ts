import { useQuery } from '@tanstack/react-query'
import { getProject } from '../services/projects-api'

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
}

export function useProject(id: string) {
  return useQuery({ queryKey: projectKeys.detail(id), queryFn: () => getProject(id) })
}
