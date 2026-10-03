import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { DateField } from '../../../shared/ui/DateField'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
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
        <FormField label="عنوان" name="title" required maxLength={200} registration={form.register('title')} error={errors.title?.message} />
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
          <label className="field-label">
            جایگاه
            <select className="field-input" {...form.register('parent')}>
              <option value="none">مستقل</option>
              {contextAllowed && draft.context && <option value="context">زیر «{draft.context.title}»</option>}
              {parents.map(item => <option key={item.draftId} value={`draft:${item.draftId}`}>زیر «{item.title}»</option>)}
            </select>
          </label>
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
            <label className="field-label">
              تکرار
              <select className="field-input" aria-invalid={errors.recurrenceType ? true : undefined} {...form.register('recurrenceType')}>
                {recurrenceType === '' && <option value="">انتخاب کنید</option>}
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
