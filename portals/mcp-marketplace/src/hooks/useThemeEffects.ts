import { useEffect, useRef } from 'react'
import { useThemeStore, THEME_TOKENS } from '@p31/design-core/theming/theme-store'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { roster } from '@/lib/pickleNames'
import { resolveProfile } from '@/lib/profile'

/**
 * Applies the active member's theme tokens live to <html>.
 *
 * Sets `data-theme` on the document root (the runtime-switching pattern) and
 * re-applies the active member's world tokens. Per-member theme (world × age ×
 * sensory) is resolved from the profile store, so switching "who is acting"
 * re-skins the workspace. The starfield recolors automatically because it
 * reads `--p31-star` per frame.
 */
export function useThemeEffects() {
  const theme = useThemeStore((s) => s.theme)
  const age = useThemeStore((s) => s.age)
  const muted = useThemeStore((s) => s.muted)
  const warmLight = useThemeStore((s) => s.warmLight)
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const profiles = useWorkspaceStore((s) => s.profiles)
  const mounted = useRef(false)

  useEffect(() => {
    const member = roster().find((m) => m.id === activeMemberId) ?? roster()[0]!
    const resolved = resolveProfile(member.id, member.emoji, profiles[activeMemberId])

    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolved.theme.world)
      const tokens = THEME_TOKENS[resolved.theme.world as keyof typeof THEME_TOKENS] ?? {}
      for (const [k, v] of Object.entries(tokens)) {
        document.documentElement.style.setProperty(k, v)
      }
      // Accent follows the active member's pick.
      if (resolved.accent && resolved.accent !== 'cyan') {
        document.documentElement.style.setProperty('--p31-accent', `var(--p31-accent-${resolved.accent})`)
      } else {
        document.documentElement.style.removeProperty('--p31-accent')
      }
    }
    apply()
    mounted.current = true
  }, [activeMemberId, profiles, theme, age, muted, warmLight])

  return theme
}