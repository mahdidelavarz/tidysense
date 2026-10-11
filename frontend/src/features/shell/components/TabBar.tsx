import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { destinations } from './Navigation'

/**
 * Phone/tablet navigation (<1024px): four thumb-reachable destinations
 * around the create button, in a dock that floats above the page. Not a
 * shrunken sidebar — it replaces it.
 */
export function TabBar() {
  const openCreate = useUiStore(state => state.openCreate)
  const [first, second, third, fourth] = destinations.filter(item => item.tab !== false).map(({ to, label, icon: Icon }) => (
    <Link key={to} className="tab-item" to={to}>
      <span className="tab-icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      {label}
    </Link>
  ))

  return (
    <nav className="tabbar" aria-label="ناوبری اصلی">
      <div className="tabbar-dock">
        {first}
        {second}
        <button className="tab-create" type="button" onClick={() => openCreate('menu')} aria-label="افزودن">
          <Plus size={24} aria-hidden="true" />
        </button>
        {third}
        {fourth}
      </div>
    </nav>
  )
}
