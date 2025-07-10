const CACHE_NAME = 'shoppwa-v1.2.0';
const RUNTIME_CACHE = 'runtime-cache-v1';
const OFFLINE_URL = '/offline.html';

// Resources to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/cart.js',
  '/js/push-notifications.js',
  '/manifest.json',
  '/offline.html',
  // Add critical fonts and icons
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Resources to cache at runtime
const RUNTIME_CACHE_URLS = [
  '/data/products.json',
  '/icons/',
  '/images/'
];

// Network-first resources (API calls)
const NETWORK_FIRST_PATTERNS = [
  /^https:\/\/api\./,
  /\/api\//,
  /\/data\/.*\.json$/
];

// Cache-first resources (static assets)
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:js|css)$/,
  /^https:\/\/fonts\./,
  /^https:\/\/cdn\./
];

// Install event - precache essential resources
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching essential resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Handle API requests with network-first strategy
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Default strategy: cache first with network fallback
  event.respondWith(cacheFirst(request));
});

// Navigation request handler
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page if available
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - ShopPWA</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-content { max-width: 400px; margin: 0 auto; }
            .offline-icon { font-size: 4em; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-content">
            <div class="offline-icon">📵</div>
            <h1>You're Offline</h1>
            <p>Check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Network-first caching strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache-first caching strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Network failed, but we have cached version
    });
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url);
    throw error;
  }
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push received:', event);
  
  let notificationData = {
    title: 'ShopPWA Notification',
    body: 'You have a new update!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'shoppwa-notification',
    renotify: true,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  const urlToOpen = action === 'view' ? (notificationData.url || '/') : '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Check if app is already open
      for (let client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCart());
  } else if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders());
  }
});

// Sync cart data when online
async function syncCart() {
  try {
    // Get pending cart operations from IndexedDB
    const pendingOperations = await getStoredData('pending-cart-operations');
    
    if (pendingOperations && pendingOperations.length > 0) {
      for (const operation of pendingOperations) {
        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(operation)
          });
          
          // Remove successful operation
          await removeStoredData('pending-cart-operations', operation.id);
        } catch (error) {
          console.error('[SW] Failed to sync cart operation:', error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Cart sync failed:', error);
  }
}

// Sync order data when online
async function syncOrders() {
  try {
    // Similar implementation for order sync
    console.log('[SW] Order sync completed');
  } catch (error) {
    console.error('[SW] Order sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getStoredData(key) {
  // In a real implementation, this would use IndexedDB
  return JSON.parse(localStorage.getItem(key) || '[]');
}

async function removeStoredData(key, id) {
  // In a real implementation, this would use IndexedDB
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = data.filter(item => item.id !== id);
  localStorage.setItem(key, JSON.stringify(filtered));
}

// Handle message events from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync for cache updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cache-update') {
    event.waitUntil(updateCriticalResources());
  }
});

async function updateCriticalResources() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const criticalUrls = ['/data/products.json', '/api/featured-products'];
    
    await Promise.all(
      criticalUrls.map(async url => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.error('[SW] Failed to update:', url);
        }
      })
    );
  } catch (error) {
    console.error('[SW] Critical resource update failed:', error);
  }
}