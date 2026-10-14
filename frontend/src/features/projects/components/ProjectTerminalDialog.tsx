import { TerminalDialog } from '../../../shared/ui/TerminalDialog'
import type { ProjectTerminalPreview } from '../types/project.types'

/** Project-specific copy around the shared terminal confirmation. */
export function ProjectTerminalDialog({ projectTitle, preview, pending, onCancel, onConfirm }: {
  projectTitle: string
  preview: ProjectTerminalPreview
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const completed = preview.targetStatus === 'COMPLETED'
  return (
    <TerminalDialog
      entity="project"
      entityTitle={projectTitle}
      title={completed ? 'تمام شدن پروژه' : 'توقف پروژه'}
      tone={completed ? 'positive' : 'attention'}
      confirmLabel={completed ? 'تأیید تکمیل پروژه' : 'تأیید توقف پروژه'}
      pending={pending}
      canApply={preview.canApply}
      blockers={preview.blockers.map(blocker => ({ id: blocker.resourceId, kind: 'Task', title: blocker.title }))}
      cascades={preview.cascades.map(cascade => ({ id: cascade.resourceId, kind: 'Routine', title: cascade.title }))}
      notes={[
        completed ? '«تکمیل‌شده» ثبت می‌شود و به «پایان‌یافته‌ها» می‌رود.' : '«متوقف‌شده» ثبت می‌شود و به «پایان‌یافته‌ها» می‌رود.',
        'سابقه‌اش و کارهای انجام‌شده می‌مانند.',
        'وضعیت هدف بالادست با این کار خودکار تغییر نمی‌کند.',
      ]}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
