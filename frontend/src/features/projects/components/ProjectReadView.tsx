import { Link } from '@tanstack/react-router'
import { CalendarClock, CalendarDays, CircleCheckBig, CircleStop, Pencil, Target } from 'lucide-react'
import { useState } from 'react'
import { toApiError } from '../../../shared/api/http'
import { formatLocalDate } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ActionTile } from '../../../shared/ui/ActionTile'
import { DetailTerm } from '../../../shared/ui/DetailTerm'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { BackLink } from '../../../shared/ui/PageHeader'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProject, useProjectTerminal, useUpdateProject } from '../hooks/project-hooks'
import type { UpdateProjectRequest } from '../types/project.types'
import { ProjectForm } from './ProjectForm'
import { ProjectTerminalDialog } from './ProjectTerminalDialog'

/** Project detail page: read, edit and the explicit complete/stop terminal flow. */
export function ProjectReadView({ projectId }: { projectId: string }) {
  const project = useProject(projectId)
  const goals = useGoalOptions()
  const update = useUpdateProject(projectId)
  const terminal = useProjectTerminal(projectId)
  const [editing, setEditing] = useState(false)

  if (project.isPending) {
    return <div className="page"><BackLink to="/projects" /><LoadingState text="در حال دریافت پروژه…" /></div>
  }
  if (project.isError) {
    const notFound = toApiError(project.error).status === 404
    return (
      <div className="page">
        <BackLink to="/projects" />
        <ErrorState
          title={notFound ? 'پروژه پیدا نشد.' : 'دریافت پروژه ممکن نشد.'}
          description={notFound ? 'ممکن است این پروژه وجود نداشته باشد یا در دسترس شما نباشد.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={notFound ? undefined : () => project.refetch()}
        />
      </div>
    )
  }

  const data = project.data
  const version = Number(data.version)
  return (
    <div className="page">
      <BackLink to="/projects" />

      <article>
        <div className="flex flex-wrap items-center gap-2">
          <EntityLabel entity="project" />
          <StatusBadge status={data.status} />
        </div>
        <h1 className="page-title mt-3 wrap-break-word">{data.title}</h1>
        {data.completionMeaning
          ? <p className="mt-3 whitespace-pre-wrap leading-8 text-text-secondary">{data.completionMeaning}</p>
          : <p className="mt-3 text-sm text-text-tertiary">معنای تکمیل برای این پروژه ثبت نشده است.</p>}
        <dl className="card mt-6 grid gap-5 sm:grid-cols-2">
          <DetailTerm
            icon={Target}
            label="هدف بالادست"
            value={data.goalId
              ? <Link className="text-link" to="/goals/$goalId" params={{ goalId: data.goalId }}>مشاهده هدف</Link>
              : 'بدون هدف'}
          />
          <DetailTerm icon={CalendarDays} label="تاریخ هدف" value={formatLocalDate(data.targetDate)} dateTime={data.targetDate} />
          <DetailTerm icon={CalendarClock} label="تاریخ بازبینی" value={formatLocalDate(data.reviewDate)} dateTime={data.reviewDate} />
        </dl>
      </article>

      {data.status === 'ACTIVE' && (
        <section className="mt-8" aria-labelledby="project-actions">
          <h2 className="section-title" id="project-actions">چه کاری می‌خواهید انجام دهید؟</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ActionTile icon={Pencil} label="ویرایش پروژه" description="عنوان، معنای تکمیل، هدف یا تاریخ‌ها را تغییر دهید." onClick={() => setEditing(true)} />
            <ActionTile
              icon={CircleCheckBig}
              tone="positive"
              label={terminal.previewPending ? 'در حال آماده‌سازی…' : 'تکمیل پروژه'}
              description="ثبت می‌کنید که این پروژه به پایان رسیده است."
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'COMPLETED', version })}
            />
            <ActionTile
              icon={CircleStop}
              tone="attention"
              label="توقف پروژه"
              description="این پروژه را بدون تکمیل متوقف می‌کنید."
              disabled={terminal.previewPending}
              onClick={() => terminal.requestPreview({ status: 'STOPPED', version })}
            />
          </div>
        </section>
      )}

      <div className="mt-4 space-y-3">
        <FormError error={terminal.previewError} />
        <FormError error={terminal.terminalError} />
      </div>

      {editing && (
        <Sheet title="ویرایش پروژه" onClose={() => setEditing(false)} locked={update.isPending}>
          <ProjectForm
            project={data}
            goals={goals.data?.items ?? []}
            pending={update.isPending}
            error={update.error}
            onCancel={() => setEditing(false)}
            // ProjectForm's onSubmit covers create and edit; passing `project` guarantees the edit shape.
            onSubmit={request => update.mutate(request as UpdateProjectRequest, {
              onSuccess: () => {
                setEditing(false)
                showToast('تغییرات پروژه ذخیره شد.')
              },
            })}
          />
        </Sheet>
      )}
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
