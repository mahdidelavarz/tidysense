import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { DateField } from '../../../shared/ui/DateField'
import { ChoiceField, FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import { SelectField } from '../../../shared/ui/SelectField'
import { Sheet } from '../../../shared/ui/Sheet'
import { weekdayOptions } from '../../routines/types/routine.format'
import { type ProposalFields, proposalFieldsSchema } from '../types/planning.schema'
import type { PlanningDraftDto, PlanningProposal } from '../types/planning.types'

const sheetTitles: Record<string, string> = {
  GOAL: 'ویرایش هدف پیشنهادی', PROJECT: 'ویرایش پروژه پیشنهادی', TASK: 'ویرایش کار پیشنهادی', ROUTINE: 'ویرایش روتین پیشنهادی',
}
const supported = ['DAILY', 'SPECIFIC_WEEKDAYS', 'MONTHLY_ON_DAY']

/**
 * Edits one proposal before approval. Saving stores a new draft revision on
 * the server; nothing canonical is created or changed. Where an item belongs
 * is edited here too, so a child can be detached or moved explicitly instead
 * of silently following an excluded parent.
 */
export function ProposalEditSheet({ proposal, draft, pending, error, onSubmit, onClose }: {
  proposal: PlanningProposal
  draft: PlanningDraftDto
  pending: boolean
  error: unknown
  onSubmit: (changed: PlanningProposal) => void
  onClose: () => void
}) {
  const type = proposal.entityType
  const isParent = type === 'GOAL' || type === 'PROJECT'
  // A Project may sit under a Goal; a Task or Routine under a Goal or a Project.
  const parents = draft.proposals.map(item => item.proposal).filter(item =>
    item.draftId !== proposal.draftId &&
    (type === 'PROJECT' ? item.entityType === 'GOAL' : type !== 'GOAL' && (item.entityType === 'GOAL' || item.entityType === 'PROJECT')))
  const contextAllowed = draft.context !== null && type !== 'GOAL' && !(type === 'PROJECT' && draft.context.type === 'PROJECT')

  const form = useForm<ProposalFields>({
    resolver: zodResolver(proposalFieldsSchema),
    defaultValues: {
      entityType: type,
      title: proposal.title,
      description: proposal.description ?? '',
      parent: proposal.parentDraftId ? `draft:${proposal.parentDraftId}` : proposal.underContext ? 'context' : 'none',
      desiredOutcome: proposal.desiredOutcome ?? '',
      completionMeaning: proposal.completionMeaning ?? '',
      targetDate: proposal.targetDate ?? '',
      reviewDate: proposal.reviewDate ?? '',
      plannedDate: proposal.plannedDate ?? '',
      deadline: proposal.deadline ?? '',
      recurrenceType: (proposal.recurrence && supported.includes(proposal.recurrence.type)
        ? proposal.recurrence.type : '') as ProposalFields['recurrenceType'],
      daysOfWeek: (proposal.recurrence?.daysOfWeek ?? []).map(Number),
      dayOfMonth: proposal.recurrence?.dayOfMonth != null ? String(proposal.recurrence.dayOfMonth) : '',
      effectiveFrom: proposal.effectiveFromLocalDate ?? '',
    },
  })
  const { errors } = form.formState
  const recurrenceType = form.watch('recurrenceType')

  const submit = form.handleSubmit(values => onSubmit({
    ...proposal,
    title: values.title,
    description: emptyToNull(values.description),
    parentDraftId: values.parent.startsWith('draft:') ? values.parent.slice('draft:'.length) : null,
    underContext: values.parent === 'context',
    desiredOutcome: type === 'GOAL' ? values.desiredOutcome : null,
    completionMeaning: type === 'PROJECT' ? emptyToNull(values.completionMeaning) : null,
    targetDate: isParent ? emptyToNull(values.targetDate) : null,
    // An emptied review date goes back to the product default; it is never left missing.
    reviewDate: isParent ? emptyToNull(values.reviewDate) : null,
    plannedDate: type === 'TASK' ? emptyToNull(values.plannedDate) : null,
    deadline: type === 'TASK' ? emptyToNull(values.deadline) : null,
    recurrence: type === 'ROUTINE'
      ? {
          type: values.recurrenceType,
          daysOfWeek: values.recurrenceType === 'SPECIFIC_WEEKDAYS' ? values.daysOfWeek : null,
          dayOfMonth: values.recurrenceType === 'MONTHLY_ON_DAY' ? Number(values.dayOfMonth) : null,
        }
      : null,
    effectiveFromLocalDate: type === 'ROUTINE' ? emptyToNull(values.effectiveFrom) : null,
  }))

  const date = (name: 'targetDate' | 'reviewDate' | 'plannedDate' | 'deadline' | 'effectiveFrom', label: string, hint?: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => <DateField label={label} hint={hint} value={field.value} onChange={field.onChange} error={errors[name]?.message} />}
    />
  )

  return (
    <Sheet
      title={sheetTitles[type] ?? 'ویرایش پیشنهاد'}
      description="این تغییر فقط پیش‌نویس را عوض می‌کند. تا تأیید نهایی چیزی ساخته نمی‌شود."
      onClose={onClose}
      locked={pending}
    >
      <form className="form-stack" onSubmit={submit} noValidate aria-busy={pending}>
        <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
        <FormField label="عنوان" name="title" required autoFocus maxLength={200} registration={form.register('title')} error={errors.title?.message} />
        {type === 'GOAL' && (
          <FormField label="نتیجه مطلوب" name="desiredOutcome" required multiline maxLength={2000} registration={form.register('desiredOutcome')} error={errors.desiredOutcome?.message} />
        )}
        {type === 'PROJECT' && (
          <FormField label="معنای تکمیل (اختیاری)" name="completionMeaning" multiline maxLength={2000} registration={form.register('completionMeaning')} error={errors.completionMeaning?.message} />
        )}
        {!isParent && (
          <FormField label="توضیحات (اختیاری)" name="description" multiline maxLength={2000} registration={form.register('description')} error={errors.description?.message} />
        )}

        {type !== 'GOAL' && (
          <Controller
            control={form.control}
            name="parent"
            render={({ field }) => (
              <SelectField
                label="جایگاه"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'none', label: 'مستقل' },
                  ...(contextAllowed && draft.context ? [{ value: 'context', label: `زیر «${draft.context.title}»` }] : []),
                  ...parents.map(item => ({ value: `draft:${item.draftId}`, label: `زیر «${item.title}»` })),
                ]}
              />
            )}
          />
        )}

        {isParent && (
          <div className="form-grid">
            {date('targetDate', 'تاریخ هدف (اختیاری)')}
            {date('reviewDate', 'تاریخ بازبینی', 'اگر خالی بماند، پیش‌فرض برنامه گذاشته می‌شود.')}
          </div>
        )}
        {type === 'TASK' && (
          <div className="form-grid">
            {date('plannedDate', 'تاریخ برنامه‌ریزی', 'باید در هفت روز پیش رو باشد.')}
            {date('deadline', 'مهلت (اختیاری)')}
          </div>
        )}
        {type === 'ROUTINE' && (
          <>
            <Controller
              control={form.control}
              name="recurrenceType"
              render={({ field }) => (
                <ChoiceField
                  label="تکرار"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.recurrenceType?.message}
                  options={[
                    { value: 'DAILY', label: 'هر روز' },
                    { value: 'SPECIFIC_WEEKDAYS', label: 'روزهای مشخص هفته' },
                    { value: 'MONTHLY_ON_DAY', label: 'یک روز مشخص در هر ماه' },
                  ]}
                />
              )}
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
                  </fieldset>
                )}
              />
            )}
            {recurrenceType === 'MONTHLY_ON_DAY' && (
              <FormField label="روز ماه" name="dayOfMonth" type="number" required registration={form.register('dayOfMonth')} error={errors.dayOfMonth?.message} />
            )}
            {date('effectiveFrom', 'تاریخ شروع (اختیاری)', 'اگر خالی بماند، از روز تأیید شروع می‌شود.')}
          </>
        )}

        <FormError error={error} />
        <div className="sheet-actions">
          <button className="secondary-button" type="button" disabled={pending} onClick={onClose}>انصراف</button>
          <button className="primary-button" type="submit" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره در پیش‌نویس'}</button>
        </div>
      </form>
    </Sheet>
  )
}
