import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { destinations } from './Navigation'

/**
 * Phone/tablet navigation (<1024px): four thumb-reachable destinations
 * around a raised create button. Not a shrunken sidebar — it replaces it.
 */
export function TabBar() {
  const openCreate = useUiStore(state => state.openCreate)
  const [first, second, third, fourth] = destinations.filter(item => item.tab !== false).map(({ to, label, icon: Icon }) => (
    <Link key={to} className="tab-item" to={to}>
      <Icon size={22} aria-hidden="true" />
      {label}
    </Link>
  ))

  return (
    <nav className="tabbar" aria-label="ناوبری اصلی">
      {first}
      {second}
      <div className="flex justify-center">
        <button className="tab-create" type="button" onClick={() => openCreate('menu')} aria-label="افزودن">
          <Plus size={26} aria-hidden="true" />
        </button>
      </div>
      {third}
      {fourth}
    </nav>
  )
}
