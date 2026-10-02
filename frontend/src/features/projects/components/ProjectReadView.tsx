import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate } from '../../../shared/lib/date'
import { DetailTerm } from '../../../shared/ui/DetailTerm'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProject, useProjectTerminal, useUpdateProject } from '../hooks/project-hooks'
import { ProjectEditForm } from './ProjectEditForm'
import { ProjectTerminalDialog } from './ProjectTerminalDialog'

/** Project detail page: read, edit and the explicit complete/stop terminal flow. */
export function ProjectReadView({ projectId }: { projectId: string }) {
  const project = useProject(projectId)
  const goals = useGoalOptions()
  const update = useUpdateProject(projectId)
  const terminal = useProjectTerminal(projectId)
  const [editing, setEditing] = useState(false)

  if (project.isPending) {
    return <div className="page-container-narrow"><LoadingState text="در حال دریافت پروژه…" /></div>
  }
  if (project.isError) {
    const api = toApiError(project.error)
    return (
      <div className="page-container-narrow">
        <ErrorState
          title={api.status === 404 ? 'پروژه پیدا نشد.' : 'دریافت پروژه ممکن نشد.'}
          description={api.status === 404 ? 'ممکن است این پروژه وجود نداشته باشد یا در دسترس شما نباشد.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={api.status === 404 ? undefined : () => project.refetch()}
        />
      </div>
    )
  }

  const data = project.data
  return (
    <div className="page-container-narrow space-y-6">
      <Link className="text-link inline-flex min-h-11 items-center" to="/">بازگشت به هدف‌ها و پروژه‌ها</Link>

      <article className="page-header entity-surface entity-project">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <EntityLabel entity="project" />
            <h1 className="mt-2 break-words text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{data.title}</h1>
          </div>
          <StatusBadge status={data.status} />
        </div>
        {data.completionMeaning
          ? <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-text-secondary sm:text-base">{data.completionMeaning}</p>
          : <p className="mt-5 text-sm text-text-tertiary">معنای تکمیل برای این پروژه ثبت نشده است.</p>}
        <dl className="mt-6 grid gap-4 border-t border-border-subtle pt-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold text-text-secondary">هدف بالادست</dt>
            <dd className="mt-1 font-medium">
              {data.goalId
                ? <Link className="text-link" to="/goals/$goalId" params={{ goalId: data.goalId }}>مشاهده هدف</Link>
                : 'بدون هدف'}
            </dd>
          </div>
          <DetailTerm label="تاریخ هدف" value={formatLocalDate(data.targetDate)} dateTime={data.targetDate} />
          <DetailTerm label="تاریخ بازبینی" value={formatLocalDate(data.reviewDate)} dateTime={data.reviewDate} />
        </dl>
      </article>

      {data.status === 'ACTIVE' && (
        <section className="surface-card" aria-label="عملیات پروژه">
          <p className="mb-4 text-sm font-bold text-text-secondary">عملیات پروژه</p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button className="secondary-button" type="button" onClick={() => setEditing(value => !value)}>
              {editing ? 'انصراف از ویرایش' : 'ویرایش پروژه'}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'COMPLETED', version: Number(data.version) })}
            >
              {terminal.previewPending ? 'در حال آماده‌سازی…' : 'تکمیل پروژه'}
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'STOPPED', version: Number(data.version) })}
            >
              توقف پروژه
            </button>
          </div>
        </section>
      )}

      {editing && (
        <ProjectEditForm
          project={data}
          goals={goals.data?.items ?? []}
          pending={update.isPending}
          error={update.error}
          onSubmit={request => update.mutate(request, { onSuccess: () => setEditing(false) })}
        />
      )}
      <FormError error={terminal.previewError} />
      <FormError error={terminal.terminalError} />
      {terminal.preview && (
        <ProjectTerminalDialog
          preview={terminal.preview}
          pending={terminal.terminalPending}
          onCancel={terminal.cancel}
          onConfirm={terminal.confirm}
        />
      )}
    </div>
  )
}
