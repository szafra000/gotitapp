self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// NOTE: setTimeout in a service worker is unreliable — the browser can kill the SW
// at any time. The page-side countdown is the primary alarm. This SW notification
// acts as a BACKUP for when the screen is locked or the tab is in the background.

self.onmessage = (event) => {
    if (event.data.type === 'SCHEDULE') {
        const item  = event.data.item;
        const delay = event.data.delay;

        // Store the alarm time so we can recover if SW restarts
        const fireAt = Date.now() + delay;

        setTimeout(() => {
            self.registration.showNotification("🚨 GOT IT? 🚨", {
                body: `GRAB YOUR ${item.toUpperCase()} NOW! Don't forget!`,
                vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 110, 
                           150, 110, 100, 110, 70, 110, 50, 110, 50],
                tag: 'urgent-reminder',
                renotify: true,
                requireInteraction: true,   // stays on screen until tapped
                // Action buttons force a conscious choice — harder to swipe away
                actions: [
                    { action: 'got-it',  title: '✅ GOT IT!'    },
                    { action: 'snooze',  title: '⏰ Snooze 1min' }
                ],
                data: { item, fireAt }
            });
        }, delay);
    }
};

self.addEventListener('notificationclick', (event) => {
    const { action } = event;
    const { item }   = event.notification.data || {};
    event.notification.close();

    if (action === 'snooze') {
        // Re-fire in 60 seconds
        event.waitUntil(
            new Promise((resolve) => {
                setTimeout(() => {
                    self.registration.showNotification("🚨 SNOOZE UP! GOT IT? 🚨", {
                        body: `Still need to grab your ${item ? item.toUpperCase() : 'ITEM'}!`,
                        vibrate: [500, 110, 500, 110, 500, 110, 500],
                        tag: 'urgent-reminder',
                        renotify: true,
                        requireInteraction: true,
                        actions: [
                            { action: 'got-it', title: '✅ GOT IT!' }
                        ],
                        data: { item }
                    });
                    resolve();
                }, 60000);
            })
        );
        return;
    }

    // 'got-it' or direct tap — open/focus the app and notify it
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.postMessage({ type: 'NOTIFICATION_CLICKED', item });
                    return client.focus();
                }
            }
            return clients.openWindow('/');
        })
    );
});