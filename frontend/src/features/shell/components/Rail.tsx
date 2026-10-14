import { Link } from '@tanstack/react-router'
import { Activity } from '../../../shared/ui/icons'
import { useUiStore } from '../../../shared/lib/ui-store'
import { useCurrentUser } from '../../auth/hooks/auth-hooks'
import { AccountAvatar } from './AccountButton'
import { AttentionCount, PlaceLink, places, useAttentionCount, useIsCurrent } from './Navigation'

/**
 * Desktop navigation (≥1024px): an icon rail floating at the inline-start
 * edge, plugged into the page panel. Each icon names itself in a tooltip on
 * hover and keyboard focus, and to assistive technology through its label.
 * Hidden below 1024px, where the tab bar takes over.
 */
export function Rail() {
  const attention = useAttentionCount()
  const isOperator = useCurrentUser().data?.isOperator === true
  const accountOpen = useUiStore(state => state.accountOpen)
  const openAccount = useUiStore(state => state.openAccount)
  const operations = useIsCurrent(['/operations'])

  return (
    <nav className="rail" aria-label="ناوبری اصلی">
      <Link className="rail-brand" to="/today" aria-label="تایدی‌سنس">
        <span aria-hidden="true">ت</span>
      </Link>
      <span className="rail-rule" aria-hidden="true" />
      {places.map(place => {
        const Icon = place.icon
        const ai = place.to === '/planning'
        const label = ai ? 'برنامه‌ریزی با هوش مصنوعی' : place.to === '/goals' ? 'هدف‌ها و پروژه‌ها' : place.label
        return (
          <PlaceLink key={place.to} place={place} className={ai ? 'rail-ai' : 'rail-item'}>
            {ai && <span className="ai-aura" aria-hidden="true" />}
            <Icon size={ai ? 25 : 22} aria-hidden="true" />
            <span className="sr-only">{label}</span>
            <span className="rail-tip" aria-hidden="true">{label}</span>
            {place.to === '/today' && <AttentionCount count={attention} />}
          </PlaceLink>
        )
      })}
      {isOperator && (
        <>
          <span className="rail-rule" aria-hidden="true" />
          <Link className="rail-item" to="/operations" aria-current={operations ? 'page' : undefined}>
            <Activity size={22} aria-hidden="true" />
            <span className="sr-only">عملیات</span>
            <span className="rail-tip" aria-hidden="true">عملیات</span>
          </Link>
        </>
      )}
      <span className="rail-rule" aria-hidden="true" />
      <button className="rail-item font-display text-lg font-bold" type="button" aria-expanded={accountOpen} aria-haspopup="dialog" onClick={openAccount}>
        <AccountAvatar size={22} />
        <span className="sr-only">حساب و تنظیمات</span>
        <span className="rail-tip font-sans" aria-hidden="true">حساب و تنظیمات</span>
      </button>
    </nav>
  )
}
