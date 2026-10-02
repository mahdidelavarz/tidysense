import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { formatTime, toIsoDate } from '../../../shared/lib/date'
import { emptyToNull } from '../../../shared/lib/forms'
import { DateField } from '../../../shared/ui/DateField'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'
import { TaskParentSelect } from '../../tasks/components/TaskParentSelect'
import { weekdayOptions } from '../types/routine.format'
import { type RoutineFields, routineFieldsSchema } from '../types/routine.schema'
import type { CreateRoutineRequest, RoutineDto, UpdateRoutineRequest } from '../types/routine.types'

/**
 * Create/edit form for a Routine, rendered as the body of a Sheet.
 * `routine` edits it in place; `source` prefills a continuation of a stopped
 * Routine (a new Routine, so it also asks for its first date).
 */
export function RoutineForm({ routine, source, goals, projects, pending, error, onSubmit, onCancel }: {
  routine?: RoutineDto
  source?: RoutineDto
  goals: GoalDto[]
  projects: ProjectDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateRoutineRequest | UpdateRoutineRequest) => void
  onCancel: () => void
}) {
  const initial = routine ?? source
  // A continuation only offers parents that are still active, so a finished one is not carried over.
  const initialGoalId = routine?.goalId ?? goals.find(goal => goal.id === source?.goalId && goal.status === 'ACTIVE')?.id
  const initialProjectId = routine?.projectId
    ?? projects.find(project => project.id === source?.projectId && project.status === 'ACTIVE')?.id
  const form = useForm<RoutineFields>({
    resolver: zodResolver(routineFieldsSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      parentScope: initialGoalId ? `goal:${initialGoalId}` : initialProjectId ? `project:${initialProjectId}` : 'none',
      recurrenceType: (initial?.recurrence.type as RoutineFields['recurrenceType'] | undefined) ?? 'DAILY',
      daysOfWeek: (initial?.recurrence.daysOfWeek ?? []).map(Number),
      dayOfMonth: initial?.recurrence.dayOfMonth != null ? String(initial.recurrence.dayOfMonth) : '',
      timesOfDay: (initial?.timesOfDay ?? []).map(time => time.slice(0, 5)),
      effectiveFrom: routine ? '' : toIsoDate(new Date()),
    },
  })
  const { errors } = form.formState
  const recurrenceType = form.watch('recurrenceType')
  const submit = form.handleSubmit(values => {
    const [scope, parentId] = values.parentScope.split(':')
    const shared = {
      title: values.title,
      description: emptyToNull(values.description),
      goalId: scope === 'goal' ? parentId : null,
      projectId: scope === 'project' ? parentId : null,
      recurrence: {
        type: values.recurrenceType,
        daysOfWeek: values.recurrenceType === 'SPECIFIC_WEEKDAYS' ? values.daysOfWeek : null,
        dayOfMonth: values.recurrenceType === 'MONTHLY_ON_DAY' ? Number(values.dayOfMonth) : null,
      },
      timesOfDay: [...values.timesOfDay].sort().map(time => `${time}:00`),
    }
    onSubmit(routine
      ? { ...shared, expectedVersion: routine.version }
      : { ...shared, effectiveFromLocalDate: emptyToNull(values.effectiveFrom) })
  })

  return (
    <form className="form-stack" onSubmit={submit} noValidate aria-busy={pending}>
      <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
      <FormField label="عنوان روتین" name="title" required maxLength={200} registration={form.register('title')} error={errors.title?.message} />
      <FormField label="توضیحات (اختیاری)" name="description" multiline maxLength={2000} registration={form.register('description')} error={errors.description?.message} />
      <TaskParentSelect
        goals={goals}
        projects={projects}
        currentGoalId={routine?.goalId}
        currentProjectId={routine?.projectId}
        standaloneLabel="روتین مستقل"
        registration={form.register('parentScope')}
      />
      <label className="field-label">
        تکرار
        <select className="field-input" {...form.register('recurrenceType')}>
          <option value="DAILY">هر روز</option>
          <option value="SPECIFIC_WEEKDAYS">روزهای مشخص هفته</option>
          <option value="MONTHLY_ON_DAY">یک روز مشخص در هر ماه</option>
        </select>
      </label>
      {recurrenceType === 'SPECIFIC_WEEKDAYS' && (
        <Controller
          control={form.control}
          name="daysOfWeek"
          render={({ field }) => (
            <fieldset>
              <legend className="field-label">روزهای هفته</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdayOptions.map(day => {
                  const selected = field.value.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      className="segmented-option border border-border"
                      type="button"
                      aria-pressed={selected}
                      onClick={() => field.onChange(selected
                        ? field.value.filter(value => value !== day.value)
                        : [...field.value, day.value])}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
              {errors.daysOfWeek?.message && <span className="field-error" role="alert">{errors.daysOfWeek.message}</span>}
            </fieldset>
          )}
        />
      )}
      {recurrenceType === 'MONTHLY_ON_DAY' && (
        <FormField
          label="روز ماه"
          name="dayOfMonth"
          type="number"
          required
          hint="روز ماه شمسی. در ماهی که این روز را ندارد، روتین آن ماه اجرا نمی‌شود."
          registration={form.register('dayOfMonth')}
          error={errors.dayOfMonth?.message}
        />
      )}
      <Controller
        control={form.control}
        name="timesOfDay"
        render={({ field }) => <TimeSlotsField value={field.value} onChange={field.onChange} error={errors.timesOfDay?.message} />}
      />
      {!routine && (
        <Controller
          control={form.control}
          name="effectiveFrom"
          render={({ field }) => (
            <DateField
              label="تاریخ شروع"
              hint="اولین روزی که این روتین می‌تواند اجرا شود."
              value={field.value}
              onChange={field.onChange}
              error={errors.effectiveFrom?.message}
            />
          )}
        />
      )}
      {routine && <p className="notice">تغییر در تکرار یا ساعت‌ها از فردا اعمال می‌شود؛ برنامه امروز تغییر نمی‌کند.</p>}
      <FormError error={error} />
      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره…' : routine ? 'ذخیره تغییرات' : 'ساخت روتین'}
        </button>
      </div>
    </form>
  )
}

/** Zero or more unique local times of day. With none, the Routine happens once a day at no fixed time. */
function TimeSlotsField({ value, onChange, error }: {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [duplicate, setDuplicate] = useState(false)
  const sorted = [...value].sort()

  function add() {
    if (!/^\d{2}:\d{2}$/.test(draft)) return
    if (value.includes(draft)) {
      setDuplicate(true)
      return
    }
    onChange([...value, draft])
    setDraft('')
    setDuplicate(false)
  }

  return (
    <div>
      <label className="field-label" htmlFor={id}>ساعت‌های روز (اختیاری)</label>
      <span className="field-hint">برای چند نوبت در روز، هر ساعت را جدا اضافه کنید. بدون ساعت، روتین یک بار در روز است.</span>
      {sorted.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="ساعت‌های ثبت‌شده">
          {sorted.map(time => (
            <li key={time} className="flex items-center gap-1 rounded-full bg-surface-sunken ps-3 text-sm font-bold">
              <bdi dir="ltr">{formatTime(time)}</bdi>
              <button
                className="icon-button size-9"
                type="button"
                aria-label={`حذف ساعت ${formatTime(time)}`}
                onClick={() => onChange(value.filter(item => item !== time))}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <input
          id={id}
          className="field-input"
          type="time"
          dir="ltr"
          value={draft}
          onChange={event => {
            setDraft(event.target.value)
            setDuplicate(false)
          }}
        />
        <button className="secondary-button shrink-0" type="button" disabled={!draft} onClick={add}>
          <Plus size={18} aria-hidden="true" />
          افزودن ساعت
        </button>
      </div>
      {duplicate && <span className="field-error" role="alert">این ساعت قبلاً اضافه شده است.</span>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  )
}
