import { Plus } from 'lucide-react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { AccountMenu } from './AccountMenu'
import { Brand, NavList } from './Navigation'

/** Desktop navigation (≥1024px). Hidden below that, where the tab bar and drawer take over. */
export function Sidebar() {
  const openCreate = useUiStore(state => state.openCreate)
  return (
    <aside className="sidebar">
      <Brand />
      <button className="primary-button w-full" type="button" onClick={() => openCreate('menu')}>
        <Plus size={20} aria-hidden="true" />
        افزودن
      </button>
      <nav aria-label="ناوبری اصلی">
        <NavList />
      </nav>
      <div className="mt-auto">
        <AccountMenu />
      </div>
    </aside>
  )
}
