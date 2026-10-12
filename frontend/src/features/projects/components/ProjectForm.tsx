import { zodResolver } from '@hookform/resolvers/zod'
import { CircleDashed } from '../../../shared/ui/icons'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { DateField } from '../../../shared/ui/DateField'
import { EntityMark } from '../../../shared/ui/EntityUi'
import { FormError, FormField, MoreFields, ValidationSummary } from '../../../shared/ui/FormUi'
import { SelectField } from '../../../shared/ui/SelectField'
import type { GoalDto } from '../../goals/types/goal.types'
import { type ProjectFields, projectFieldsSchema } from '../types/project.schema'
import type { CreateProjectRequest, ProjectDto, UpdateProjectRequest } from '../types/project.types'

/** Create/edit form for a Project, rendered as the body of a Sheet. Passing `project` switches it to edit mode. */
export function ProjectForm({ project, goals, pending, error, onSubmit, onCancel }: {
  project?: ProjectDto
  goals: GoalDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateProjectRequest | UpdateProjectRequest) => void
  onCancel: () => void
}) {
  const form = useForm<ProjectFields>({
    resolver: zodResolver(projectFieldsSchema),
    defaultValues: {
      title: project?.title ?? '',
      completionMeaning: project?.completionMeaning ?? '',
      goalId: project?.goalId ?? '',
      targetDate: project?.targetDate ?? '',
      reviewDate: project?.reviewDate ?? '',
    },
  })
  const { errors } = form.formState
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    completionMeaning: emptyToNull(values.completionMeaning),
    goalId: emptyToNull(values.goalId),
    targetDate: emptyToNull(values.targetDate),
    reviewDate: emptyToNull(values.reviewDate),
    ...(project ? { expectedVersion: project.version } : {}),
  }))
  // Only active Goals can take a Project, plus the one this Project already belongs to.
  const selectableGoals = goals.filter(goal => goal.status === 'ACTIVE' || goal.id === project?.goalId)

  return (
    <form className="form-stack" onSubmit={submit} noValidate aria-busy={pending}>
      <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
      <FormField label="عنوان پروژه" name="title" required autoFocus maxLength={200} placeholder="این تلاش چه نامی دارد؟" registration={form.register('title')} error={errors.title?.message} />
      <FormField
        label="معنای تکمیل (اختیاری)"
        name="completionMeaning"
        multiline
        maxLength={2000}
        registration={form.register('completionMeaning')}
        hint="چه زمانی این تلاش را تمام‌شده می‌دانید؟"
      />
      <Controller
        control={form.control}
        name="goalId"
        render={({ field }) => (
          <SelectField
            label="هدف بالادست (اختیاری)"
            value={field.value}
            onChange={field.onChange}
            searchPlaceholder="نام هدف…"
            options={[
              { value: '', label: 'بدون هدف', icon: <CircleDashed size={20} className="shrink-0 text-text-tertiary" aria-hidden="true" /> },
              ...selectableGoals.map(goal => ({ value: goal.id, label: goal.title, icon: <EntityMark entity="goal" /> })),
            ]}
          />
        )}
      />
      <MoreFields
        summary="تاریخ هدف و تاریخ بازبینی"
        defaultOpen={Boolean(project?.targetDate || project?.reviewDate)}
        forceOpen={Boolean(errors.targetDate || errors.reviewDate)}
      >
        <Controller
          control={form.control}
          name="targetDate"
          render={({ field }) => <DateField label="تاریخ هدف (اختیاری)" value={field.value} onChange={field.onChange} error={errors.targetDate?.message} />}
        />
        <Controller
          control={form.control}
          name="reviewDate"
          render={({ field }) => <DateField label="تاریخ بازبینی (اختیاری)" value={field.value} onChange={field.onChange} error={errors.reviewDate?.message} />}
        />
      </MoreFields>
      <FormError error={error} />
      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره…' : project ? 'ذخیره تغییرات' : 'ساخت پروژه'}
        </button>
      </div>
    </form>
  )
}
