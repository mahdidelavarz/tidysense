import { TerminalDialog } from '../../../shared/ui/TerminalDialog'
import type { GoalTerminalPreview } from '../types/goal.types'

/** Goal-specific copy around the shared terminal confirmation. */
export function GoalTerminalDialog({ goalTitle, preview, pending, onCancel, onConfirm }: {
  goalTitle: string
  preview: GoalTerminalPreview
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const achieved = preview.targetStatus === 'ACHIEVED'
  return (
    <TerminalDialog
      entity="goal"
      entityTitle={goalTitle}
      title={achieved ? 'رسیدن به هدف' : 'رها کردن هدف'}
      tone={achieved ? 'positive' : 'attention'}
      confirmLabel={achieved ? 'تأیید تحقق هدف' : 'رها کردن هدف'}
      pending={pending}
      canApply={preview.canApply}
      blockers={preview.blockers.map(blocker => ({
        id: blocker.resourceId,
        kind: blocker.resourceType as 'Project' | 'Task' | 'Routine',
        title: blocker.title,
      }))}
      notes={achieved
        ? ['«محقق‌شده» ثبت می‌شود و به «پایان‌یافته‌ها» می‌رود.', 'سابقه‌اش، کارهای انجام‌شده و یادداشت‌ها می‌مانند.']
        : ['«رهاشده» ثبت می‌شود و به «پایان‌یافته‌ها» می‌رود.', 'سابقه‌اش، کارهای انجام‌شده و یادداشت‌ها می‌مانند.', 'رها کردن شکست نیست؛ یعنی جایش را به چیز مهم‌تری دادید.']}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
