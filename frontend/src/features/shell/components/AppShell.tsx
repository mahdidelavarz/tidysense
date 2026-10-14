import { WifiOff } from '../../../shared/ui/icons'
import type { ReactNode } from 'react'
import { useUiStore } from '../../../shared/lib/ui-store'
import { useOnline } from '../../../shared/lib/use-online'
import { Toaster } from '../../../shared/ui/Toaster'
import { AccountPanel } from './AccountPanel'
import { CreateSheet } from './CreateSheet'
import { Rail } from './Rail'
import { TabBar } from './TabBar'

/**
 * The authenticated application frame. There is deliberately no top
 * application bar: navigation lives in the icon rail (desktop) or the tab bar
 * (phone/tablet), the account panel holds the rest, and each page carries its
 * own title and actions. On desktop the page sits in a panel the rail plugs into.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const accountOpen = useUiStore(state => state.accountOpen)
  const closeAccount = useUiStore(state => state.closeAccount)
  const online = useOnline()

  return (
    <div className="app-frame bg-canvas text-text-primary">
      <a className="fixed start-4 top-3 z-60 -translate-y-20 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-on-accent transition focus:translate-y-0" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <Rail />
      <main className="app-panel" id="main-content">
        {!online && (
          <p className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-2xl border border-caution/25 bg-caution-tint px-4 py-2.5 text-center text-sm font-bold text-text-primary shadow-sm lg:mx-10" role="status">
            <WifiOff size={18} aria-hidden="true" />
            اتصال اینترنت برقرار نیست. تا اتصال دوباره، تغییرها ذخیره نمی‌شوند.
          </p>
        )}
        {children}
      </main>
      <TabBar />
      {accountOpen && <AccountPanel onClose={closeAccount} />}
      <CreateSheet />
      <Toaster />
    </div>
  )
}
