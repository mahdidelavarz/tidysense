import { Link, useRouterState } from '@tanstack/react-router'
import { type AppIcon, ListChecks, Repeat, Sparkles, Sun, Target } from '../../../shared/ui/icons'
import { formatNumber } from '../../../shared/lib/date'
import { useReconcileOverview } from '../../reconcile/hooks/reconcile-hooks'

type Place = {
  to: '/today' | '/tasks' | '/planning' | '/routines' | '/goals'
  label: string
  icon: AppIcon
  /** Other routes this place stands for: the Goals place also covers Projects. */
  also?: string[]
}

/**
 * The five places, in order of daily use, on both the phone tab bar and the
 * desktop rail. Planning sits in the middle as the moonstone, the colour of
 * the AI. Reconcile, Planning, privacy and the account live in the account
 * panel; Reconcile's count is carried by Today, where it is offered.
 */
export const places: Place[] = [
  { to: '/today', label: 'امروز', icon: Sun },
  { to: '/tasks', label: 'کارها', icon: ListChecks },
  { to: '/planning', label: 'برنامه‌ریزی', icon: Sparkles },
  { to: '/routines', label: 'روتین‌ها', icon: Repeat },
  { to: '/goals', label: 'هدف‌ها', icon: Target, also: ['/projects'] },
]

/** Whether the current page is one of these routes or below one of them. */
export function useIsCurrent(paths: string[]) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  return paths.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

/** One compact count for everything waiting in Reconcile; its lanes stay separate on the page. */
export function useAttentionCount() {
  return Number(useReconcileOverview().data?.attentionCount ?? 0)
}

/** The count on Today: how many things wait in Reconcile. Read out with what it means. */
export function AttentionCount({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="nav-count">
      {formatNumber(count)}
      <span className="sr-only"> مورد برای بازبینی</span>
    </span>
  )
}

/** A place as a link that is marked current on its own route and on the routes it also stands for. */
export function PlaceLink({ place, className, children }: { place: Place; className: string; children: React.ReactNode }) {
  const current = useIsCurrent([place.to, ...(place.also ?? [])])
  return (
    <Link className={className} to={place.to} aria-current={current ? 'page' : undefined}>
      {children}
    </Link>
  )
}
