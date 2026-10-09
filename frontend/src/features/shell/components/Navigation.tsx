import { Link } from '@tanstack/react-router'
import { Activity, Compass, FolderKanban, ListChecks, type LucideIcon, RefreshCcw, Repeat, Sun, Target } from 'lucide-react'
import { formatNumber } from '../../../shared/lib/date'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { useReconcileOverview } from '../../reconcile/hooks/reconcile-hooks'

type Destination = {
  to: '/today' | '/tasks' | '/routines' | '/reconcile' | '/planning' | '/projects' | '/goals' | '/operations'
  label: string
  icon: LucideIcon
  /** False keeps a destination out of the four-slot phone tab bar; it stays in the sidebar and drawer. */
  tab?: false
  /** True shows the destination to operator accounts only. */
  operatorOnly?: true
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
  // Reconcile is offered from Today when there is something to decide, so it does not need a tab either.
  { to: '/reconcile', label: 'بازبینی', icon: RefreshCcw, tab: false },
  // Planning is an occasional flow, also opened from a Goal or a Project, so it stays out of the tab bar.
  { to: '/planning', label: 'برنامه‌ریزی', icon: Compass, tab: false },
  { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban },
  { to: '/goals', label: 'هدف‌ها', icon: Target },
  // Operational evidence is for operator accounts; nobody else is shown that it exists.
  { to: '/operations', label: 'عملیات', icon: Activity, tab: false, operatorOnly: true },
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
  const overview = useReconcileOverview()
  // One compact count for everything waiting in Reconcile; its lanes stay separate on the page.
  const attention = Number(overview.data?.attentionCount ?? 0)
  const isOperator = useCurrentUser().data?.isOperator === true
  return (
    <ul className="space-y-1">
      {destinations.filter(x => !x.operatorOnly || isOperator).map(({ to, label, icon: Icon }) => (
        <li key={to}>
          {/* The router marks the active link with aria-current="page", which the nav-item style keys on. */}
          <Link className="nav-item" to={to} onClick={onNavigate}>
            <Icon size={20} aria-hidden="true" />
            {label}
            {to === '/reconcile' && attention > 0 && (
              <span className="status-badge status-active ms-auto before:hidden">
                {formatNumber(attention)}
                <span className="sr-only"> مورد منتظر تصمیم</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
