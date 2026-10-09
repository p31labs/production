# Operation: Rotate the WLED Bridge Address

**Cadence**: on device change.

## Overview

The WLED bridge is client-side and takes a user-entered address (a LAN IP,
e.g. `192.168.1.50`). No hardcoded IPs exist by design — the address lives in
the Lights tab. When the device's DHCP lease changes or the device is
replaced, update the address.

## Steps

1. Find the device's current address. WLED devices on the same network are
   discoverable at `http://wled.local/json/info` (if mDNS is on) or via the
   router's DHCP client list.
2. Update the address in the surface's Lights tab.
3. Confirm the bridge reports `online` (the honest state — never a fake
   green dot):

   ```bash
   # From a machine on the same network:
   curl -s -o /dev/null -w "%{http_code}\n" http://<new-address>/json/info
   ```

## Verification

- [ ] The address in the Lights tab matches the device
- [ ] `curl` to `/json/info` returns 200 from the client's network
- [ ] The bridge status flips to `online`