import { Ellipsis } from '../../../shared/ui/icons'
import { type MouseEvent, type ReactNode, type TouchEvent, useId, useRef, useState } from 'react'

/**
 * Hidden actions for one Today row. On a phone the card is dragged toward the
 * end side to reveal them; from tablet width the "more" button opens them
 * under the card. The button stays reachable by keyboard and screen reader on
 * phones too. `children` receives that button to place inside the card.
 */
export function SwipeActions({ label, actionCount, actions, children }: {
  /** Names the item for the "more actions" button. */
  label: string
  /** How many actions the tray holds; sets how far the card slides on a phone. */
  actionCount: number
  actions: ReactNode
  children: (more: ReactNode) => ReactNode
}) {
  const trayId = useId()
  const [open, setOpen] = useState(false)
  const face = useRef<HTMLDivElement>(null)
  const tray = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; base: number; moving: boolean; offset: number } | null>(null)
  // A drag ends in a click on whatever is under the finger; that click is not a tap.
  const swallowClick = useRef(false)

  /** How far the card slides: the actions and the tray's padding on both sides of them. */
  function trayWidth() {
    return (tray.current?.offsetWidth ?? 0) + 12
  }

  function onTouchStart(event: TouchEvent) {
    // From tablet width the tray opens under the card instead, so there is nothing to drag.
    if (window.matchMedia('(min-width: 48rem)').matches) return
    const touch = event.touches[0]
    drag.current = { x: touch.clientX, y: touch.clientY, base: open ? -trayWidth() : 0, moving: false, offset: 0 }
  }

  function onTouchMove(event: TouchEvent) {
    const state = drag.current
    if (!state || !face.current) return
    const dx = event.touches[0].clientX - state.x
    const dy = event.touches[0].clientY - state.y
    if (!state.moving) {
      // A mostly vertical gesture is the page scrolling, not this card.
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) drag.current = null
      if (Math.abs(dx) <= 8 || Math.abs(dx) <= Math.abs(dy)) return
      state.moving = true
      face.current.style.transition = 'none'
    }
    state.offset = Math.min(0, Math.max(-trayWidth(), state.base + dx))
    face.current.style.transform = `translateX(${state.offset}px)`
  }

  function onTouchEnd() {
    const state = drag.current
    drag.current = null
    if (!state?.moving || !face.current) return
    swallowClick.current = true
    face.current.style.transition = ''
    face.current.style.transform = ''
    setOpen(state.offset < -trayWidth() / 2)
  }

  function onClickCapture(event: MouseEvent) {
    // While the tray is open a tap on the card closes it rather than opening the item.
    if (swallowClick.current || (open && !window.matchMedia('(min-width: 48rem)').matches)) {
      event.preventDefault()
      event.stopPropagation()
      if (!swallowClick.current) setOpen(false)
    }
    swallowClick.current = false
  }

  const more = (
    <button
      className="icon-button swipe-more"
      type="button"
      aria-label={`اقدام‌های بیشتر: ${label}`}
      aria-expanded={open}
      aria-controls={trayId}
      onClick={() => setOpen(value => !value)}
    >
      <Ellipsis size={20} aria-hidden="true" />
    </button>
  )

  return (
    <div className="swipe min-w-0 flex-1" style={{ '--tray': `${actionCount * 4.75}rem` } as React.CSSProperties} data-open={open}>
      <div
        className="swipe-face"
        ref={face}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={onClickCapture}
      >
        {children(more)}
      </div>
      {/* Closed, the tray is behind the card or collapsed, so it is taken out of focus order too. */}
      <div className="swipe-tray" id={trayId} inert={!open}>
        <div className="swipe-tray-inner" ref={tray}>{actions}</div>
      </div>
    </div>
  )
}
