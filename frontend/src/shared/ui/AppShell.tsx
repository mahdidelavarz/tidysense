import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const inParents = location.pathname === '/' || location.pathname.startsWith('/goals/') || location.pathname.startsWith('/projects/')
  const inTasks = location.pathname.startsWith('/tasks')
  const inToday = location.pathname.startsWith('/today')

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <a className="fixed right-4 top-3 z-60 -translate-y-20 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition focus:translate-y-0" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4 py-2 sm:px-8">
          <Link className="flex items-center gap-3 rounded-lg" to="/" aria-label="تایدی‌سنس، صفحه اصلی">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white shadow-sm" aria-hidden="true">ت</span>
            <span className="font-bold tracking-tight">تایدی‌سنس</span>
          </Link>
          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:w-auto" aria-label="ناوبری اصلی">
            <NavLink active={inToday} to="/today">امروز</NavLink>
            <NavLink active={inTasks} to="/tasks">کارها</NavLink>
            <NavLink active={inParents} to="/">اهداف و پروژه‌ها</NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  )
}

function NavLink({ active, to, children }: { active: boolean; to: '/' | '/tasks' | '/today'; children: ReactNode }) {
  return (
    <Link
      className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-bold transition ${active ? 'bg-accent-tint text-accent-strong' : 'text-text-secondary hover:bg-surface-sunken hover:text-text-primary'}`}
      to={to}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
