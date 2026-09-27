import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { components } from '../../../shared/api/generated'
import { toApiError } from '../../../shared/api/http'
import { listGoals } from '../../goals/services/goals-api'
import { FormError, FormField, type ProjectFields, StatusBadge, formatDate, goalKeys, projectFieldsSchema, projectKeys } from '../../parents/components/ParentDashboard'
import { getProject, previewProjectTerminal, terminateProject, updateProject } from '../services/projects-api'

type TerminalPreview = components['schemas']['TerminalPreviewDto']

export function ProjectReadView({ projectId }: { projectId: string }) {
  const client = useQueryClient()
  const project = useQuery({ queryKey: projectKeys.detail(projectId), queryFn: () => getProject(projectId) })
  const goals = useQuery({ queryKey: goalKeys.options, queryFn: () => listGoals(undefined, undefined, 100) })
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<TerminalPreview | null>(null)
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

  if (project.isPending) return <State text="در حال دریافت پروژه…" />
  if (project.isError) {
    const api = toApiError(project.error)
    return <State alert text={api.status === 404 ? 'پروژه پیدا نشد.' : 'دریافت پروژه ممکن نشد.'} />
  }
  const data = project.data
  return <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
    <Link className="text-sm text-accent underline" to="/">بازگشت به هدف‌ها و پروژه‌ها</Link>
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm text-text-secondary">پروژه</p><h1 className="mt-1 text-3xl font-bold">{data.title}</h1></div>
        <StatusBadge status={data.status} />
      </div>
      {data.completionMeaning && <p className="mt-5 whitespace-pre-wrap text-text-secondary">{data.completionMeaning}</p>}
      <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 text-sm">
        <dt className="text-text-secondary">هدف بالادست</dt>
        <dd>{data.goalId ? <Link className="text-accent underline" to="/goals/$goalId" params={{ goalId: data.goalId }}>مشاهده هدف</Link> : 'بدون هدف'}</dd>
        <dt className="text-text-secondary">تاریخ هدف</dt><dd>{formatDate(data.targetDate)}</dd>
        <dt className="text-text-secondary">تاریخ بازبینی</dt><dd>{formatDate(data.reviewDate)}</dd>
        <dt className="text-text-secondary">نسخه</dt><dd>{data.version}</dd>
      </dl>
    </article>

    {data.status === 'ACTIVE' && <div className="flex flex-wrap gap-3">
      <button className="secondary-button" type="button" onClick={() => setEditing(value => !value)}>{editing ? 'انصراف از ویرایش' : 'ویرایش پروژه'}</button>
      <button className="secondary-button" type="button" disabled={previewMutation.isPending}
        onClick={() => previewMutation.mutate({ status: 'COMPLETED', version: Number(data.version) })}>تکمیل پروژه</button>
      <button className="danger-button" type="button" disabled={previewMutation.isPending}
        onClick={() => previewMutation.mutate({ status: 'STOPPED', version: Number(data.version) })}>توقف پروژه</button>
    </div>}

    {editing && <ProjectEditForm project={data} goals={goals.data?.items ?? []} pending={update.isPending}
      error={update.error} onSubmit={update.mutate} />}
    <FormError error={previewMutation.error} />
    <FormError error={terminal.error} />
    {preview && <TerminalConfirmation preview={preview} pending={terminal.isPending}
      onCancel={() => setPreview(null)} onConfirm={() => terminal.mutate(preview)} />}
  </div>
}

function ProjectEditForm({ project, goals, pending, error, onSubmit }: {
  project: components['schemas']['ProjectDto']
  goals: components['schemas']['GoalDto'][]
  pending: boolean; error: unknown
  onSubmit: (request: components['schemas']['UpdateProjectRequest']) => void
}) {
  const form = useForm<ProjectFields>({ resolver: zodResolver(projectFieldsSchema), defaultValues: {
    title: project.title, completionMeaning: project.completionMeaning ?? '', goalId: project.goalId ?? '',
    targetDate: project.targetDate ?? '', reviewDate: project.reviewDate,
  } })
  const submit = form.handleSubmit(values => onSubmit({ title: values.title,
    completionMeaning: optional(values.completionMeaning), goalId: optional(values.goalId),
    targetDate: optional(values.targetDate), reviewDate: optional(values.reviewDate), expectedVersion: project.version }))
  return <form className="form-card" onSubmit={submit} noValidate>
    <h2 className="text-xl font-bold">ویرایش پروژه</h2>
    <FormField label="عنوان پروژه" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
    <FormField label="معنای تکمیل" name="completionMeaning" multiline maxLength={2000} registration={form.register('completionMeaning')} />
    <label className="field-label">هدف بالادست
      <select className="field-input" {...form.register('goalId')}>
        <option value="">بدون هدف</option>
        {goals.filter(goal => goal.status === 'ACTIVE' || goal.id === project.goalId).map(goal =>
          <option key={goal.id} value={goal.id}>{goal.title}</option>)}
      </select>
    </label>
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="تاریخ هدف" name="targetDate" type="date" registration={form.register('targetDate')} />
      <FormField label="تاریخ بازبینی" name="reviewDate" type="date" registration={form.register('reviewDate')} />
    </div>
    <FormError error={error} />
    <button className="primary-button" type="submit" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button>
  </form>
}

function TerminalConfirmation({ preview, pending, onCancel, onConfirm }: {
  preview: TerminalPreview; pending: boolean; onCancel: () => void; onConfirm: () => void
}) {
  const action = preview.targetStatus === 'COMPLETED' ? 'تکمیل پروژه' : 'توقف پروژه'
  return <section aria-labelledby="project-terminal-title" className="form-card border-attention">
    <h2 id="project-terminal-title" className="text-xl font-bold">تأیید {action}</h2>
    <p>وضعیت هدف بالادست با این کار خودکار تغییر نمی‌کند.</p>
    <div className="flex gap-3">
      <button className="danger-button" type="button" disabled={pending} onClick={onConfirm}>{pending ? 'در حال ثبت…' : `تأیید ${action}`}</button>
      <button className="secondary-button" type="button" onClick={onCancel}>انصراف</button>
    </div>
  </section>
}

const optional = (value: string) => value || null
function State({ text, alert = false }: { text: string; alert?: boolean }) {
  return <p className="state-card mx-auto mt-12 max-w-3xl" role={alert ? 'alert' : 'status'}>{text}</p>
}
