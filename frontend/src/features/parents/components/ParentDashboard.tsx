import { GoalsPanel } from '../../goals/components/GoalsPanel'
import { ProjectsPanel } from '../../projects/components/ProjectsPanel'

/**
 * Workspace dashboard page: composes the Goals and Projects panels side by
 * side. Goal and Project own all of their own data, forms and query keys;
 * this component only arranges the page.
 */
export function ParentDashboard() {
  return (
    <div className="page-container space-y-10">
      <header className="page-header">
        <p className="text-sm font-bold text-accent">فضای کاری شما</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">هدف‌ها و پروژه‌ها</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
          نتیجه‌ای را که برایتان مهم است به‌عنوان هدف ثبت کنید و تلاش‌های محدود و قابل‌مدیریت را در پروژه‌ها پیش ببرید.
        </p>
      </header>
      <GoalsPanel />
      <ProjectsPanel />
    </div>
  )
}
