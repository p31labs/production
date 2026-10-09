import { create } from 'zustand';
import {
  SpaceshipBLEScanner,
  defaultBLEConfig,
  type ZoneTransitionEvent,
  type ZoneId,
} from '@p31ca/ble';
import { writeZoneAccessLog } from '../../lib/zoneLog';

let _scanner: SpaceshipBLEScanner | null = null;

function getScanner(): SpaceshipBLEScanner {
  if (!_scanner) {
    _scanner = new SpaceshipBLEScanner(defaultBLEConfig);
  }
  return _scanner;
}

interface ZoneState {
  scannerReady: boolean;
  isScanning: boolean;
  currentZoneId: ZoneId | null;
  pendingTransition: ZoneTransitionEvent | null;
  error: string | null;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  handleTransition: (event: ZoneTransitionEvent) => void;
  acknowledgeTransition: () => Promise<void>;
  dismissTransition: () => void;
}

export const useZoneStore = create<ZoneState>()((set, get) => ({
  scannerReady: SpaceshipBLEScanner.isSupported(),
  isScanning: false,
  currentZoneId: null,
  pendingTransition: null,
  error: null,

  startScan: async () => {
    const scanner = getScanner();
    try {
      await scanner.startScan((event) => get().handleTransition(event));
      set({ isScanning: true, error: null });
    } catch (err) {
      set({ isScanning: false, error: err instanceof Error ? err.message : 'BLE scan failed' });
    }
  },

  stopScan: async () => {
    try {
      await getScanner().stopScan();
    } finally {
      set({ isScanning: false });
    }
  },

  handleTransition: (event) => {
    set({ pendingTransition: event });
  },

  acknowledgeTransition: async () => {
    const { pendingTransition } = get();
    if (!pendingTransition) return;
    const zoneToId = pendingTransition.beacon.manufacturerData.zoneToId;
    try {
      await writeZoneAccessLog({
        zoneId: String(zoneToId),
        kind: 'acknowledge',
        payload: {
          fromZone: pendingTransition.fromZone.id,
          toZone: pendingTransition.toZone.id,
          energyDelta: pendingTransition.energyDelta,
          direction: pendingTransition.direction,
          acknowledged: true,
        },
      });
    } finally {
      set({ pendingTransition: null, currentZoneId: zoneToId });
    }
  },

  dismissTransition: () => {
    set({ pendingTransition: null });
  },
}));
