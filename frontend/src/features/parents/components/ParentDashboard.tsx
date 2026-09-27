import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import { createGoal, listGoals } from '../../goals/services/goals-api'
import { createProject, listProjects } from '../../projects/services/projects-api'
import { toApiError } from '../../../shared/api/http'

export const goalKeys = {
  all: ['goals'] as const, list: ['goals', 'list'] as const, options: ['goals', 'options'] as const,
  detail: (id: string) => ['goals', 'detail', id] as const,
}
export const projectKeys = {
  all: ['projects'] as const, list: ['projects', 'list'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
}
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(''))
export const goalFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان هدف الزامی است.').max(200),
  desiredOutcome: z.string().trim().min(1, 'نتیجه مطلوب الزامی است.').max(2000),
  targetDate: dateField,
  reviewDate: dateField,
})
export const projectFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان پروژه الزامی است.').max(200),
  completionMeaning: z.string().trim().max(2000),
  goalId: z.string(),
  targetDate: dateField,
  reviewDate: dateField,
})
export type GoalFields = z.infer<typeof goalFieldsSchema>
export type ProjectFields = z.infer<typeof projectFieldsSchema>

export function ParentDashboard() {
  const client = useQueryClient()
  const goals = useInfiniteQuery({
    queryKey: goalKeys.list, initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listGoals(undefined, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
  const projects = useInfiniteQuery({
    queryKey: projectKeys.list, initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listProjects(undefined, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
  const goalItems = goals.data?.pages.flatMap(page => page.items) ?? []
  const projectItems = projects.data?.pages.flatMap(page => page.items) ?? []
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [projectFormOpen, setProjectFormOpen] = useState(false)

  const goalCreate = useMutation({
    mutationFn: createGoal,
    onSuccess: async () => {
      setGoalFormOpen(false)
      await client.invalidateQueries({ queryKey: goalKeys.list })
      await client.invalidateQueries({ queryKey: goalKeys.options })
    },
  })
  const projectCreate = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setProjectFormOpen(false)
      await client.invalidateQueries({ queryKey: projectKeys.list })
    },
  })

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      <header className="rounded-2xl bg-surface p-6 shadow-sm">
        <p className="text-sm text-text-secondary">فضای کاری شما</p>
        <h1 className="mt-1 text-3xl font-bold">هدف‌ها و پروژه‌ها</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          نتیجه‌ای که می‌خواهید را در هدف ثبت کنید و کارهای محدودتر را به‌صورت پروژه زیر آن بسازید.
        </p>
      </header>

      <section aria-labelledby="goals-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="goals-heading" className="text-2xl font-bold">هدف‌ها</h2>
          <button className="primary-button" type="button" onClick={() => setGoalFormOpen(value => !value)}>
            {goalFormOpen ? 'بستن فرم' : 'هدف جدید'}
          </button>
        </div>
        {goalFormOpen && <GoalCreateForm pending={goalCreate.isPending} error={goalCreate.error}
          onSubmit={values => goalCreate.mutate(values)} />}
        <ResourceState pending={goals.isPending} error={goals.error} empty={goalItems.length === 0}
          pendingText="در حال دریافت هدف‌ها…" emptyText="هنوز هدفی نساخته‌اید.">
          <div className="grid gap-3 md:grid-cols-2">
            {goalItems.map(goal => (
              <Link className="resource-card" key={goal.id} to="/goals/$goalId" params={{ goalId: goal.id }}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{goal.title}</h3>
                  <StatusBadge status={goal.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{goal.desiredOutcome}</p>
                <p className="mt-4 text-xs text-text-secondary">بازبینی: {formatDate(goal.reviewDate)}</p>
              </Link>
            ))}
          </div>
          {goals.hasNextPage && <button className="secondary-button mt-4" type="button"
            disabled={goals.isFetchingNextPage} onClick={() => goals.fetchNextPage()}>
            {goals.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش هدف‌های بیشتر'}
          </button>}
        </ResourceState>
      </section>

      <section aria-labelledby="projects-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="projects-heading" className="text-2xl font-bold">پروژه‌ها</h2>
          <button className="primary-button" type="button" onClick={() => setProjectFormOpen(value => !value)}>
            {projectFormOpen ? 'بستن فرم' : 'پروژه جدید'}
          </button>
        </div>
        {projectFormOpen && <ProjectCreateForm goals={goalItems} pending={projectCreate.isPending}
          error={projectCreate.error} onSubmit={values => projectCreate.mutate(values)} />}
        <ResourceState pending={projects.isPending} error={projects.error} empty={projectItems.length === 0}
          pendingText="در حال دریافت پروژه‌ها…" emptyText="هنوز پروژه‌ای نساخته‌اید.">
          <div className="grid gap-3 md:grid-cols-2">
            {projectItems.map(project => (
              <Link className="resource-card" key={project.id} to="/projects/$projectId" params={{ projectId: project.id }}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{project.title}</h3>
                  <StatusBadge status={project.status} />
                </div>
                {project.completionMeaning && <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{project.completionMeaning}</p>}
                <p className="mt-4 text-xs text-text-secondary">بازبینی: {formatDate(project.reviewDate)}</p>
              </Link>
            ))}
          </div>
          {projects.hasNextPage && <button className="secondary-button mt-4" type="button"
            disabled={projects.isFetchingNextPage} onClick={() => projects.fetchNextPage()}>
            {projects.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش پروژه‌های بیشتر'}
          </button>}
        </ResourceState>
      </section>
    </div>
  )
}

function GoalCreateForm({ pending, error, onSubmit }: {
  pending: boolean
  error: unknown
  onSubmit: (request: { title: string; desiredOutcome: string; targetDate: string | null; reviewDate: string | null }) => void
}) {
  const form = useForm<GoalFields>({
    resolver: zodResolver(goalFieldsSchema),
    defaultValues: { title: '', desiredOutcome: '', targetDate: '', reviewDate: '' },
  })
  const submit = form.handleSubmit(values => onSubmit({ ...values,
    targetDate: nullable(values.targetDate), reviewDate: nullable(values.reviewDate) }))
  return <form className="form-card" onSubmit={submit} noValidate>
    <h3 className="font-bold">ساخت هدف</h3>
    <FormField label="عنوان هدف" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
    <FormField label="نتیجه مطلوب" name="desiredOutcome" required multiline maxLength={2000} registration={form.register('desiredOutcome')} error={form.formState.errors.desiredOutcome?.message} />
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="تاریخ هدف (اختیاری)" name="targetDate" type="date" registration={form.register('targetDate')} />
      <FormField label="تاریخ بازبینی (اختیاری)" name="reviewDate" type="date" registration={form.register('reviewDate')} />
    </div>
    <FormError error={error} />
    <button className="primary-button" type="submit" disabled={pending}>{pending ? 'در حال ساخت…' : 'ساخت هدف'}</button>
  </form>
}

function ProjectCreateForm({ goals, pending, error, onSubmit }: {
  goals: Array<{ id: string; title: string; status: string }>
  pending: boolean
  error: unknown
  onSubmit: (request: { title: string; completionMeaning: string | null; goalId: string | null; targetDate: string | null; reviewDate: string | null }) => void
}) {
  const form = useForm<ProjectFields>({
    resolver: zodResolver(projectFieldsSchema),
    defaultValues: { title: '', completionMeaning: '', goalId: '', targetDate: '', reviewDate: '' },
  })
  const submit = form.handleSubmit(values => onSubmit({ title: values.title,
    completionMeaning: nullable(values.completionMeaning), goalId: nullable(values.goalId),
    targetDate: nullable(values.targetDate), reviewDate: nullable(values.reviewDate) }))
  return <form className="form-card" onSubmit={submit} noValidate>
    <h3 className="font-bold">ساخت پروژه</h3>
    <FormField label="عنوان پروژه" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
    <FormField label="معنای تکمیل (اختیاری)" name="completionMeaning" multiline maxLength={2000} registration={form.register('completionMeaning')} />
    <label className="field-label">هدف بالادست (اختیاری)
      <select className="field-input" {...form.register('goalId')}>
        <option value="">بدون هدف</option>
        {goals.filter(goal => goal.status === 'ACTIVE').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
      </select>
    </label>
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="تاریخ هدف (اختیاری)" name="targetDate" type="date" registration={form.register('targetDate')} />
      <FormField label="تاریخ بازبینی (اختیاری)" name="reviewDate" type="date" registration={form.register('reviewDate')} />
    </div>
    <FormError error={error} />
    <button className="primary-button" type="submit" disabled={pending}>{pending ? 'در حال ساخت…' : 'ساخت پروژه'}</button>
  </form>
}

export function FormField({ label, name, required, multiline, type = 'text', maxLength, defaultValue, registration, error }: {
  label: string; name: string; required?: boolean; multiline?: boolean; type?: string; maxLength?: number; defaultValue?: string
  registration?: UseFormRegisterReturn; error?: string
}) {
  const id = useId()
  return <label className="field-label" htmlFor={id}>{label}
    {multiline
      ? <textarea id={id} className="field-input min-h-24" name={name} required={required} maxLength={maxLength} defaultValue={defaultValue} {...registration} />
      : <input id={id} className="field-input" name={name} required={required} maxLength={maxLength} type={type} defaultValue={defaultValue} {...registration} />}
    {error && <span className="text-xs text-attention">{error}</span>}
  </label>
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  const api = toApiError(error)
  const copy = api.code === 'CONFLICT_STALE_VERSION' ? 'این مورد در جای دیگری تغییر کرده است. صفحه را تازه کنید.'
    : api.code === 'IDEMPOTENCY_MISMATCH' ? 'درخواست تکراری با محتوای متفاوت ارسال شد.'
      : 'ذخیره انجام نشد. ورودی‌ها را بررسی و دوباره تلاش کنید.'
  return <p className="text-sm text-attention" role="alert">{copy}{api.traceId ? ` کد پیگیری: ${api.traceId}` : ''}</p>
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { ACTIVE: 'فعال', ACHIEVED: 'محقق‌شده', ABANDONED: 'رهاشده', COMPLETED: 'تکمیل‌شده', STOPPED: 'متوقف‌شده' }
  return <span className="rounded-full bg-accent-tint px-2 py-1 text-xs text-accent">{labels[status] ?? status}</span>
}

function ResourceState({ pending, error, empty, pendingText, emptyText, children }: {
  pending: boolean; error: unknown; empty: boolean; pendingText: string; emptyText: string; children: ReactNode
}) {
  if (pending) return <p className="state-card" role="status">{pendingText}</p>
  if (error) return <p className="state-card text-attention" role="alert">دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.</p>
  if (empty) return <p className="state-card">{emptyText}</p>
  return children
}

const nullable = (value: string) => value || null
export const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('fa-IR').format(new Date(`${value}T00:00:00`)) : 'تعیین نشده'
