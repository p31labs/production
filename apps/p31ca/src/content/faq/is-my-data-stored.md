---
q: Is my data stored on a server?
a: No server-side identity store exists. Your did:key is generated and device-key-wrapped on your own device (AES-GCM under a non-extractable IndexedDB key); the server only ever sees the public DID.
category: family
---

The private key never leaves the device. The workspace portal wraps it under a device key, and the PIN re-wrap uses PBKDF2 (200k iterations, SHA-256). What the rest of the workspace sees is only the public `did:key`.