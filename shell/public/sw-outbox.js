/**
 * @file public/sw-outbox.js — Background Sync handler for outbox drain
 * 
 * This script is imported by the generated service worker to handle
 * Background Sync events for the outbox queue.
 * 
 * NOTE: This is a workaround for generateSW mode. In injectManifest mode,
 * this would be part of the main SW file.
 */

self.addEventListener('sync', (event) => {
  if (event.tag === 'outbox-drain') {
    console.log('[sw] Background Sync: outbox-drain triggered');
    
    // The actual drain logic runs in the page context (via tryDrain()),
    // but we signal the page to wake up and drain.
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'outbox-drain' });
          });
        })
    );
  }
});

console.log('[sw] Outbox Background Sync handler registered');
