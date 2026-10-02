import { Link } from '@tanstack/react-router'
import { FolderKanban, ListChecks, type LucideIcon, Repeat, Sun, Target } from 'lucide-react'

type Destination = {
  to: '/today' | '/tasks' | '/routines' | '/projects' | '/goals'
  label: string
  icon: LucideIcon
  /** False keeps a destination out of the four-slot phone tab bar; it stays in the sidebar and drawer. */
  tab?: false
}

/**
 * The primary destinations, in order of daily use. Add an entry only when
 * its product step ships; the shell must not advertise future modules.
 */
export const destinations: Destination[] = [
  { to: '/today', label: 'امروز', icon: Sun },
  { to: '/tasks', label: 'کارها', icon: ListChecks },
  // Routines are executed from Today, so their management page does not need a tab.
  { to: '/routines', label: 'روتین‌ها', icon: Repeat, tab: false },
  { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban },
  { to: '/goals', label: 'هدف‌ها', icon: Target },
]

/** Product mark and name. Links home (Today). */
export function Brand() {
  return (
    <Link className="flex items-center gap-3 rounded-xl" to="/today" aria-label="تایدی‌سنس">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-lg font-extrabold text-white" aria-hidden="true">ت</span>
      <span className="text-lg font-extrabold tracking-tight" aria-hidden="true">تایدی‌سنس</span>
    </Link>
  )
}

/** Vertical destination list shared by the desktop sidebar and the navigation drawer. */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {destinations.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          {/* The router marks the active link with aria-current="page", which the nav-item style keys on. */}
          <Link className="nav-item" to={to} onClick={onNavigate}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
