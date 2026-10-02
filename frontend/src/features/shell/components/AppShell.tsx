import { WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { useOnline } from '../../../shared/lib/use-online'
import { Toaster } from '../../../shared/ui/Toaster'
import { CreateSheet } from './CreateSheet'
import { NavDrawer } from './NavDrawer'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'

/**
 * The authenticated application frame. There is deliberately no top
 * application bar: navigation lives in the sidebar (desktop) or the tab bar
 * and drawer (phone/tablet), and each page carries its own title and actions.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const navOpen = useUiStore(state => state.navOpen)
  const closeNav = useUiStore(state => state.closeNav)
  const online = useOnline()

  return (
    <div className="app-frame bg-canvas text-text-primary">
      <a className="fixed start-4 top-3 z-60 -translate-y-20 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition focus:translate-y-0" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <Sidebar />
      <main id="main-content">
        {!online && (
          <p className="flex items-center justify-center gap-2 bg-caution-tint px-4 py-2 text-center text-sm font-bold text-text-primary" role="status">
            <WifiOff size={18} aria-hidden="true" />
            اتصال اینترنت برقرار نیست. تا اتصال دوباره، تغییرها ذخیره نمی‌شوند.
          </p>
        )}
        {children}
      </main>
      <TabBar />
      {navOpen && <NavDrawer onClose={closeNav} />}
      <CreateSheet />
      <Toaster />
    </div>
  )
}
