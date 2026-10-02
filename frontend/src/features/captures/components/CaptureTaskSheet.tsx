import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { showToast } from '../../../shared/lib/ui-store'
import { DateField } from '../../../shared/ui/DateField'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import { Sheet } from '../../../shared/ui/Sheet'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useProjectOptions } from '../../projects/hooks/project-hooks'
import { TaskParentSelect } from '../../tasks/components/TaskParentSelect'
import { useResolveCaptureToTask } from '../hooks/capture-hooks'
import { type CaptureTaskFields, captureTaskFieldsSchema } from '../types/capture.schema'
import type { CaptureDto } from '../types/capture.types'

/** Turns a capture into a Task by giving it what makes it a commitment: a date or an owner. */
export function CaptureTaskSheet({ capture, onClose }: { capture: CaptureDto; onClose: () => void }) {
  const goals = useGoalOptions()
  const projects = useProjectOptions()
  const resolve = useResolveCaptureToTask()
  const form = useForm<CaptureTaskFields>({
    resolver: zodResolver(captureTaskFieldsSchema),
    defaultValues: { title: capture.title, parentScope: 'none', plannedDate: '', deadline: '' },
  })
  const { errors } = form.formState
  const submit = form.handleSubmit(values => {
    const [scope, parentId] = values.parentScope.split(':')
    resolve.mutate({
      id: capture.id,
      request: {
        expectedVersion: capture.version,
        title: values.title,
        description: null,
        goalId: scope === 'goal' ? parentId : null,
        projectId: scope === 'project' ? parentId : null,
        plannedDate: emptyToNull(values.plannedDate),
        deadline: emptyToNull(values.deadline),
      },
    }, {
      onSuccess: () => {
        onClose()
        showToast('یادداشت به کار تبدیل شد.')
      },
    })
  })

  return (
    <Sheet
      title="تبدیل به کار"
      description="با تاریخ یا با انتخاب یک هدف یا پروژه، این یادداشت به یک کار واقعی تبدیل می‌شود."
      onClose={onClose}
      locked={resolve.isPending}
    >
      <form className="form-stack" onSubmit={submit} noValidate aria-busy={resolve.isPending}>
        <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
        <FormField label="عنوان کار" name="title" required maxLength={200} registration={form.register('title')} error={errors.title?.message} />
        <TaskParentSelect
          goals={goals.data?.items ?? []}
          projects={projects.data?.items ?? []}
          registration={form.register('parentScope')}
        />
        <div className="form-grid">
          <Controller
            control={form.control}
            name="plannedDate"
            render={({ field }) => <DateField label="تاریخ برنامه‌ریزی" value={field.value} onChange={field.onChange} error={errors.plannedDate?.message} />}
          />
          <Controller
            control={form.control}
            name="deadline"
            render={({ field }) => <DateField label="مهلت (اختیاری)" value={field.value} onChange={field.onChange} error={errors.deadline?.message} />}
          />
        </div>
        <FormError error={resolve.error} />
        <div className="sheet-actions">
          <button className="secondary-button" type="button" disabled={resolve.isPending} onClick={onClose}>انصراف</button>
          <button className="primary-button" type="submit" disabled={resolve.isPending}>
            {resolve.isPending ? 'در حال ذخیره…' : 'ساخت کار'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
