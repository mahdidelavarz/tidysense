import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { components } from '../../../shared/api/generated'
import { toApiError } from '../../../shared/api/http'
import { FormError, FormField, type GoalFields, StatusBadge, formatDate, goalFieldsSchema, goalKeys } from '../../parents/components/ParentDashboard'
import { getGoal, previewGoalTerminal, terminateGoal, updateGoal } from '../services/goals-api'

type TerminalPreview = components['schemas']['TerminalPreviewDto']

export function GoalDetailView({ goalId }: { goalId: string }) {
  const client = useQueryClient()
  const goal = useQuery({ queryKey: goalKeys.detail(goalId), queryFn: () => getGoal(goalId) })
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<TerminalPreview | null>(null)
  const update = useMutation({
    mutationFn: (request: Parameters<typeof updateGoal>[1]) => updateGoal(goalId, request),
    onSuccess: async data => {
      client.setQueryData(goalKeys.detail(goalId), data)
      setEditing(false)
      await client.invalidateQueries({ queryKey: goalKeys.list })
      await client.invalidateQueries({ queryKey: goalKeys.options })
    },
  })
  const previewMutation = useMutation({
    mutationFn: ({ status, version }: { status: 'ACHIEVED' | 'ABANDONED'; version: number }) =>
      previewGoalTerminal(goalId, status, version),
    onSuccess: setPreview,
  })
  const terminal = useMutation({
    mutationFn: (value: TerminalPreview) => terminateGoal(goalId, value),
    onSuccess: async data => {
      client.setQueryData(goalKeys.detail(goalId), data)
      setPreview(null)
      await client.invalidateQueries({ queryKey: goalKeys.list })
      await client.invalidateQueries({ queryKey: goalKeys.options })
    },
  })

  if (goal.isPending) return <State text="در حال دریافت هدف…" />
  if (goal.isError) {
    const api = toApiError(goal.error)
    return <State alert text={api.status === 404 ? 'هدف پیدا نشد.' : 'دریافت هدف ممکن نشد.'} />
  }
  const data = goal.data
  return <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
    <Link className="text-sm text-accent underline" to="/">بازگشت به هدف‌ها و پروژه‌ها</Link>
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm text-text-secondary">هدف</p><h1 className="mt-1 text-3xl font-bold">{data.title}</h1></div>
        <StatusBadge status={data.status} />
      </div>
      <p className="mt-5 whitespace-pre-wrap text-text-secondary">{data.desiredOutcome}</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 text-sm">
        <dt className="text-text-secondary">تاریخ هدف</dt><dd>{formatDate(data.targetDate)}</dd>
        <dt className="text-text-secondary">تاریخ بازبینی</dt><dd>{formatDate(data.reviewDate)}</dd>
        <dt className="text-text-secondary">نسخه</dt><dd>{data.version}</dd>
      </dl>
    </article>

    {data.status === 'ACTIVE' && <div className="flex flex-wrap gap-3">
      <button className="secondary-button" type="button" onClick={() => setEditing(value => !value)}>{editing ? 'انصراف از ویرایش' : 'ویرایش هدف'}</button>
      <button className="secondary-button" type="button" disabled={previewMutation.isPending}
        onClick={() => previewMutation.mutate({ status: 'ACHIEVED', version: Number(data.version) })}>تحقق هدف</button>
      <button className="danger-button" type="button" disabled={previewMutation.isPending}
        onClick={() => previewMutation.mutate({ status: 'ABANDONED', version: Number(data.version) })}>رها کردن هدف</button>
    </div>}

    {editing && <GoalEditForm goal={data} pending={update.isPending} error={update.error} onSubmit={update.mutate} />}
    <FormError error={previewMutation.error} />
    <FormError error={terminal.error} />
    {preview && <TerminalConfirmation preview={preview} pending={terminal.isPending}
      onCancel={() => setPreview(null)} onConfirm={() => terminal.mutate(preview)} />}
  </div>
}

function GoalEditForm({ goal, pending, error, onSubmit }: {
  goal: components['schemas']['GoalDto']; pending: boolean; error: unknown
  onSubmit: (request: components['schemas']['UpdateGoalRequest']) => void
}) {
  const form = useForm<GoalFields>({ resolver: zodResolver(goalFieldsSchema), defaultValues: {
    title: goal.title, desiredOutcome: goal.desiredOutcome, targetDate: goal.targetDate ?? '', reviewDate: goal.reviewDate,
  } })
  const submit = form.handleSubmit(values => onSubmit({ title: values.title, desiredOutcome: values.desiredOutcome,
    targetDate: optional(values.targetDate), reviewDate: optional(values.reviewDate), expectedVersion: goal.version }))
  return <form className="form-card" onSubmit={submit} noValidate>
    <h2 className="text-xl font-bold">ویرایش هدف</h2>
    <FormField label="عنوان هدف" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
    <FormField label="نتیجه مطلوب" name="desiredOutcome" required multiline maxLength={2000} registration={form.register('desiredOutcome')} error={form.formState.errors.desiredOutcome?.message} />
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
  const action = preview.targetStatus === 'ACHIEVED' ? 'تحقق هدف' : 'رها کردن هدف'
  return <section aria-labelledby="terminal-title" className="form-card border-attention">
    <h2 id="terminal-title" className="text-xl font-bold">تأیید {action}</h2>
    {preview.blockers.length > 0 ? <>
      <p className="text-attention">ابتدا پروژه‌های فعال زیر را تعیین تکلیف کنید:</p>
      <ul className="list-inside list-disc">
        {preview.blockers.map(blocker => <li key={blocker.resourceId}>
          <Link className="text-accent underline" to="/projects/$projectId" params={{ projectId: blocker.resourceId }}>مشاهده پروژه فعال</Link>
        </li>)}
      </ul>
    </> : <p>این تغییر وضعیت صریح است و پس از تأیید ثبت می‌شود.</p>}
    <div className="flex gap-3">
      {preview.canApply && <button className="danger-button" type="button" disabled={pending} onClick={onConfirm}>{pending ? 'در حال ثبت…' : `تأیید ${action}`}</button>}
      <button className="secondary-button" type="button" onClick={onCancel}>انصراف</button>
    </div>
  </section>
}

const optional = (value: string) => value || null
function State({ text, alert = false }: { text: string; alert?: boolean }) {
  return <p className="state-card mx-auto mt-12 max-w-3xl" role={alert ? 'alert' : 'status'}>{text}</p>
}
