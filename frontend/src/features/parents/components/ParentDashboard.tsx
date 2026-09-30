import { zodResolver } from '@hookform/resolvers/zod'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import { ResourceState } from '../../../shared/ui/StateUi'
import { createGoal, listGoals } from '../../goals/services/goals-api'
import { createProject, listProjects } from '../../projects/services/projects-api'

export const goalKeys = {
  all: ['goals'] as const,
  list: ['goals', 'list'] as const,
  options: ['goals', 'options'] as const,
  detail: (id: string) => ['goals', 'detail', id] as const,
}

export const projectKeys = {
  all: ['projects'] as const,
  list: ['projects', 'list'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
}

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

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
    queryKey: goalKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listGoals(undefined, pageParam),
    getNextPageParam: page => page.page.nextCursor ?? undefined,
  })
  const projects = useInfiniteQuery({
    queryKey: projectKeys.list,
    initialPageParam: undefined as string | undefined,
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
    <div className="page-container space-y-10">
      <header className="page-header">
        <p className="text-sm font-bold text-accent">فضای کاری شما</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">هدف‌ها و پروژه‌ها</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
          نتیجه‌ای را که برایتان مهم است به‌عنوان هدف ثبت کنید و تلاش‌های محدود و قابل‌مدیریت را در پروژه‌ها پیش ببرید.
        </p>
      </header>

      <section aria-labelledby="goals-heading" className="space-y-5">
        <SectionHeading
          id="goals-heading"
          title="هدف‌ها"
          description="نتیجه‌ها و جهت‌هایی که خودتان تحقق آن‌ها را تأیید می‌کنید."
          fetching={goals.isFetching && !goals.isPending}
          actionLabel={goalFormOpen ? 'بستن فرم' : 'هدف جدید'}
          onAction={() => setGoalFormOpen(value => !value)}
        />
        {goalFormOpen && (
          <GoalCreateForm
            pending={goalCreate.isPending}
            error={goalCreate.error}
            onSubmit={values => goalCreate.mutate(values)}
          />
        )}
        <ResourceState
          pending={goals.isPending}
          error={goals.error}
          empty={goalItems.length === 0}
          pendingText="در حال دریافت هدف‌ها…"
          emptyTitle="هنوز هدفی نساخته‌اید."
          emptyDescription="اولین نتیجه مهمی را که می‌خواهید به آن برسید ثبت کنید."
          emptyAction={goalFormOpen ? undefined : <button className="secondary-button" type="button" onClick={() => setGoalFormOpen(true)}>ساخت هدف</button>}
          onRetry={() => goals.refetch()}
        >
          <ul className="grid gap-4 md:grid-cols-2">
            {goalItems.map(goal => (
              <li key={goal.id}>
                <Link className="resource-card entity-goal h-full" to="/goals/$goalId" params={{ goalId: goal.id }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <EntityLabel entity="goal" />
                      <h3 className="mt-2 truncate text-lg font-bold leading-snug">{goal.title}</h3>
                    </div>
                    <StatusBadge status={goal.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-text-secondary">{goal.desiredOutcome}</p>
                  <p className="mt-5 border-t border-border-subtle pt-3 text-xs text-text-secondary">
                    بازبینی <time dateTime={goal.reviewDate}>{formatDate(goal.reviewDate)}</time>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {goals.hasNextPage && (
            <button
              className="secondary-button mt-5 w-full sm:w-auto"
              type="button"
              disabled={goals.isFetchingNextPage}
              onClick={() => goals.fetchNextPage()}
            >
              {goals.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش هدف‌های بیشتر'}
            </button>
          )}
        </ResourceState>
      </section>

      <section aria-labelledby="projects-heading" className="space-y-5">
        <SectionHeading
          id="projects-heading"
          title="پروژه‌ها"
          description="تلاش‌های محدود و مستقلی که می‌توانند زیر یک هدف یا به‌تنهایی باشند."
          fetching={projects.isFetching && !projects.isPending}
          actionLabel={projectFormOpen ? 'بستن فرم' : 'پروژه جدید'}
          onAction={() => setProjectFormOpen(value => !value)}
        />
        {projectFormOpen && (
          <ProjectCreateForm
            goals={goalItems}
            pending={projectCreate.isPending}
            error={projectCreate.error}
            onSubmit={values => projectCreate.mutate(values)}
          />
        )}
        <ResourceState
          pending={projects.isPending}
          error={projects.error}
          empty={projectItems.length === 0}
          pendingText="در حال دریافت پروژه‌ها…"
          emptyTitle="هنوز پروژه‌ای نساخته‌اید."
          emptyDescription="یک تلاش محدود را مستقل یا زیر یکی از هدف‌های فعال ثبت کنید."
          emptyAction={projectFormOpen ? undefined : <button className="secondary-button" type="button" onClick={() => setProjectFormOpen(true)}>ساخت پروژه</button>}
          onRetry={() => projects.refetch()}
        >
          <ul className="grid gap-4 md:grid-cols-2">
            {projectItems.map(project => (
              <li key={project.id}>
                <Link className="resource-card entity-project h-full" to="/projects/$projectId" params={{ projectId: project.id }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <EntityLabel entity="project" />
                      <h3 className="mt-2 truncate text-lg font-bold leading-snug">{project.title}</h3>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                  {project.completionMeaning && <p className="mt-3 line-clamp-2 text-sm leading-7 text-text-secondary">{project.completionMeaning}</p>}
                  <p className="mt-5 border-t border-border-subtle pt-3 text-xs text-text-secondary">
                    بازبینی <time dateTime={project.reviewDate}>{formatDate(project.reviewDate)}</time>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {projects.hasNextPage && (
            <button
              className="secondary-button mt-5 w-full sm:w-auto"
              type="button"
              disabled={projects.isFetchingNextPage}
              onClick={() => projects.fetchNextPage()}
            >
              {projects.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش پروژه‌های بیشتر'}
            </button>
          )}
        </ResourceState>
      </section>
    </div>
  )
}

function SectionHeading({ id, title, description, fetching, actionLabel, onAction }: {
  id: string
  title: string
  description: string
  fetching: boolean
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold sm:text-2xl" id={id}>{title}</h2>
          {fetching && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">{description}</p>
      </div>
      <button className="primary-button w-full sm:w-auto" type="button" onClick={onAction}>{actionLabel}</button>
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
  const submit = form.handleSubmit(values => onSubmit({
    ...values,
    targetDate: nullable(values.targetDate),
    reviewDate: nullable(values.reviewDate),
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-goal" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="goal" />
        <h3 className="mt-2 text-xl font-bold">ساخت هدف</h3>
        <p className="mt-1 text-sm text-text-secondary">هدف یک نتیجه یا جهت مهم است؛ تحقق آن را خودتان تأیید می‌کنید.</p>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان هدف" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField label="نتیجه مطلوب" name="desiredOutcome" required multiline maxLength={2000} registration={form.register('desiredOutcome')} error={form.formState.errors.desiredOutcome?.message} hint="به‌صورت روشن بنویسید رسیدن به این هدف برای شما چه معنایی دارد." />
      <div className="form-grid">
        <FormField label="تاریخ هدف (اختیاری)" name="targetDate" type="date" registration={form.register('targetDate')} error={form.formState.errors.targetDate?.message} />
        <FormField label="تاریخ بازبینی (اختیاری)" name="reviewDate" type="date" registration={form.register('reviewDate')} error={form.formState.errors.reviewDate?.message} />
      </div>
      <FormError error={error} />
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending}>{pending ? 'در حال ساخت…' : 'ساخت هدف'}</button>
      </div>
    </form>
  )
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
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    completionMeaning: nullable(values.completionMeaning),
    goalId: nullable(values.goalId),
    targetDate: nullable(values.targetDate),
    reviewDate: nullable(values.reviewDate),
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-project" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="project" />
        <h3 className="mt-2 text-xl font-bold">ساخت پروژه</h3>
        <p className="mt-1 text-sm text-text-secondary">پروژه یک تلاش محدود و قابل‌مدیریت است و می‌تواند مستقل باشد.</p>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان پروژه" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField label="معنای تکمیل (اختیاری)" name="completionMeaning" multiline maxLength={2000} registration={form.register('completionMeaning')} hint="توضیح دهید چه زمانی این تلاش را تمام‌شده می‌دانید." />
      <label className="field-label">
        هدف بالادست (اختیاری)
        <select className="field-input" {...form.register('goalId')}>
          <option value="">بدون هدف</option>
          {goals.filter(goal => goal.status === 'ACTIVE').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
        </select>
      </label>
      <div className="form-grid">
        <FormField label="تاریخ هدف (اختیاری)" name="targetDate" type="date" registration={form.register('targetDate')} error={form.formState.errors.targetDate?.message} />
        <FormField label="تاریخ بازبینی (اختیاری)" name="reviewDate" type="date" registration={form.register('reviewDate')} error={form.formState.errors.reviewDate?.message} />
      </div>
      <FormError error={error} />
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending}>{pending ? 'در حال ساخت…' : 'ساخت پروژه'}</button>
      </div>
    </form>
  )
}

const nullable = (value: string) => value || null

export const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('fa-IR').format(new Date(`${value}T00:00:00`))
  : 'تعیین نشده'
