import { Link } from '@tanstack/react-router'
import { TerminalDialog } from '../../../shared/ui/TerminalDialog'
import type { GoalTerminalPreview } from '../types/goal.types'

/** Goal-specific copy and blocker links around the shared terminal confirmation dialog. */
export function GoalTerminalDialog({ preview, pending, onCancel, onConfirm }: {
  preview: GoalTerminalPreview
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const achieved = preview.targetStatus === 'ACHIEVED'
  const action = achieved ? 'تحقق هدف' : 'رها کردن هدف'
  return (
    <TerminalDialog
      title={`تأیید ${action}`}
      description="این تغییر وضعیت صریح است و فقط پس از تأیید شما ثبت می‌شود."
      tone={achieved ? 'positive' : 'attention'}
      confirmLabel={`تأیید ${action}`}
      pendingLabel="در حال ثبت…"
      pending={pending}
      canApply={preview.canApply}
      blockersIntro="ابتدا پروژه‌های فعال و کارهای مستقیم زیر را تعیین تکلیف کنید:"
      blockers={preview.blockers.map(blocker => ({
        id: blocker.resourceId,
        label: blocker.resourceType === 'Task'
          ? <Link className="text-link" to="/tasks/$taskId" params={{ taskId: blocker.resourceId }}>مشاهده کار فعال</Link>
          : <Link className="text-link" to="/projects/$projectId" params={{ projectId: blocker.resourceId }}>مشاهده پروژه فعال</Link>,
      }))}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
