import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Repeat, X } from '../../../shared/ui/icons'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { formatLocalDate, formatTime, toIsoDate } from '../../../shared/lib/date'
import { emptyToNull } from '../../../shared/lib/forms'
import { DateField } from '../../../shared/ui/DateField'
import { ChoiceField, FormError, FormField, LabelText, MoreFields, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'
import { ParentChoice } from '../../tasks/components/ParentChoice'
import { TaskParentSelect } from '../../tasks/components/TaskParentSelect'
import { recurrenceLabel, slotsLabel, weekdayOptions } from '../types/routine.format'
import { type RoutineFields, routineFieldsSchema } from '../types/routine.schema'
import type { CreateRoutineRequest, RoutineDto, UpdateRoutineRequest } from '../types/routine.types'

const recurrenceOptions = [
  { value: 'DAILY', label: 'هر روز' },
  { value: 'SPECIFIC_WEEKDAYS', label: 'روزهای هفته' },
  { value: 'MONTHLY_ON_DAY', label: 'ماهانه' },
] as const

/**
 * Create/edit form for a Routine, rendered as the body of a Sheet.
 * `routine` edits it in place; `source` prefills a continuation of a stopped
 * Routine (a new Routine, so it also asks for its first date); `initialTitle`
 * prefills a Routine made from a quick capture.
 */
export function RoutineForm({ routine, source, initialTitle, goals, projects, pending, error, onSubmit, onCancel }: {
  routine?: RoutineDto
  source?: RoutineDto
  initialTitle?: string
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
      title: initial?.title ?? initialTitle ?? '',
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
      <FormField
        label={routine ? 'عنوان روتین' : 'چه کاری تکرار می‌شود؟'}
        name="title"
        required
        autoFocus
        prominent
        maxLength={200}
        placeholder="مثلاً: ده دقیقه مرور لغت"
        registration={form.register('title')}
        error={errors.title?.message}
      />
      <Controller
        control={form.control}
        name="recurrenceType"
        render={({ field }) => <ChoiceField label="هر چند وقت؟" value={field.value} options={recurrenceOptions} onChange={field.onChange} />}
      />
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
                      className="choice-chip"
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
          name="parentScope"
          render={({ field }) => <ParentChoice goals={goals} projects={projects} value={field.value} onChange={field.onChange} />}
        />
      )}
      <MoreFields
        summary={routine ? 'توضیحات و وابستگی' : 'توضیحات و تاریخ شروع'}
        defaultOpen={Boolean(initial && (initial.description || initialGoalId || initialProjectId))}
        forceOpen={Boolean(errors.description || errors.effectiveFrom)}
      >
        <FormField label="توضیحات (اختیاری)" name="description" multiline maxLength={2000} registration={form.register('description')} error={errors.description?.message} />
        {routine && (
          <Controller
            control={form.control}
            name="parentScope"
            render={({ field }) => (
              <TaskParentSelect
              goals={goals}
              projects={projects}
              currentGoalId={routine?.goalId}
              currentProjectId={routine?.projectId}
              standaloneLabel="روتین مستقل"
              value={field.value}
              onChange={field.onChange}
            />
            )}
          />
        )}
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
      </MoreFields>
      {routine && <p className="notice">تغییر در تکرار یا ساعت‌ها از فردا اعمال می‌شود؛ برنامه امروز تغییر نمی‌کند.</p>}
      <FormError error={error} />
      <div className="sheet-actions flex-wrap">
        {!routine && <ScheduleSummary values={form.watch()} today={toIsoDate(new Date())} />}
        <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره…' : routine ? 'ذخیره تغییرات' : 'ساخت روتین'}
        </button>
      </div>
    </form>
  )
}

/** The Routine being made, in one line: how often, at what time, from when. */
function ScheduleSummary({ values, today }: { values: RoutineFields; today: string }) {
  const recurrence = recurrenceLabel({
    type: values.recurrenceType,
    daysOfWeek: values.daysOfWeek,
    dayOfMonth: values.dayOfMonth ? Number(values.dayOfMonth) : null,
  })
  const times = values.timesOfDay.length > 0 ? `ساعت ${slotsLabel([...values.timesOfDay].sort())}` : 'بدون ساعت'
  const from = !values.effectiveFrom || values.effectiveFrom === today ? 'از امروز' : `از ${formatLocalDate(values.effectiveFrom)}`
  return (
    <p className="entity-ink flex basis-full items-center gap-1.5 text-xs font-bold" aria-live="polite">
      <Repeat size={14} aria-hidden="true" />
      {recurrence || 'روزی انتخاب نشده'}، {times}، {from}
    </p>
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
      <label className="field-label" htmlFor={id}><LabelText>چه ساعتی؟ (اختیاری)</LabelText></label>
      {sorted.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="ساعت‌های ثبت‌شده">
          {sorted.map(time => (
            <li key={time} className="time-chip">
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
        <button className="secondary-button min-h-12 shrink-0" type="button" disabled={!draft} onClick={add}>
          <Plus size={18} aria-hidden="true" />
          افزودن ساعت
        </button>
      </div>
      <span className="field-hint">برای چند نوبت در روز، هر ساعت را جدا اضافه کنید. بدون ساعت، روتین یک بار در روز است.</span>
      {duplicate && <span className="field-error" role="alert">این ساعت قبلاً اضافه شده است.</span>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  )
}
