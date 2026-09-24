import { useCallback, useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useNotifStore } from '@/store/useNotifStore'
import { appendSBT, hasSbt, loadSbtChain, markSbtAnchored, type SBT, type SBTKind } from '@/lib/sbt'
import { anchorSbt } from '@/lib/sbt-anchor'

interface MilestoneDef {
  kind: SBTKind
  title: string
  description: string
  check: () => boolean
}

/**
 * Family-friendly milestone engine. Each milestone is idempotent (checked by
 * title), mints a soulbound token, anchors it to the Loom (best-effort),
 * fires a starfield burst, and mirrors to the profile. Honest status: the
 * on-chain badge only shows when the anchor returned a real tokenId.
 */
export function useSBT() {
  const notify = useNotifStore((s) => s.notify)
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const identities = useWorkspaceStore((s) => s.identities)
  const mode = useWorkspaceStore((s) => s.mode)
  const calm = useWorkspaceStore((s) => s.crisis)
  const docs = useWorkspaceStore((s) => s.docsForged)
  const [chain, setChain] = useState<SBT[]>([])
  const did = identities[activeMemberId]?.did ?? null

  const refresh = useCallback(() => {
    if (!activeMemberId) {
      setChain([])
      return
    }
    setChain(loadSbtChain(activeMemberId))
  }, [activeMemberId])

  useEffect(() => {
    refresh()
  }, [refresh, identities])

  const milestones: MilestoneDef[] = [
    {
      kind: 'achievement',
      title: 'Claimed Space',
      description: 'Minted their first sovereign did:key — this door is theirs.',
      check: () => Boolean(did),
    },
    {
      kind: 'achievement',
      title: 'First Build',
      description: 'Forged a document through the P31 Forge.',
      check: () => (docs ?? 0) >= 1,
    },
    {
      kind: 'guardian',
      title: 'Calm Guardian',
      description: 'Entered calm mode — and rested.',
      check: () => calm || mode === 'spark',
    },
    {
      kind: 'affiliation',
      title: 'Family Anchor',
      description: 'Two or more family members hold DIDs.',
      check: () => Object.keys(identities).filter((id) => identities[id] !== undefined).length >= 2,
    },
  ]

  const mintIfNew = useCallback(
    async (def: MilestoneDef) => {
      if (!activeMemberId || !did) return null
      if (hasSbt(activeMemberId, def.title)) return null
      const sbt = await appendSBT(activeMemberId, did, def.kind, def.title, def.description)
      const tokenId = await anchorSbt({
        did: sbt.did,
        blockHash: sbt.hash,
        prevHash: sbt.prevHash,
        title: sbt.title,
        mintedAt: sbt.mintedAt,
      })
      if (tokenId) markSbtAnchored(activeMemberId, sbt.id, tokenId)
      notify({
        kind: 'milestone',
        title: `🏅 ${def.title}`,
        body: tokenId ? 'Anchored on-chain.' : 'Saved locally — anchoring when we can.',
        burst: true,
      })
      refresh()
      return sbt
    },
    [activeMemberId, did, notify, refresh],
  )

  // Re-check milestones whenever the store changes.
  useEffect(() => {
    if (!activeMemberId || !did) return
    let cancelled = false
    const unsub = useWorkspaceStore.subscribe(() => {
      for (const def of milestones) {
        if (def.check()) void mintIfNew(def)
      }
    })
    void (async () => {
      for (const def of milestones) {
        if (cancelled) break
        if (def.check()) await mintIfNew(def)
      }
    })()
    return () => {
      cancelled = true
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMemberId, did, identities, mode, calm, docs])

  return { chain, refresh }
}