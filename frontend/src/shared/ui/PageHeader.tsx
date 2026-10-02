import { Link } from '@tanstack/react-router'
import { ArrowRight, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { useUiStore } from '../lib/ui-store'

/** Opens the navigation drawer. Shown only below the desktop breakpoint, where the sidebar is hidden. */
export function MenuButton() {
  const openNav = useUiStore(state => state.openNav)
  return (
    <button className="icon-button -ms-2 lg:hidden" type="button" onClick={openNav} aria-label="باز کردن منو">
      <Menu size={24} aria-hidden="true" />
    </button>
  )
}

/**
 * The top of every primary page. It is part of the page content, not a
 * separate application bar: the menu button, the title and the page's one
 * primary action sit on the canvas and scroll with it.
 */
export function PageHeader({ title, description, action }: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="mb-6 lg:mb-8">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <MenuButton />
          <h1 className="page-title truncate">{title}</h1>
        </div>
        {action}
      </div>
      {description && <div className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">{description}</div>}
    </header>
  )
}

const backTargets = {
  '/tasks': 'کارها',
  '/projects': 'پروژه‌ها',
  '/goals': 'هدف‌ها',
} as const

/** Top row of a detail page: a clear way back to the list it belongs to. The arrow points right because the layout is RTL. */
export function BackLink({ to }: { to: keyof typeof backTargets }) {
  return (
    <div className="mb-4 flex min-h-11 items-center gap-1 lg:mb-6">
      <MenuButton />
      <Link className="ghost-button -ms-2 px-2" to={to}>
        <ArrowRight size={20} aria-hidden="true" />
        بازگشت به {backTargets[to]}
      </Link>
    </div>
  )
}
