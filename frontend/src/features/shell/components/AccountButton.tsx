import { UserRound } from '../../../shared/ui/icons'
import { useUiStore } from '../../../shared/lib/ui-store'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'

/** The account's initial, or a person when there is no name. */
export function AccountAvatar({ size }: { size: number }) {
  const name = useCurrentUser().data?.displayName?.trim()
  return name ? Array.from(name)[0] : <UserRound size={size} aria-hidden="true" />
}

/**
 * Opens the account panel from a page header below the desktop breakpoint,
 * where it holds Reconcile, appearance, privacy and signing out. On desktop
 * the rail carries the same entry.
 */
export function AccountButton() {
  const openAccount = useUiStore(state => state.openAccount)
  return (
    <button className="account-button lg:hidden" type="button" onClick={openAccount} aria-label="حساب و تنظیمات">
      <AccountAvatar size={20} />
    </button>
  )
}
