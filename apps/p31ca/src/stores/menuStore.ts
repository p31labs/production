import { create } from 'zustand'

export type MenuId =
  | 'invitation'
  | 'immersion'
  | 'action'
  | 'journey'
  | 'overflow'
  | null

interface MenuState {
  openMenuId: MenuId
  openMenu: (id: Exclude<MenuId, null>) => void
  closeMenu: () => void
  toggleMenu: (id: Exclude<MenuId, null>) => void
}

/**
 * useMenuStore — single-open menu coordination.
 *
 * Every dropdown (the 3 act menus, Journey, the ⋮ overflow) registers here.
 * Opening one closes the others. This is the fix for the overlapping-popover
 * bug: previously each dropdown had independent local state, so Journey and
 * the overflow could both be open at once.
 */
export const useMenuStore = create<MenuState>((set, get) => ({
  openMenuId: null,
  openMenu: (id) => set({ openMenuId: id }),
  closeMenu: () => set({ openMenuId: null }),
  toggleMenu: (id) => set({ openMenuId: get().openMenuId === id ? null : id }),
}))