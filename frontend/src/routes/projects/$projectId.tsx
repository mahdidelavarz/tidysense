import { createFileRoute } from '@tanstack/react-router'
import { ProjectReadView } from '../../features/projects/components/ProjectReadView'

export const Route = createFileRoute('/projects/$projectId')({ component: ProjectRoute })

function ProjectRoute() {
  const { projectId } = Route.useParams()
  return <ProjectReadView projectId={projectId} />
}
