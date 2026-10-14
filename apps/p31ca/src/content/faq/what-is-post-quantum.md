---
q: What does "post-quantum" mean for P31?
a: P31 uses ML-DSA-65 (FIPS 204) signatures and a hybrid Ed25519 + ML-DSA-65 key scheme — post-quantum cryptography at NIST Level 3. Post-quantum is the default, not an add-on. Your identity is built to survive a quantum attack on classical cryptography.
category: stack
---

The workspace portal generates a hybrid keypair (Ed25519 for compatibility, ML-DSA-65 for quantum resistance), dual-wrapped under a device key and a PIN re-wrap (PBKDF2, 200k iterations). The public `did:key` is what the rest of the workspace sees; the private key never leaves the device.