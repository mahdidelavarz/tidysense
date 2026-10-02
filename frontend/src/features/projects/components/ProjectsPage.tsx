import { FolderKanban, Plus } from 'lucide-react'
import { useState } from 'react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SegmentedControl, type StatusFilter, statusFilterOptions } from '../../../shared/ui/SegmentedControl'
import { LoadMoreButton, ResourceState } from '../../../shared/ui/StateUi'
import { useProjects } from '../hooks/project-hooks'
import { ProjectCard } from './ProjectCard'

/** Projects list page: filter, list and the entry point to creating a Project. */
export function ProjectsPage() {
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE')
  const projects = useProjects(filter === 'all' ? undefined : filter)
  const openCreate = useUiStore(state => state.openCreate)
  const items = projects.data?.pages.flatMap(page => page.items) ?? []

  return (
    <div className="page-wide">
      <PageHeader
        title="پروژه‌ها"
        description="تلاش‌های محدود و قابل‌مدیریت. هر پروژه می‌تواند مستقل باشد یا زیر یک هدف قرار بگیرد."
        action={(
          <button className="primary-button shrink-0" type="button" onClick={() => openCreate('project')}>
            <Plus size={20} aria-hidden="true" />
            پروژه جدید
          </button>
        )}
      />
      <div className="mb-5 flex items-center gap-3">
        <SegmentedControl label="فیلتر وضعیت پروژه‌ها" value={filter} options={statusFilterOptions} onChange={setFilter} />
        {projects.isFetching && !projects.isPending && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
      </div>
      <ResourceState
        pending={projects.isPending}
        error={projects.error}
        empty={items.length === 0}
        pendingText="در حال دریافت پروژه‌ها…"
        emptyIcon={FolderKanban}
        emptyTitle={filter === 'ACTIVE' ? 'پروژه فعالی ندارید.' : 'هنوز پروژه‌ای نساخته‌اید.'}
        emptyDescription="یک تلاش محدود را مستقل یا زیر یکی از هدف‌های فعال ثبت کنید."
        emptyAction={<button className="secondary-button" type="button" onClick={() => openCreate('project')}>ثبت یک پروژه</button>}
        onRetry={() => projects.refetch()}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(project => <li key={project.id}><ProjectCard project={project} /></li>)}
        </ul>
        <LoadMoreButton
          visible={projects.hasNextPage}
          loading={projects.isFetchingNextPage}
          label="نمایش پروژه‌های بیشتر"
          onClick={() => projects.fetchNextPage()}
        />
      </ResourceState>
    </div>
  )
}
