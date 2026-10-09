import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZoneEnergy, type ZoneTransitionEvent } from '@p31ca/ble';
import type { ZoneAccessLogEntry, ZoneAccessLogOptions } from '../zoneLog';

const writeSpy = vi.fn<(entry: ZoneAccessLogEntry, opts?: ZoneAccessLogOptions) => Promise<void>>(async () => {});
vi.mock('../../lib/zoneLog', () => ({ writeZoneAccessLog: writeSpy }));

let zoneStore: typeof import('../../features/hardware/zoneStore');

beforeEach(async () => {
  vi.resetModules();
  vi.restoreAllMocks();
  writeSpy.mockClear();
  zoneStore = await import('../../features/hardware/zoneStore');
  zoneStore.useZoneStore.setState({
    pendingTransition: null,
    currentZoneId: null,
    isScanning: false,
    error: null,
  });
});

function makeEvent(): ZoneTransitionEvent {
  return {
    id: 'evt-1',
    timestamp: Date.now(),
    userId: 'did:key:test',
    beacon: {
      deviceId: 'beacon-1',
      deviceName: 'Totem',
      rssi: -50,
      txPower: -59,
      serviceUUIDs: [],
      manufacturerData: {
        companyId: 0x02e5,
        zoneFromId: 6,
        zoneToId: 3,
        energyDelta: 2,
        flags: { hapticEnabled: false, requiresAck: true },
      },
      timestamp: Date.now(),
      estimatedDistance: 1.2,
      proximity: 'NEAR',
    },
    fromZone: { id: 'commons', name: 'Commons', energy: ZoneEnergy.BALANCED, rules: [], sovereignResident: 'SYSTEM', memberCount: 0, lastActivity: 0 },
    toZone: { id: 'focus', name: 'Focus', energy: ZoneEnergy.ORDERED, rules: ['No talking'], sovereignResident: 'SYSTEM', memberCount: 0, lastActivity: 0 },
    energyDelta: 2,
    direction: 'calming',
    acknowledged: false,
    dismissedWithoutAck: false,
  };
}

describe('zone store — transition state', () => {
  it('acknowledge logs a row and clears pending transition', async () => {
    zoneStore.useZoneStore.getState().handleTransition(makeEvent());
    expect(zoneStore.useZoneStore.getState().pendingTransition).not.toBeNull();

    await zoneStore.useZoneStore.getState().acknowledgeTransition();

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const [entry] = writeSpy.mock.calls[0];
    expect(entry.zoneId).toBe('3');
    expect(entry.payload?.acknowledged).toBe(true);
    expect(zoneStore.useZoneStore.getState().pendingTransition).toBeNull();
    expect(zoneStore.useZoneStore.getState().currentZoneId).toBe(3);
  });

  it('dismiss clears pending without logging', () => {
    zoneStore.useZoneStore.getState().handleTransition(makeEvent());
    zoneStore.useZoneStore.getState().dismissTransition();
    expect(zoneStore.useZoneStore.getState().pendingTransition).toBeNull();
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
