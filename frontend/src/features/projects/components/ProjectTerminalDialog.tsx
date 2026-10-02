import { Link } from '@tanstack/react-router'
import { TerminalDialog } from '../../../shared/ui/TerminalDialog'
import type { ProjectTerminalPreview } from '../types/project.types'

/** Project-specific copy and blocker links around the shared terminal confirmation dialog. */
export function ProjectTerminalDialog({ preview, pending, onCancel, onConfirm }: {
  preview: ProjectTerminalPreview
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const completed = preview.targetStatus === 'COMPLETED'
  const action = completed ? 'تکمیل پروژه' : 'توقف پروژه'
  return (
    <TerminalDialog
      title={`تأیید ${action}`}
      description="وضعیت هدف بالادست با این کار خودکار تغییر نمی‌کند."
      tone={completed ? 'positive' : 'attention'}
      confirmLabel={`تأیید ${action}`}
      pendingLabel="در حال ثبت…"
      pending={pending}
      canApply={preview.canApply}
      blockersIntro="ابتدا کارهای فعال این پروژه را تعیین تکلیف کنید:"
      blockers={preview.blockers.map(blocker => ({
        id: blocker.resourceId,
        label: <Link className="text-link" to="/tasks/$taskId" params={{ taskId: blocker.resourceId }}>مشاهده کار فعال</Link>,
      }))}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
