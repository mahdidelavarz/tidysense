import { type CreateTarget, useUiStore } from '../../../shared/lib/ui-store'
import { type EntityKind, EntityIcon } from '../../../shared/ui/EntityUi'
import { Sheet } from '../../../shared/ui/Sheet'
import { GoalCreateSheet } from '../../goals/components/GoalCreateSheet'
import { ProjectCreateSheet } from '../../projects/components/ProjectCreateSheet'
import { RoutineCreateSheet } from '../../routines/components/RoutineCreateSheet'
import { TaskCreateSheet } from '../../tasks/components/TaskCreateSheet'

const choices: Array<{ target: Exclude<CreateTarget, 'menu'>; entity: EntityKind; label: string; description: string }> = [
  { target: 'task', entity: 'task', label: 'کار', description: 'یک اقدام روشن که می‌توان انجامش داد.' },
  { target: 'routine', entity: 'routine', label: 'روتین', description: 'کاری که در روزها یا ساعت‌های مشخص تکرار می‌شود.' },
  { target: 'project', entity: 'project', label: 'پروژه', description: 'یک تلاش محدود با پایان مشخص.' },
  { target: 'goal', entity: 'goal', label: 'هدف', description: 'نتیجه یا جهتی که برایتان مهم است.' },
]

/**
 * The one create flow for the whole app. The tab bar, the sidebar, page
 * headers and empty states all open it through the UI store, so creating
 * something looks and behaves the same from everywhere.
 */
export function CreateSheet() {
  const target = useUiStore(state => state.createTarget)
  const openCreate = useUiStore(state => state.openCreate)
  const close = useUiStore(state => state.closeCreate)

  if (target === 'task') return <TaskCreateSheet onClose={close} />
  if (target === 'routine') return <RoutineCreateSheet onClose={close} />
  if (target === 'project') return <ProjectCreateSheet onClose={close} />
  if (target === 'goal') return <GoalCreateSheet onClose={close} />
  if (target !== 'menu') return null

  return (
    <Sheet title="چه چیزی اضافه می‌کنید؟" onClose={close}>
      <ul className="grid grid-cols-2 gap-3">
        {choices.map(choice => (
          <li key={choice.target}>
            <button
              className={`entity-card entity-${choice.entity} flex w-full flex-col items-start gap-3 rounded-2xl p-4 text-start`}
              type="button"
              onClick={() => openCreate(choice.target)}
            >
              <EntityIcon entity={choice.entity} />
              <span className="min-w-0">
                <span className="block text-base font-bold">{choice.label}</span>
                <span className="block text-xs font-normal leading-5 text-text-secondary">{choice.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
