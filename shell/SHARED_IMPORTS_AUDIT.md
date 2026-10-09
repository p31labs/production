# @p31ca/shared Import Audit

**Generated:** 2026-08-17
**Scope:** All imports from `@p31ca/shared` across `shell/src/` and `production/packages/`

---

## 1. Total Import Count

| Location | Import statements | Unique symbols |
|----------|------------------|----------------|
| `shell/src/` | 11 | 20 |
| `packages/bonding/src/` | 6 | 15 |
| `packages/spaceship-earth/src/` | 10 | 25 |
| **Total** | **27** | **~35 unique** |

---

## 2. Every Import with file:line

### shell/src/

| # | File:line | Sub-path | Symbols |
|---|-----------|----------|---------|
| 1 | `features/hardware/zoneStore.ts:2` | `ble` | `SpaceshipBLEScanner`, `defaultBLEConfig`, `type ZoneTransitionEvent`, `type ZoneId` |
| 2 | `lib/db.ts:8` | `economy` | `type LedgerEntry` |
| 3 | `lib/cognitiveGate.ts:1` | `rules` | `evaluateRules`, `analyzeMessage`, `CognitiveShield`, `defaultShieldConfig`, `type RuleContext`, `type Rule`, `type RuleEvaluationResult`, `type MessageAnalysis`, `type ShieldedMessage` |
| 4 | `lib/constitution.ts:1` | `rules` | `createDefaultConstitution`, `type Constitution` |
| 5 | `lib/__tests__/zoneStore.test.ts:2` | `ble` | `ZoneEnergy`, `type ZoneTransitionEvent` |
| 6 | `components/VisitorMindsetModal.tsx:3` | `ble` | `type ZoneTransitionEvent` |
| 7 | `components/CognitiveShieldSuggestion.tsx:3` | `rules` | `type MessageAnalysis`, `type ShieldedMessage` |
| 8 | `lib/__tests__/economy.test.ts:2` | `economy` | `useDualEconomyStore`, `computeBudget`, `GROSS_SPOONS`, `BORROW_INTEREST`, `type MorningAssessmentInput`, `type LedgerEntry` |
| 9 | `features/sandbox/SandboxChat.tsx:14` | `rules` | `type MessageAnalysis`, `type ShieldedMessage` |
| 10 | `features/economy/index.ts:1` | `economy` | `useDualEconomyStore`, `useEconomyStore`, `initLoveSync`, `connectLedgerAppender`, `computeBudget`, `hydrateFromLedger`, `GROSS_SPOONS`, `BORROW_INTEREST` |
| 11 | `features/economy/index.ts:11` | `economy` | `type MorningAssessmentInput`, `type LedgerEntry` |

### packages/bonding/src/

| # | File:line | Sub-path | Symbols |
|---|-----------|----------|---------|
| 12 | `store/geodesicStore.ts:10` | `geodesic-campaign` | `GEODESIC_CAMPAIGN` |
| 13 | `lib/gameSync.ts:13` | `net` | `fetchWithTimeout` |
| 14 | `components/GeodesicMode.tsx:14` | `geodesic-campaign` | `GEODESIC_CAMPAIGN` |
| 15 | `genesis/telemetryStore.ts:4` | `telemetry` | `telemetryAddEvent`, `telemetrySeal`, `telemetryRecoverOrphans`, `telemetryInit`, `telemetryAttachLifecycleHandlers`, `telemetryCleanup`, `telemetryGetBuffer`, `telemetryGetSessionId` |
| 16 | `genesis/telemetryStore.ts:14` | `telemetry` | `type TelemetryEvent`, `type TelemetryConfig` |
| 17 | `genesis/eventBus.ts:4` | `events` | `eventBus`, `GameEventType` |
| 18 | `genesis/eventBus.ts:5` | `events` | `type GameEventMap` |
| 19 | `genesis/economyStore.ts:5` | `economy` | `useEconomyStore`, `initLoveSync` |

### packages/spaceship-earth/src/

| # | File:line | Sub-path | Symbols |
|---|-----------|----------|---------|
| 20 | `verify/hooks.ts:11` | `.` (root) | `VERTICES`, `EDGES`, `AXES` |
| 21 | `sovereign/useSovereignStore.ts:45` | `sovereign` | `audioEngine`, `generateDID`, `hashTelemetry`, `exportLedgerJSON` |
| 22 | `engine/personalConstellation.ts:12` | `.` (root) | `VERTICES`, `EDGES` |
| 23 | `services/AudioZoneManager.ts:8` | `sovereign` | `audioEngine` |
| 24 | `hooks/useAudio.ts:9` | `sovereign` | `audioEngine` |
| 25 | `services/audioManager.ts:27` | `sovereign` | `audioEngine` |
| 26 | `services/JitterbugAudioPool.ts:8` | `sovereign` | `audioEngine` |
| 27 | `__tests__/observatory.test.ts:9` | `.` (root) | `VERTICES`, `EDGES`, `AXES`, `AXIS_ORDER`, `STATE_GLOW`, `BUS_CSS`, `hashStr`, `baryToPosition`, `getDominantAxis`, `getGraphNodeColor`, `geodesicEdgeCount`, `type NodeInfo`, `type AxisKey` |
| 28 | `__tests__/personalConstellation.test.ts:2` | `.` (root) | `VERTICES`, `EDGES` |
| 29 | `__tests__/smart.test.ts:8` | `.` (root) | `sourceToGraphNodes`, `sourceToAxis`, `notificationToPulse`, `shouldPulse`, `COUNTDOWN_NODES`, `VERTICES`, `type NotificationSource` |

---

## 3. Import Count Per File

### shell/src/

| File | Import count | Sub-paths used |
|------|-------------|----------------|
| `features/economy/index.ts` | 2 | economy |
| `lib/cognitiveGate.ts` | 1 (9 symbols) | rules |
| `lib/__tests__/economy.test.ts` | 1 (6 symbols) | economy |
| `features/hardware/zoneStore.ts` | 1 (4 symbols) | ble |
| `lib/constitution.ts` | 1 (2 symbols) | rules |
| `lib/db.ts` | 1 (1 symbol) | economy |
| `lib/__tests__/zoneStore.test.ts` | 1 (2 symbols) | ble |
| `components/VisitorMindsetModal.tsx` | 1 (1 symbol) | ble |
| `components/CognitiveShieldSuggestion.tsx` | 1 (2 symbols) | rules |
| `features/sandbox/SandboxChat.tsx` | 1 (2 symbols) | rules |

### packages/

| File | Import count | Sub-paths used |
|------|-------------|----------------|
| `bonding/src/genesis/telemetryStore.ts` | 2 (10 symbols) | telemetry |
| `bonding/src/genesis/eventBus.ts` | 2 (3 symbols) | events |
| `bonding/src/store/geodesicStore.ts` | 1 | geodesic-campaign |
| `bonding/src/components/GeodesicMode.tsx` | 1 | geodesic-campaign |
| `bonding/src/lib/gameSync.ts` | 1 | net |
| `bonding/src/genesis/economyStore.ts` | 1 | economy |
| `spaceship-earth/src/__tests__/observatory.test.ts` | 1 (13 symbols) | root (observatory) |
| `spaceship-earth/src/__tests__/smart.test.ts` | 1 (7 symbols) | root (observatory) |
| `spaceship-earth/src/sovereign/useSovereignStore.ts` | 1 (4 symbols) | sovereign |
| `spaceship-earth/src/verify/hooks.ts` | 1 (3 symbols) | root (observatory) |
| `spaceship-earth/src/engine/personalConstellation.ts` | 1 (2 symbols) | root (observatory) |
| `spaceship-earth/src/__tests__/personalConstellation.test.ts` | 1 (2 symbols) | root (observatory) |
| `spaceship-earth/src/services/AudioZoneManager.ts` | 1 | sovereign |
| `spaceship-earth/src/hooks/useAudio.ts` | 1 | sovereign |
| `spaceship-earth/src/services/audioManager.ts` | 1 | sovereign |
| `spaceship-earth/src/services/JitterbugAudioPool.ts` | 1 | sovereign |

---

## 4. Most-Used Symbols (by import frequency)

| Symbol | Times imported | Files |
|--------|---------------|-------|
| `VERTICES` | 6 | hooks.ts, personalConstellation.ts, observatory.test.ts, personalConstellation.test.ts, smart.test.ts, observatory/graph.ts |
| `EDGES` | 5 | hooks.ts, personalConstellation.ts, observatory.test.ts, personalConstellation.test.ts, observatory/graph.ts |
| `audioEngine` | 5 | useSovereignStore.ts, AudioZoneManager.ts, useAudio.ts, audioManager.ts, JitterbugAudioPool.ts |
| `AXES` | 3 | hooks.ts, observatory.test.ts, observatory/graph.ts |
| `GEODESIC_CAMPAIGN` | 2 | geodesicStore.ts, GeodesicMode.tsx |
| `MessageAnalysis` | 3 | cognitiveGate.ts, CognitiveShieldSuggestion.tsx, SandboxChat.tsx |
| `ShieldedMessage` | 3 | cognitiveGate.ts, CognitiveShieldSuggestion.tsx, SandboxChat.tsx |
| `ZoneTransitionEvent` | 3 | zoneStore.ts, zoneStore.test.ts, VisitorMindsetModal.tsx |
| `useDualEconomyStore` | 2 | economy.test.ts, economy/index.ts |
| `computeBudget` | 2 | economy.test.ts, economy/index.ts |
| `GROSS_SPOONS` | 2 | economy.test.ts, economy/index.ts |
| `BORROW_INTEREST` | 2 | economy.test.ts, economy/index.ts |
| `LedgerEntry` | 2 | db.ts, economy.test.ts |
| `MorningAssessmentInput` | 2 | economy.test.ts, economy/index.ts |
| `useEconomyStore` | 2 | economy/index.ts, bonding/economyStore.ts |
| `initLoveSync` | 2 | economy/index.ts, bonding/economyStore.ts |

---

## 5. Domain Grouping

### BLE (Bluetooth Low Energy) — `@p31ca/shared/ble`
**Used by:** shell only (4 files)
- `SpaceshipBLEScanner`, `defaultBLEConfig` — runtime values
- `ZoneEnergy` — enum/const
- `ZoneTransitionEvent`, `ZoneId` — types

**Consumers:**
- `features/hardware/zoneStore.ts` — core BLE zone scanning
- `lib/__tests__/zoneStore.test.ts` — tests
- `components/VisitorMindsetModal.tsx` — type-only (ZoneTransitionEvent)

### Rules (Constitution Engine + Cognitive Shield) — `@p31ca/shared/rules`
**Used by:** shell only (4 files)
- `evaluateRules`, `createDefaultConstitution` — core engine
- `analyzeMessage`, `CognitiveShield`, `defaultShieldConfig` — Cognitive Shield
- `Constitution`, `RuleContext`, `Rule`, `RuleEvaluationResult` — types
- `MessageAnalysis`, `ShieldedMessage` — types (most cross-cutting)

**Consumers:**
- `lib/cognitiveGate.ts` — full integration (engine + shield + types)
- `lib/constitution.ts` — constitution bootstrap
- `components/CognitiveShieldSuggestion.tsx` — type-only
- `features/sandbox/SandboxChat.tsx` — type-only

### Economy (LOVE Ledger + Dual Currency) — `@p31ca/shared/economy`
**Used by:** shell (4 files) + bonding (1 file)
- `useDualEconomyStore`, `useEconomyStore` — Zustand stores
- `computeBudget`, `hydrateFromLedger`, `connectLedgerAppender` — functions
- `initLoveSync` — cloud sync bridge
- `GROSS_SPOONS`, `BORROW_INTEREST` — constants
- `MorningAssessmentInput`, `LedgerEntry` — types

**Consumers:**
- `features/economy/index.ts` — full re-export barrel
- `lib/db.ts` — type-only (LedgerEntry)
- `lib/__tests__/economy.test.ts` — tests
- `bonding/src/genesis/economyStore.ts` — re-export

### Observatory (Graph Data Engine) — `@p31ca/shared` (root re-export from `./observatory`)
**Used by:** spaceship-earth only (6 files)
- `VERTICES`, `EDGES`, `AXES`, `AXIS_ORDER` — graph constants
- `STATE_GLOW`, `BUS_CSS` — visual mapping constants
- `hashStr`, `baryToPosition`, `getDominantAxis`, `getGraphNodeColor`, `geodesicEdgeCount` — math/layout
- `COUNTDOWN_NODES`, `sourceToGraphNodes`, `sourceToAxis`, `notificationToPulse`, `shouldPulse` — SMART logic
- `NodeInfo`, `AxisKey`, `NotificationSource` — types

**Consumers:**
- `verify/hooks.ts` — VERTICES, EDGES, AXES
- `engine/personalConstellation.ts` — VERTICES, EDGES
- `__tests__/observatory.test.ts` — 13 symbols (comprehensive)
- `__tests__/personalConstellation.test.ts` — VERTICES, EDGES
- `__tests__/smart.test.ts` — 7 symbols (SMART logic)

### Sovereign (Audio + Crypto + PWA) — `@p31ca/shared/sovereign`
**Used by:** spaceship-earth only (5 files)
- `audioEngine` — ambient drone AudioContext (5 imports, most-used sovereign symbol)
- `generateDID`, `hashTelemetry`, `exportLedgerJSON` — crypto/identity utilities
- `createHealthResponse` — health check (not imported by any consumer)

**Consumers:**
- `sovereign/useSovereignStore.ts` — all 4 symbols
- `services/AudioZoneManager.ts` — audioEngine only
- `hooks/useAudio.ts` — audioEngine only
- `services/audioManager.ts` — audioEngine only
- `services/JitterbugAudioPool.ts` — audioEngine only

### Telemetry — `@p31ca/shared/telemetry`
**Used by:** bonding only (1 file, re-export barrel)
- `telemetryAddEvent`, `telemetrySeal`, `telemetryRecoverOrphans`, `telemetryInit`, `telemetryAttachLifecycleHandlers`, `telemetryCleanup`, `telemetryGetBuffer`, `telemetryGetSessionId`
- `type TelemetryEvent`, `type TelemetryConfig`

### Events — `@p31ca/shared/events`
**Used by:** bonding only (1 file, re-export barrel)
- `eventBus`, `GameEventType`
- `type GameEventMap`

### Net — `@p31ca/shared/net`
**Used by:** bonding only (1 file)
- `fetchWithTimeout`

### Geodesic Campaign — `@p31ca/shared/geodesic-campaign`
**Used by:** bonding only (2 files)
- `GEODESIC_CAMPAIGN`

### ZUI (3D Visualization) — `@p31ca/shared/zui`
**Used by:** 0 direct imports in audited codebase (exported but unused by shell/bonding/spaceship-earth)

### Theme — `@p31ca/shared/theme`
**Used by:** 0 direct imports in audited codebase

### Trust — `@p31ca/shared/trust`
**Used by:** 0 direct imports in audited codebase

### Hibernation — `@p31ca/shared/hibernation`
**Used by:** 0 direct imports in audited codebase

### Types — `@p31ca/shared/types`
**Used by:** 0 direct imports in audited codebase

### UI — `@p31ca/shared/ui`
**Used by:** 0 direct imports in audited codebase

### Other sub-paths (0 consumers in audited codebase)
- `geodesic-room-wire`
- `geodesic-build-snapshot`
- `cars-wire`
- `cognitive-passport-schema`
- `cognitive-passport-profiles`
- `cognitive-passport`
- `qfactor`
- `buffer`
- `crypto/pqc`
- `telemetry/daubert`
- `theme/canon`
- `theme/canon-brand`
- `theme/tailwind-preset`
- `version`

---

## 6. Recommended Split Boundaries

Based on actual usage patterns and domain cohesion, here are the recommended new packages:

### Package A: `@p31ca/ble` (BLE / Hardware)
**Sub-path:** `@p31ca/shared/ble` → `@p31ca/ble`
**Symbols:** SpaceshipBLEScanner, defaultBLEConfig, ZoneEnergy, ZoneTransitionEvent, ZoneId
**Consumers:** shell only (4 files)
**Dependencies:** zustand (for zoneStore state)
**Rationale:** Self-contained hardware integration, zero overlap with other domains.

### Package B: `@p31ca/rules` (Constitution Engine + Cognitive Shield)
**Sub-path:** `@p31ca/shared/rules` → `@p31ca/rules`
**Symbols:** evaluateRules, createDefaultConstitution, analyzeMessage, CognitiveShield, defaultShieldConfig, addCreatorRule, removeCreatorRule, updateCreatorRule, rewriteMessage + types
**Consumers:** shell only (4 files)
**Dependencies:** none (pure TypeScript)
**Rationale:** Pure logic, no UI framework deps. Clean boundary.

### Package C: `@p31ca/economy` (LOVE Ledger + Dual Currency)
**Sub-path:** `@p31ca/shared/economy` → `@p31ca/economy`
**Symbols:** useDualEconomyStore, useEconomyStore, initLoveSync, connectLedgerAppender, computeBudget, hydrateFromLedger, GROSS_SPOONS, BORROW_INTEREST + types
**Consumers:** shell (4 files) + bonding (1 file)
**Dependencies:** zustand, idb-keyval
**Rationale:** Self-contained economic logic. Bonding re-exports can point to new package.

### Package D: `@p31ca/observatory` (Graph Data Engine)
**Sub-path:** `@p31ca/shared` (root) → `@p31ca/observatory`
**Symbols:** VERTICES, EDGES, AXES, AXIS_ORDER, STATE_GLOW, BUS_CSS, hashStr, baryToPosition, getDominantAxis, getGraphNodeColor, geodesicEdgeCount, COUNTDOWN_NODES, sourceToGraphNodes, sourceToAxis, notificationToPulse, shouldPulse + types
**Consumers:** spaceship-earth only (6 files)
**Dependencies:** none (pure TypeScript)
**Rationale:** Pure data + math, zero framework deps. Only spaceship-earth uses it.

### Package E: `@p31ca/sovereign` (Audio + Crypto + PWA)
**Sub-path:** `@p31ca/shared/sovereign` → `@p31ca/sovereign`
**Symbols:** audioEngine, generateDID, hashTelemetry, exportLedgerJSON, createHealthResponse, quantumVertexShader, quantumFragmentShader, disposeThreeNode, setupSovereignPWA + types
**Consumers:** spaceship-earth only (5 files)
**Dependencies:** three.js, @noble/ed25519, @cloudflare/workers-types
**Rationale:** Heaviest dependency tree. Only spaceship-earth uses it. audioEngine is 5/5 imports.

### Package F: `@p31ca/telemetry` (Observability)
**Sub-path:** `@p31ca/shared/telemetry` → `@p31ca/telemetry`
**Symbols:** telemetryAddEvent, telemetrySeal, telemetryRecoverOrphans, telemetryInit, telemetryAttachLifecycleHandlers, telemetryCleanup, telemetryGetBuffer, telemetryGetSessionId + logger + types
**Consumers:** bonding only (1 file, re-export barrel)
**Dependencies:** pino, pino-pretty
**Rationale:** Self-contained observability. Only bonding uses it.

### Package G: `@p31ca/events` (Event Bus)
**Sub-path:** `@p31ca/shared/events` → `@p31ca/events`
**Symbols:** eventBus, GameEventType, GameEventMap
**Consumers:** bonding only (1 file, re-export barrel)
**Dependencies:** none (pure TypeScript)
**Rationale:** Tiny, self-contained. Only bonding uses it.

### Package H: `@p31ca/geodesic` (Campaign Data)
**Sub-path:** `@p31ca/shared/geodesic-campaign` → `@p31ca/geodesic`
**Symbols:** GEODESIC_CAMPAIGN
**Consumers:** bonding only (2 files)
**Dependencies:** none (pure TypeScript data)
**Rationale:** Pure data constant. Only bonding uses it.

### Package I: `@p31ca/net` (Network Utilities)
**Sub-path:** `@p31ca/shared/net` → `@p31ca/net`
**Symbols:** fetchWithTimeout
**Consumers:** bonding only (1 file)
**Dependencies:** none
**Rationale:** Single utility function. Could stay in shared or become standalone.

### Remainder: `@p31ca/shared` (Reduced)
After splitting, `@p31ca/shared` would retain:
- `schema-versions`, `cogpass-consumer-registry`
- `merkle`, `zk`, `version`
- `zui` (unused but exported), `ui`, `types`, `trust`, `hibernation`
- `theme`, `cognitive-passport`, `cognitive-passport-schema`, `cognitive-passport-profiles`
- `geodesic-room-wire`, `geodesic-build-snapshot`, `cars-wire`
- `qfactor`, `buffer`, `crypto/pqc`, `telemetry/daubert`

This is the "everything else" bag — mostly unused by the audited consumers.

---

## 7. Files That Would Need Updating Per Split

### If splitting `@p31ca/ble`:
- `shell/src/features/hardware/zoneStore.ts` — change import path
- `shell/src/lib/__tests__/zoneStore.test.ts` — change import path
- `shell/src/components/VisitorMindsetModal.tsx` — change import path

### If splitting `@p31ca/rules`:
- `shell/src/lib/cognitiveGate.ts` — change import path
- `shell/src/lib/constitution.ts` — change import path
- `shell/src/components/CognitiveShieldSuggestion.tsx` — change import path
- `shell/src/features/sandbox/SandboxChat.tsx` — change import path

### If splitting `@p31ca/economy`:
- `shell/src/features/economy/index.ts` — change import path (+ update re-exports)
- `shell/src/lib/db.ts` — change import path
- `shell/src/lib/__tests__/economy.test.ts` — change import path
- `packages/bonding/src/genesis/economyStore.ts` — change import path

### If splitting `@p31ca/observatory`:
- `packages/spaceship-earth/src/verify/hooks.ts` — change import path
- `packages/spaceship-earth/src/engine/personalConstellation.ts` — change import path
- `packages/spaceship-earth/src/__tests__/observatory.test.ts` — change import path
- `packages/spaceship-earth/src/__tests__/personalConstellation.test.ts` — change import path
- `packages/spaceship-earth/src/__tests__/smart.test.ts` — change import path

### If splitting `@p31ca/sovereign`:
- `packages/spaceship-earth/src/sovereign/useSovereignStore.ts` — change import path
- `packages/spaceship-earth/src/services/AudioZoneManager.ts` — change import path
- `packages/spaceship-earth/src/hooks/useAudio.ts` — change import path
- `packages/spaceship-earth/src/services/audioManager.ts` — change import path
- `packages/spaceship-earth/src/services/JitterbugAudioPool.ts` — change import path

### If splitting `@p31ca/telemetry`:
- `packages/bonding/src/genesis/telemetryStore.ts` — change import path

### If splitting `@p31ca/events`:
- `packages/bonding/src/genesis/eventBus.ts` — change import path

### If splitting `@p31ca/geodesic`:
- `packages/bonding/src/store/geodesicStore.ts` — change import path
- `packages/bonding/src/components/GeodesicMode.tsx` — change import path

### If splitting `@p31ca/net`:
- `packages/bonding/src/lib/gameSync.ts` — change import path

---

## 8. Key Observations

1. **No consumer uses the root `@p31ca/shared` import** except spaceship-earth (observatory symbols only). All shell/bonding imports use sub-paths.

2. **Sub-path exports are already working** — the package.json `exports` map has 28 entries. The split is already architecturally half-done.

3. **Zero overlap between shell and spaceship-earth** — they use completely different domains (ble/rules/economy vs observatory/sovereign). Clean split boundary.

4. **Bonding is the only cross-domain consumer** — it uses economy, telemetry, events, geodesic-campaign, and net. Each maps to a clean split.

5. **The biggest win is splitting observatory + sovereign** — these are used ONLY by spaceship-earth, have heavy deps (three.js), and the observatory module is pure TypeScript (zero deps).

6. **Unused sub-paths** — zui, ui, types, trust, hibernation, theme, qfactor, buffer, crypto/pqc, telemetry/daubert, cognitive-passport-*, geodesic-room-wire, geodesic-build-snapshot, cars-wire have zero consumers in the audited codebase. These may be consumed by apps outside shell/bonding/spaceship-earth (phos, willow, etc.) — a wider audit would be needed.

7. **Re-export barrels in bonding** (`genesis/telemetryStore.ts`, `genesis/eventBus.ts`, `genesis/economyStore.ts`) are thin wrappers — they exist solely for backward compat after the WCD-M02 migration. Once bonding imports point directly to the new packages, these barrels can be deleted.
