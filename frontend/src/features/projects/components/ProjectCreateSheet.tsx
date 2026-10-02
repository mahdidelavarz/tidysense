import { showToast } from '../../../shared/lib/ui-store'
import { Sheet } from '../../../shared/ui/Sheet'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { useCreateProject } from '../hooks/project-hooks'
import type { CreateProjectRequest } from '../types/project.types'
import { ProjectForm } from './ProjectForm'

/** The create-Project flow, opened from anywhere through the shell's create menu. */
export function ProjectCreateSheet({ onClose }: { onClose: () => void }) {
  const goals = useGoalOptions()
  const create = useCreateProject()
  return (
    <Sheet
      title="پروژه جدید"
      description="پروژه یک تلاش محدود با پایان مشخص است."
      onClose={onClose}
      locked={create.isPending}
    >
      <ProjectForm
        goals={goals.data?.items ?? []}
        pending={create.isPending}
        error={create.error}
        onCancel={onClose}
        onSubmit={request => create.mutate(request as CreateProjectRequest, {
          onSuccess: () => {
            onClose()
            showToast('پروژه ساخته شد.')
          },
        })}
      />
    </Sheet>
  )
}
