#!/usr/bin/env node
/**
 * P31 MIDI 2.0 / UMP sidecar — STUB.
 *
 * The research verdict (2026-09): the Web MIDI API does NOT expose MIDI 2.0
 * UMP to JavaScript. Chrome 152's change was a macOS *backend* refactor
 * (MidiManagerMac → CoreMIDI's MIDIEventList), converting UMP↔MIDI 1.0
 * internally. The converter shipped a SysEx regression, and no W3C spec
 * section exists for a UMP surface. So browser-side UMP is not a target.
 *
 * This sidecar is the real path when UMP is needed: a Node process that
 * speaks Universal MIDI Packet to the OS MIDI stack (via libremidi's UMP
 * layer) and bridges to the ControlRoom's /control/midi WS.
 *
 * It is a documented SEAM, not a working feature. Do not ship it enabled.
 *
 * UMP packet shape (for the implementation that fills this in):
 *   • UMP is 32-bit words. A MIDI 1.0 Channel Voice message tunnels as a
 *     single 32-bit UMP (Message Type 0x2):
 *       [ mt=0x2 | group(4) | status(4) | channel(4) | data1(7) | data2(7) | 0 ]
 *   • MIDI 2.0 Channel Voice is 64-bit (Message Type 0x4): the 7-bit values
 *     scale up to 16/32-bit, which is the resolution win.
 *   • SysEx7 UMPs carry only the data between the MIDI 1.0 F0 and F7
 *     bracketing bytes — the brackets are implied by the UMP type.
 *
 * Implementation outline:
 *   1. Open a libremidi UMP input/output.
 *   2. Subscribe to /control/midi WS.
 *   3. On a UMP packet from the OS, translate to a control frame and send.
 *   4. On a control frame from the DO, translate to a UMP packet and send.
 *
 * Not implemented. Exits with a clear message so a caller never mistakes the
 * seam for a feature.
 */

console.error('[midi2] MIDI 2.0/UMP sidecar is not implemented.');
console.error('[midi2] The Web MIDI API does not expose UMP to JavaScript (2026-09).');
console.error('[midi2] This sidecar is the documented path when UMP is required.');
console.error('[midi2] See the header of this file for the implementation outline.');
process.exit(1);