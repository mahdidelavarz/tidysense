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
import { type GoalFields, formatDate, goalFieldsSchema, goalKeys } from '../../parents/components/ParentDashboard'
import { getGoal, previewGoalTerminal, terminateGoal, updateGoal } from '../services/goals-api'

type TerminalPreview = components['schemas']['TerminalPreviewDto']

export function GoalDetailView({ goalId }: { goalId: string }) {
  const client = useQueryClient()
  const goal = useQuery({ queryKey: goalKeys.detail(goalId), queryFn: () => getGoal(goalId) })
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<TerminalPreview | null>(null)
  const closePreview = useCallback(() => setPreview(null), [])
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

  if (goal.isPending) {
    return <div className="page-container-narrow"><LoadingState text="در حال دریافت هدف…" /></div>
  }
  if (goal.isError) {
    const api = toApiError(goal.error)
    return (
      <div className="page-container-narrow">
        <ErrorState
          title={api.status === 404 ? 'هدف پیدا نشد.' : 'دریافت هدف ممکن نشد.'}
          description={api.status === 404 ? 'ممکن است این هدف وجود نداشته باشد یا در دسترس شما نباشد.' : 'ارتباط را بررسی کنید و دوباره تلاش کنید.'}
          onRetry={api.status === 404 ? undefined : () => goal.refetch()}
        />
      </div>
    )
  }

  const data = goal.data
  return (
    <div className="page-container-narrow space-y-6">
      <Link className="text-link inline-flex min-h-11 items-center" to="/">بازگشت به هدف‌ها و پروژه‌ها</Link>

      <article className="page-header entity-surface entity-goal">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <EntityLabel entity="goal" />
            <h1 className="mt-2 break-words text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{data.title}</h1>
          </div>
          <StatusBadge status={data.status} />
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-text-secondary sm:text-base">{data.desiredOutcome}</p>
        <dl className="mt-6 grid gap-4 border-t border-border-subtle pt-5 text-sm sm:grid-cols-3">
          <DetailTerm label="تاریخ هدف" value={formatDate(data.targetDate)} dateTime={data.targetDate} />
          <DetailTerm label="تاریخ بازبینی" value={formatDate(data.reviewDate)} dateTime={data.reviewDate} />
          <DetailTerm label="نسخه" value={String(data.version)} />
        </dl>
      </article>

      {data.status === 'ACTIVE' && (
        <section className="surface-card" aria-label="عملیات هدف">
          <p className="mb-4 text-sm font-bold text-text-secondary">عملیات هدف</p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button className="secondary-button" type="button" onClick={() => setEditing(value => !value)}>
              {editing ? 'انصراف از ویرایش' : 'ویرایش هدف'}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate({ status: 'ACHIEVED', version: Number(data.version) })}
            >
              {previewMutation.isPending ? 'در حال آماده‌سازی…' : 'تحقق هدف'}
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate({ status: 'ABANDONED', version: Number(data.version) })}
            >
              رها کردن هدف
            </button>
          </div>
        </section>
      )}

      {editing && <GoalEditForm goal={data} pending={update.isPending} error={update.error} onSubmit={update.mutate} />}
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

function GoalEditForm({ goal, pending, error, onSubmit }: {
  goal: components['schemas']['GoalDto']
  pending: boolean
  error: unknown
  onSubmit: (request: components['schemas']['UpdateGoalRequest']) => void
}) {
  const form = useForm<GoalFields>({
    resolver: zodResolver(goalFieldsSchema),
    defaultValues: {
      title: goal.title,
      desiredOutcome: goal.desiredOutcome,
      targetDate: goal.targetDate ?? '',
      reviewDate: goal.reviewDate,
    },
  })
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    desiredOutcome: values.desiredOutcome,
    targetDate: optional(values.targetDate),
    reviewDate: optional(values.reviewDate),
    expectedVersion: goal.version,
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-goal" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="goal" />
        <h2 className="mt-2 text-xl font-bold">ویرایش هدف</h2>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان هدف" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField label="نتیجه مطلوب" name="desiredOutcome" required multiline maxLength={2000} registration={form.register('desiredOutcome')} error={form.formState.errors.desiredOutcome?.message} />
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
  const achieved = preview.targetStatus === 'ACHIEVED'
  const action = achieved ? 'تحقق هدف' : 'رها کردن هدف'
  return (
    <ConfirmationDialog
      title={`تأیید ${action}`}
      description="این تغییر وضعیت صریح است و فقط پس از تأیید شما ثبت می‌شود."
      onClose={onCancel}
      pending={pending}
      actions={(
        <>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={pending}>انصراف</button>
          {preview.canApply && (
            <button className={achieved ? 'primary-button' : 'danger-button'} type="button" disabled={pending} onClick={onConfirm}>
              {pending ? 'در حال ثبت…' : `تأیید ${action}`}
            </button>
          )}
        </>
      )}
    >
      {preview.blockers.length > 0 && (
        <div className="rounded-lg border border-attention/40 bg-attention-tint p-4">
          <p className="font-bold text-text-primary">ابتدا پروژه‌های فعال و کارهای مستقیم زیر را تعیین تکلیف کنید:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            {preview.blockers.map(blocker => (
              <li key={blocker.resourceId}>
                {blocker.resourceType === 'Task'
                  ? <Link className="text-link" to="/tasks/$taskId" params={{ taskId: blocker.resourceId }}>مشاهده کار فعال</Link>
                  : <Link className="text-link" to="/projects/$projectId" params={{ projectId: blocker.resourceId }}>مشاهده پروژه فعال</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ConfirmationDialog>
  )
}

const optional = (value: string) => value || null
