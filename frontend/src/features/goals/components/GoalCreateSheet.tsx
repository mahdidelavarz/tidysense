import { showToast } from '../../../shared/lib/ui-store'
import { Sheet } from '../../../shared/ui/Sheet'
import { useCreateGoal } from '../hooks/goal-hooks'
import type { CreateGoalRequest } from '../types/goal.types'
import { GoalForm } from './GoalForm'

/** The create-Goal flow, opened from anywhere through the shell's create menu. */
export function GoalCreateSheet({ onClose }: { onClose: () => void }) {
  const create = useCreateGoal()
  return (
    <Sheet
      title="هدف جدید"
      description="هدف یک نتیجه یا جهت مهم است، نه یک کار روزانه."
      onClose={onClose}
      locked={create.isPending}
    >
      <GoalForm
        pending={create.isPending}
        error={create.error}
        onCancel={onClose}
        onSubmit={request => create.mutate(request as CreateGoalRequest, {
          onSuccess: () => {
            onClose()
            showToast('هدف ساخته شد.')
          },
        })}
      />
    </Sheet>
  )
}
