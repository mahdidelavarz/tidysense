import { TerminalDialog, type TerminalItem } from '../../../shared/ui/TerminalDialog'
import type { GoalTerminalPreview } from '../types/goal.types'

/** Goal-specific copy around the shared terminal confirmation. Stopping a Goal ends everything open under it. */
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
      title={achieved ? 'رسیدن به هدف' : 'توقف هدف'}
      tone={achieved ? 'positive' : 'attention'}
      confirmLabel={achieved ? 'تأیید تحقق هدف' : 'تأیید توقف هدف'}
      pending={pending}
      canApply={preview.canApply}
      blockers={preview.blockers.map(blocker => ({
        id: blocker.resourceId,
        kind: blocker.resourceType as TerminalItem['kind'],
        title: blocker.title,
      }))}
      cascades={preview.cascades.map(cascade => ({
        id: cascade.resourceId,
        kind: cascade.resourceType as TerminalItem['kind'],
        title: cascade.title,
      }))}
      notes={achieved
        ? ['«محقق‌شده» ثبت می‌شود و به «پایان‌یافته‌ها» می‌رود.', 'سابقه‌اش، کارهای انجام‌شده و یادداشت‌ها می‌مانند.']
        : [
            '«متوقف‌شده» ثبت می‌شود و به «پایان‌یافته‌ها» می‌رود.',
            'هر چه زیرش باز است هم تمام می‌شود و از «امروز» برداشته می‌شود؛ کارهای انجام‌شده، سابقه و یادداشت‌ها می‌مانند.',
            'توقف شکست نیست؛ یعنی جایش را به چیز مهم‌تری دادید.',
          ]}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
