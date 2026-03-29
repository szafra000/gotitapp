self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

let nagInterval = null;

self.onmessage = (event) => {
    if (event.data.type === 'SCHEDULE_URGENT') {
        const { item, delay } = event.data;
        
        setTimeout(() => {
            // FIRE INITIAL ALERT
            fireNag(item);

            // START NAGGING LOOP: Every 20 seconds until clicked
            nagInterval = setInterval(() => {
                fireNag(item);
            }, 20000); 

        }, delay);
    }
};

function fireNag(item) {
    self.registration.showNotification("🚨🚨 URGENT: GOT IT? 🚨🚨", {
        body: `GRAB YOUR ${item.toUpperCase()} NOW!`,
        tag: 'urgent-nag',
        renotify: true,
        vibrate: [500, 110, 500, 110, 450, 110], 
        requireInteraction: true // Keeps alert on screen
    });
}

self.addEventListener('notificationclick', (e) => {
    // STOP THE NAG LOOP
    if (nagInterval) clearInterval(nagInterval);
    
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('/');
        })
    );
});
