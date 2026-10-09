import { describe, it, expect, beforeEach } from 'vitest'
import { useMenuStore } from '../../../stores/menuStore'

beforeEach(() => {
  useMenuStore.setState({ openMenuId: null })
})

describe('useMenuStore — single-open invariant', () => {
  it('starts closed', () => {
    expect(useMenuStore.getState().openMenuId).toBeNull()
  })

  it('open sets the menu id', () => {
    useMenuStore.getState().openMenu('invitation')
    expect(useMenuStore.getState().openMenuId).toBe('invitation')
  })

  it('opening a second menu closes the first (the invariant)', () => {
    useMenuStore.getState().openMenu('invitation')
    useMenuStore.getState().openMenu('overflow')
    expect(useMenuStore.getState().openMenuId).toBe('overflow')
  })

  it('toggle opens a closed menu', () => {
    useMenuStore.getState().toggleMenu('journey')
    expect(useMenuStore.getState().openMenuId).toBe('journey')
  })

  it('toggle closes an open menu', () => {
    useMenuStore.getState().toggleMenu('journey')
    useMenuStore.getState().toggleMenu('journey')
    expect(useMenuStore.getState().openMenuId).toBeNull()
  })

  it('close clears the menu', () => {
    useMenuStore.getState().openMenu('action')
    useMenuStore.getState().closeMenu()
    expect(useMenuStore.getState().openMenuId).toBeNull()
  })
})