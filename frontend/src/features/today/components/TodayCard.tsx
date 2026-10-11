import { Ellipsis } from 'lucide-react'
import { type ReactNode, type TouchEvent, useId, useRef, useState } from 'react'

/**
 * The shell of one item in Today. The face shows the item and its single
 * visible control; everything else is in `actions`, revealed by dragging the
 * card to the left on a phone or by the three-dot button from tablet width up
 * (the button stays reachable by keyboard and screen reader on phones too).
 */
export function TodayCard({ tone, label, dimmed = false, actionCount, actions, children }: {
  tone: 'task' | 'routine'
  /** Names the item for the "more actions" button. */
  label: string
  dimmed?: boolean
  /** How many actions the tray holds; sets how far the card slides on a phone. */
  actionCount: number
  actions: ReactNode
  children: ReactNode
}) {
  const trayId = useId()
  const [open, setOpen] = useState(false)
  const face = useRef<HTMLDivElement>(null)
  const tray = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; base: number; moving: boolean; offset: number } | null>(null)

  function onTouchStart(event: TouchEvent) {
    // From tablet width the tray opens under the card instead, so there is nothing to drag.
    if (window.matchMedia('(min-width: 48rem)').matches) return
    const touch = event.touches[0]
    const width = tray.current?.offsetWidth ?? 0
    drag.current = { x: touch.clientX, y: touch.clientY, base: open ? -width : 0, moving: false, offset: 0 }
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
    const width = tray.current?.offsetWidth ?? 0
    state.offset = Math.min(0, Math.max(-width, state.base + dx))
    face.current.style.transform = `translateX(${state.offset}px)`
  }

  function onTouchEnd() {
    const state = drag.current
    drag.current = null
    if (!state?.moving || !face.current) return
    face.current.style.transition = ''
    face.current.style.transform = ''
    setOpen(state.offset < -(tray.current?.offsetWidth ?? 0) / 2)
  }

  return (
    <article
      className={`today-card today-card-${tone} ${dimmed ? 'opacity-70' : ''}`}
      style={{ '--tray': `${actionCount * 4.5}rem` } as React.CSSProperties}
      data-open={open}
    >
      <div className="today-card-face" ref={face} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        {children}
        <button
          className="icon-button today-card-more"
          type="button"
          aria-label={`اقدام‌های بیشتر: ${label}`}
          aria-expanded={open}
          aria-controls={trayId}
          onClick={() => setOpen(value => !value)}
        >
          <Ellipsis size={20} aria-hidden="true" />
        </button>
      </div>
      {/* Closed, the tray is behind the face or collapsed, so it is taken out of focus order too. */}
      <div className="today-card-actions" id={trayId} ref={tray} inert={!open}>
        <div className="today-card-actions-inner">{actions}</div>
      </div>
    </article>
  )
}
