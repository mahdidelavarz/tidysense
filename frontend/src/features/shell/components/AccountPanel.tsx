import { Link } from '@tanstack/react-router'
import { useId, useRef, useState } from 'react'
import { Activity, CalendarClock, ChevronLeft, Compass, LogOut, Moon, ShieldCheck, Sun } from '../../../shared/ui/icons'
import { formatNumber } from '../../../shared/lib/date'
import { useModal } from '../../../shared/lib/use-modal'
import { setThemePreference, type ThemePreference, useThemePreference } from '../../../shared/lib/theme'
import { useCurrentUser, useLogout } from '../../auth/hooks/auth-hooks'
import { AccountAvatar } from './AccountButton'
import { useAttentionCount } from './Navigation'

const themeChoices: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'خودکار' },
  { value: 'light', label: 'روشن' },
  { value: 'dark', label: 'تیره' },
]

/**
 * Who is signed in, the places the five tabs have no room for (Reconcile,
 * Planning, and for now Projects), appearance, privacy and signing out. A
 * bottom sheet on phones, a panel beside the rail on desktop. It closes on
 * navigation, Escape or a tap outside.
 */
export function AccountPanel({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser().data
  const logout = useLogout()
  const attention = useAttentionCount()
  const theme = useThemePreference()
  const [failed, setFailed] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const themeLabelId = useId()
  useModal(panel, onClose)

  function signOut(all: boolean) {
    setFailed(false)
    logout.mutate(all, { onError: () => setFailed(true) })
  }

  const row = (to: '/reconcile' | '/planning' | '/operations' | '/privacy', Icon: typeof Compass, label: string, extra?: React.ReactNode) => (
    <Link className="menu-item" to={to} onClick={onClose}>
      <Icon size={20} className="text-text-secondary" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {extra}
      <ChevronLeft size={16} className="text-text-tertiary" aria-hidden="true" />
    </Link>
  )

  return (
    <>
      <button className="overlay-backdrop cursor-default border-0" type="button" tabIndex={-1} aria-label="بستن" onClick={onClose} />
      <div className="account-panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="sheet-handle mb-1" aria-hidden="true" />
        <div className="flex items-center gap-3 px-1 pt-1">
          <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-accent-tint font-display text-[1.375rem] font-bold" aria-hidden="true">
            <AccountAvatar size={24} />
          </span>
          <span className="min-w-0 flex-1 leading-6">
            <span className="block text-base font-extrabold" id={titleId}>{user?.displayName ?? 'حساب شما'}</span>
            {user && <bdi className="block text-xs text-text-secondary" dir="ltr">{user.phoneNumber}</bdi>}
          </span>
        </div>

        <nav className="menu-group" aria-label="بخش‌های دیگر">
          {row('/reconcile', CalendarClock, 'بازبینی', attention > 0 && (
            <span className="rounded-full bg-moon px-1.5 text-[0.6875rem] font-extrabold leading-5 text-moon-tint">
              {formatNumber(attention)}
              <span className="sr-only"> مورد منتظر تصمیم</span>
            </span>
          ))}
          {row('/planning', Compass, 'برنامه‌ریزی')}
          {/* Until the Goals page carries its Projects switch (STEP-17), Projects are reached here. */}
          {user?.isOperator && row('/operations', Activity, 'عملیات')}
        </nav>

        <div className="menu-group">
          <div className="flex min-h-14 items-center gap-3 px-3.5">
            {theme === 'dark' ? <Moon size={20} className="text-text-secondary" aria-hidden="true" /> : <Sun size={20} className="text-text-secondary" aria-hidden="true" />}
            <span className="flex-1 text-sm font-bold" id={themeLabelId}>ظاهر</span>
            {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted legend and border here. */}
            <div className="segmented" role="group" aria-labelledby={themeLabelId}>
              {themeChoices.map(choice => (
                <button
                  key={choice.value}
                  className="segmented-option min-h-8 px-2.5 text-xs"
                  type="button"
                  aria-pressed={theme === choice.value}
                  onClick={() => setThemePreference(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
          {row('/privacy', ShieldCheck, 'حریم خصوصی و داده‌ها')}
        </div>

        <div className="menu-group">
          <button className="menu-item text-attention" type="button" disabled={logout.isPending} onClick={() => signOut(false)}>
            <LogOut size={20} aria-hidden="true" />
            خروج از این دستگاه
          </button>
          <button className="menu-item text-text-secondary" type="button" disabled={logout.isPending} onClick={() => signOut(true)}>
            <LogOut size={20} aria-hidden="true" />
            خروج از همه‌ی دستگاه‌ها
          </button>
        </div>
        {failed && <p className="px-3 text-xs font-bold text-attention" role="alert">خروج انجام نشد. دوباره تلاش کنید.</p>}
      </div>
    </>
  )
}
