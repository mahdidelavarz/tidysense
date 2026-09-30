import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { components } from '../../../shared/api/generated'
import { toApiError } from '../../../shared/api/http'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import { listGoals } from '../../goals/services/goals-api'
import {
  type ProjectFields,
  formatDate,
  goalKeys,
  projectFieldsSchema,
  projectKeys,
} from '../../parents/components/ParentDashboard'
import { getProject, previewProjectTerminal, terminateProject, updateProject } from '../services/projects-api'

type TerminalPreview = components['schemas']['TerminalPreviewDto']

export function ProjectReadView({ projectId }: { projectId: string }) {
  const client = useQueryClient()
  const project = useQuery({ queryKey: projectKeys.detail(projectId), queryFn: () => getProject(projectId) })
  const goals = useQuery({ queryKey: goalKeys.options, queryFn: () => listGoals(undefined, undefined, 100) })
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<TerminalPreview | null>(null)
  const closePreview = useCallback(() => setPreview(null), [])
  const update = useMutation({
    mutationFn: (request: Parameters<typeof updateProject>[1]) => updateProject(projectId, request),
    onSuccess: async data => {
      client.setQueryData(projectKeys.detail(projectId), data)
      setEditing(false)
      await client.invalidateQueries({ queryKey: projectKeys.list })
    },
  })
  const previewMutation = useMutation({
    mutationFn: ({ status, version }: { status: 'COMPLETED' | 'STOPPED'; version: number }) =>
      previewProjectTerminal(projectId, status, version),
    onSuccess: setPreview,
  })
  const terminal = useMutation({
    mutationFn: (value: TerminalPreview) => terminateProject(projectId, value),
    onSuccess: async data => {
      client.setQueryData(projectKeys.detail(projectId), data)
      setPreview(null)
      await client.invalidateQueries({ queryKey: projectKeys.list })
    },
  })

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
        <dl className="mt-6 grid gap-4 border-t border-border-subtle pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold text-text-secondary">هدف بالادست</dt>
            <dd className="mt-1 font-medium">
              {data.goalId
                ? <Link className="text-link" to="/goals/$goalId" params={{ goalId: data.goalId }}>مشاهده هدف</Link>
                : 'بدون هدف'}
            </dd>
          </div>
          <DetailTerm label="تاریخ هدف" value={formatDate(data.targetDate)} dateTime={data.targetDate} />
          <DetailTerm label="تاریخ بازبینی" value={formatDate(data.reviewDate)} dateTime={data.reviewDate} />
          <DetailTerm label="نسخه" value={String(data.version)} />
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
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate({ status: 'COMPLETED', version: Number(data.version) })}
            >
              {previewMutation.isPending ? 'در حال آماده‌سازی…' : 'تکمیل پروژه'}
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate({ status: 'STOPPED', version: Number(data.version) })}
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
          onSubmit={update.mutate}
        />
      )}
      <FormError error={previewMutation.error} />
      <FormError error={terminal.error} />
      {preview && (
        <TerminalConfirmation
          preview={preview}
          pending={terminal.isPending}
          onCancel={closePreview}
          onConfirm={() => terminal.mutate(preview)}
        />
      )}
    </div>
  )
}

function DetailTerm({ label, value, dateTime }: { label: string; value: string; dateTime?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd className="mt-1 font-medium">{dateTime ? <time dateTime={dateTime}>{value}</time> : value}</dd>
    </div>
  )
}

function ProjectEditForm({ project, goals, pending, error, onSubmit }: {
  project: components['schemas']['ProjectDto']
  goals: components['schemas']['GoalDto'][]
  pending: boolean
  error: unknown
  onSubmit: (request: components['schemas']['UpdateProjectRequest']) => void
}) {
  const form = useForm<ProjectFields>({
    resolver: zodResolver(projectFieldsSchema),
    defaultValues: {
      title: project.title,
      completionMeaning: project.completionMeaning ?? '',
      goalId: project.goalId ?? '',
      targetDate: project.targetDate ?? '',
      reviewDate: project.reviewDate,
    },
  })
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    completionMeaning: optional(values.completionMeaning),
    goalId: optional(values.goalId),
    targetDate: optional(values.targetDate),
    reviewDate: optional(values.reviewDate),
    expectedVersion: project.version,
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-project" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="project" />
        <h2 className="mt-2 text-xl font-bold">ویرایش پروژه</h2>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان پروژه" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField label="معنای تکمیل" name="completionMeaning" multiline maxLength={2000} registration={form.register('completionMeaning')} />
      <label className="field-label">
        هدف بالادست
        <select className="field-input" {...form.register('goalId')} disabled={goals.length === 0 && !project.goalId}>
          <option value="">بدون هدف</option>
          {goals.filter(goal => goal.status === 'ACTIVE' || goal.id === project.goalId).map(goal => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <FormField label="تاریخ هدف" name="targetDate" type="date" registration={form.register('targetDate')} error={form.formState.errors.targetDate?.message} />
        <FormField label="تاریخ بازبینی" name="reviewDate" type="date" registration={form.register('reviewDate')} error={form.formState.errors.reviewDate?.message} />
      </div>
      <FormError error={error} />
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button>
      </div>
    </form>
  )
}

function TerminalConfirmation({ preview, pending, onCancel, onConfirm }: {
  preview: TerminalPreview
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const completed = preview.targetStatus === 'COMPLETED'
  const action = completed ? 'تکمیل پروژه' : 'توقف پروژه'
  return (
    <ConfirmationDialog
      title={`تأیید ${action}`}
      description="وضعیت هدف بالادست با این کار خودکار تغییر نمی‌کند."
      onClose={onCancel}
      pending={pending}
      actions={(
        <>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={pending}>انصراف</button>
          {preview.canApply && (
            <button className={completed ? 'primary-button' : 'danger-button'} type="button" disabled={pending} onClick={onConfirm}>
              {pending ? 'در حال ثبت…' : `تأیید ${action}`}
            </button>
          )}
        </>
      )}
    >
      {preview.blockers.length > 0 && (
        <div className="rounded-lg border border-attention/40 bg-attention-tint p-4">
          <p className="font-bold text-text-primary">ابتدا کارهای فعال این پروژه را تعیین تکلیف کنید:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            {preview.blockers.map(blocker => (
              <li key={blocker.resourceId}>
                <Link className="text-link" to="/tasks/$taskId" params={{ taskId: blocker.resourceId }}>مشاهده کار فعال</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ConfirmationDialog>
  )
}

const optional = (value: string) => value || null
