import { Link } from '@tanstack/react-router'
import { ArrowRight } from './icons'
import type { ReactNode } from 'react'
import { AccountButton } from '../../features/shell/components/AccountButton'

/**
 * The top of every primary page. It is part of the page content, not a
 * separate application bar: the title, the page's one primary action and,
 * below desktop, the account button sit on the canvas and scroll with it.
 */
export function PageHeader({ title, description, action }: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="mb-6 lg:mb-8">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h1 className="page-title min-w-0 truncate">{title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <AccountButton />
        </div>
      </div>
      {description && <div className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">{description}</div>}
    </header>
  )
}

const backTargets = {
  '/tasks': 'کارها',
  '/routines': 'روتین‌ها',
  '/projects': 'پروژه‌ها',
  '/goals': 'هدف‌ها',
} as const

/**
 * Top row of a detail page: a clear way back to the list it belongs to, and
 * the page's own small actions (such as edit). The arrow points right
 * because the layout is RTL.
 */
export function BackLink({ to, actions }: { to: keyof typeof backTargets; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex min-h-11 items-center justify-between gap-2 lg:mb-6">
      <Link className="ghost-button -ms-2 px-2" to={to}>
        <ArrowRight size={20} aria-hidden="true" />
        بازگشت به {backTargets[to]}
      </Link>
      <div className="flex items-center gap-2">
        {actions}
        <AccountButton />
      </div>
    </div>
  )
}
