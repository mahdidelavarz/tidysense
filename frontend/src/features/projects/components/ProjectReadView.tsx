import type { ReactNode } from 'react'
import { toApiError } from '../../../shared/api/http'
import { useProject } from '../hooks/useProject'

export function ProjectReadView({ projectId }: { projectId: string }) {
  const project = useProject(projectId)

  if (project.isPending) return <StateCard>در حال دریافت پروژه…</StateCard>
  if (project.isError) {
    const error = toApiError(project.error)
    if (error.status === 404) return <StateCard>پروژه پیدا نشد.</StateCard>
    return <StateCard>دریافت پروژه ممکن نشد.{error.traceId ? ` کد پیگیری: ${error.traceId}` : ''}</StateCard>
  }

  return (
    <article className="mx-auto max-w-xl p-6">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-text-secondary">نمونهٔ خواندن پروژه</p>
        <h1 className="mt-2 text-2xl font-bold">{project.data.title}</h1>
        {project.data.description && <p className="mt-3 text-text-secondary">{project.data.description}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-text-secondary">تاریخ بازبینی</dt><dd>{project.data.reviewDate}</dd>
          <dt className="text-text-secondary">نسخه</dt><dd>{project.data.version}</dd>
        </dl>
      </div>
    </article>
  )
}

function StateCard({ children }: { children: ReactNode }) {
  return <div role="status" className="mx-auto mt-12 max-w-xl rounded-xl border border-border bg-surface p-5">{children}</div>
}
