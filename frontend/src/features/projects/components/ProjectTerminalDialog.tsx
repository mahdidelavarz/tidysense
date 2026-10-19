import { TerminalDialog, type TerminalItem } from '../../../shared/ui/TerminalDialog'
import type { ProjectTerminalPreview } from '../types/project.types'

/**
 * Project-specific copy around the shared terminal confirmation. A Project is
 * only ever stopped by hand; it completes itself when its Tasks are done.
 */
export function ProjectTerminalDialog({ projectTitle, preview, pending, onCancel, onConfirm }: {
  projectTitle: string
  preview: ProjectTerminalPreview
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <TerminalDialog
      entity="project"
      entityTitle={projectTitle}
      title="توقف پروژه"
      tone="attention"
      confirmLabel="تأیید توقف پروژه"
      pending={pending}
      canApply={preview.canApply}
      blockers={preview.blockers.map(blocker => ({ id: blocker.resourceId, kind: 'Task', title: blocker.title }))}
      cascades={preview.cascades.map(cascade => ({
        id: cascade.resourceId,
        kind: cascade.resourceType as TerminalItem['kind'],
        title: cascade.title,
      }))}
      notes={[
        '«متوقف‌شده» ثبت می‌شود و به «پایان‌یافته‌ها» می‌رود.',
        'هر چه زیرش باز است هم تمام می‌شود و از «امروز» برداشته می‌شود؛ کارهای انجام‌شده و سابقه‌اش می‌مانند.',
        'وضعیت هدف بالادست با این کار خودکار تغییر نمی‌کند.',
      ]}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
