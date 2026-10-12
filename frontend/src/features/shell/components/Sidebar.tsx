import { Plus } from '../../../shared/ui/icons'
import { useUiStore } from '../../../shared/lib/ui-store'
import { AccountMenu } from './AccountMenu'
import { Brand, NavList } from './Navigation'

/** Desktop navigation (≥1024px). Hidden below that, where the tab bar and drawer take over. */
export function Sidebar() {
  const openCreate = useUiStore(state => state.openCreate)
  return (
    <aside className="sidebar">
      <div className="px-1 pt-1">
        <Brand />
      </div>
      <button className="primary-button min-h-12 w-full rounded-2xl" type="button" onClick={() => openCreate('menu')}>
        <Plus size={20} aria-hidden="true" />
        افزودن
      </button>
      {/* Scrolls on short screens; the padding keeps the current-page marker inside the scroll box. */}
      <nav className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4" aria-label="ناوبری اصلی">
        <NavList />
      </nav>
      <AccountMenu />
    </aside>
  )
}
