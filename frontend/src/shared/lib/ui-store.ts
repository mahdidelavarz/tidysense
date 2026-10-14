import { create } from 'zustand'

// Cross-feature, client-only UI state: the account panel, the single
// create flow, and toasts. Server data never lives here (TanStack Query owns
// it); this store exists because pages, the tab bar and the rail all need
// to open the same overlays.

export type CreateTarget = 'menu' | 'task' | 'routine' | 'project' | 'goal'
export type Toast = { id: number; message: string }

type UiState = {
  accountOpen: boolean
  createTarget: CreateTarget | null
  /** The owner a new item starts under, as `goal:<id>` or `project:<id>`, when it is made from that owner's page. */
  createParent: string | null
  toasts: Toast[]
  openAccount: () => void
  closeAccount: () => void
  openCreate: (target: CreateTarget, parent?: string) => void
  closeCreate: () => void
  showToast: (message: string) => void
  dismissToast: (id: number) => void
}

let nextToastId = 1

export const useUiStore = create<UiState>(set => ({
  accountOpen: false,
  createTarget: null,
  createParent: null,
  toasts: [],
  openAccount: () => set({ accountOpen: true }),
  closeAccount: () => set({ accountOpen: false }),
  openCreate: (target, parent) => set({ createTarget: target, createParent: parent ?? null, accountOpen: false }),
  closeCreate: () => set({ createTarget: null, createParent: null }),
  showToast: message => set(state => ({ toasts: [...state.toasts, { id: nextToastId++, message }] })),
  dismissToast: id => set(state => ({ toasts: state.toasts.filter(toast => toast.id !== id) })),
}))

/** Announces an authoritative success. Call only after the server confirmed the change. */
export function showToast(message: string) {
  useUiStore.getState().showToast(message)
}
