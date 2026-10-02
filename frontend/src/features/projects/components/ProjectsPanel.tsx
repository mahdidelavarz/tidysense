import { useState } from 'react'
import { useGoalOptions } from '../../goals/hooks/goal-hooks'
import { SectionHeading } from '../../../shared/ui/SectionHeading'
import { ResourceState } from '../../../shared/ui/StateUi'
import { useCreateProject, useProjects } from '../hooks/project-hooks'
import { ProjectCard } from './ProjectCard'
import { ProjectCreateForm } from './ProjectCreateForm'

/** Self-contained Projects section of the workspace dashboard: list, create form and pagination. */
export function ProjectsPanel() {
  const [formOpen, setFormOpen] = useState(false)
  const projects = useProjects()
  const goals = useGoalOptions()
  const create = useCreateProject()
  const items = projects.data?.pages.flatMap(page => page.items) ?? []

  return (
    <section aria-labelledby="projects-heading" className="space-y-5">
      <SectionHeading
        id="projects-heading"
        title="پروژه‌ها"
        description="تلاش‌های محدود و مستقلی که می‌توانند زیر یک هدف یا به‌تنهایی باشند."
        fetching={projects.isFetching && !projects.isPending}
        actionLabel={formOpen ? 'بستن فرم' : 'پروژه جدید'}
        onAction={() => setFormOpen(value => !value)}
      />
      {formOpen && (
        <ProjectCreateForm
          goals={goals.data?.items ?? []}
          pending={create.isPending}
          error={create.error}
          onSubmit={request => create.mutate(request, { onSuccess: () => setFormOpen(false) })}
        />
      )}
      <ResourceState
        pending={projects.isPending}
        error={projects.error}
        empty={items.length === 0}
        pendingText="در حال دریافت پروژه‌ها…"
        emptyTitle="هنوز پروژه‌ای نساخته‌اید."
        emptyDescription="یک تلاش محدود را مستقل یا زیر یکی از هدف‌های فعال ثبت کنید."
        emptyAction={formOpen ? undefined : <button className="secondary-button" type="button" onClick={() => setFormOpen(true)}>ساخت پروژه</button>}
        onRetry={() => projects.refetch()}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(project => <li key={project.id}><ProjectCard project={project} /></li>)}
        </ul>
        {projects.hasNextPage && (
          <button
            className="secondary-button mt-5 w-full sm:w-auto"
            type="button"
            disabled={projects.isFetchingNextPage}
            onClick={() => projects.fetchNextPage()}
          >
            {projects.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش پروژه‌های بیشتر'}
          </button>
        )}
      </ResourceState>
    </section>
  )
}
