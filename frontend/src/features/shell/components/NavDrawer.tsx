import { X } from '../../../shared/ui/icons'
import { useRef } from 'react'
import { useModal } from '../../../shared/lib/use-modal'
import { AccountMenu } from './AccountMenu'
import { Brand, NavList } from './Navigation'

/** Navigation drawer opened by the menu button below the desktop breakpoint. Holds everything the tab bar has no room for. */
export function NavDrawer({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  useModal(panel, onClose)

  return (
    <>
      <button className="overlay-backdrop cursor-default border-0" type="button" tabIndex={-1} aria-label="بستن منو" onClick={onClose} />
      <div className="drawer-panel" ref={panel} role="dialog" aria-modal="true" aria-label="منو">
        <div className="flex items-center justify-between ps-1 pt-1">
          <Brand />
          <button className="icon-button" type="button" onClick={onClose} aria-label="بستن منو">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4" aria-label="منوی ناوبری">
          <NavList onNavigate={onClose} />
        </nav>
        <AccountMenu onNavigate={onClose} />
      </div>
    </>
  )
}
