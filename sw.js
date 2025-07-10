const CACHE_NAME = 'shopease-v1.2.0';
const OFFLINE_URL = 'offline.html';

// Define cache strategies for different types of resources
const CACHE_STRATEGIES = {
  // Core app files - cache first
  APP_SHELL: [
    '/',
    '/index.html',
    '/offline.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/offline.js',
    '/js/notifications.js',
    '/manifest.json'
  ],
  
  // API endpoints - network first with cache fallback
  API_ENDPOINTS: [
    '/api/products',
    '/api/categories',
    '/api/cart',
    '/api/user'
  ],
  
  // Images and assets - cache first with network fallback
  ASSETS: [
    '/images/icons/',
    '/images/products/'
  ]
};

// Install event - pre-cache app shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(CACHE_STRATEGIES.APP_SHELL);
      })
      .then(() => {
        console.log('Service Worker: App shell cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching app shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: App Shell - Cache First
    if (isAppShell(url.pathname)) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: API calls - Network First
    if (isApiCall(url.pathname)) {
      return await networkFirst(request);
    }
    
    // Strategy 3: Images and assets - Cache First
    if (isAsset(request)) {
      return await cacheFirst(request);
    }
    
    // Strategy 4: HTML pages - Network First with offline fallback
    if (request.destination === 'document') {
      return await networkFirstWithOfflineFallback(request);
    }
    
    // Default: Network First
    return await networkFirst(request);
    
  } catch (error) {
    console.error('Service Worker: Fetch error:', error);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

// Cache First Strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse && networkResponse.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First Strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network First with Offline Fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return caches.match(OFFLINE_URL);
  }
}

// Helper functions to determine caching strategy
function isAppShell(pathname) {
  return CACHE_STRATEGIES.APP_SHELL.some(path => 
    pathname === path || pathname.startsWith(path)
  );
}

function isApiCall(pathname) {
  return pathname.startsWith('/api/');
}

function isAsset(request) {
  return request.destination === 'image' || 
         request.destination === 'font' ||
         request.destination === 'style' ||
         request.destination === 'script';
}

// Background Sync for offline cart updates
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCartData());
  }
  
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrderData());
  }
});

async function syncCartData() {
  try {
    // Get pending cart updates from IndexedDB
    const pendingUpdates = await getStoredData('pendingCartUpdates');
    
    if (pendingUpdates && pendingUpdates.length > 0) {
      // Send updates to server
      for (const update of pendingUpdates) {
        await fetch('/api/cart/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update)
        });
      }
      
      // Clear pending updates
      await clearStoredData('pendingCartUpdates');
      console.log('Service Worker: Cart data synced successfully');
    }
  } catch (error) {
    console.error('Service Worker: Cart sync failed:', error);
    throw error;
  }
}

async function syncOrderData() {
  try {
    const pendingOrders = await getStoredData('pendingOrders');
    
    if (pendingOrders && pendingOrders.length > 0) {
      for (const order of pendingOrders) {
        await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order)
        });
      }
      
      await clearStoredData('pendingOrders');
      console.log('Service Worker: Order data synced successfully');
    }
  } catch (error) {
    console.error('Service Worker: Order sync failed:', error);
    throw error;
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    badge: '/images/icons/icon-72x72.png',
    icon: '/images/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {},
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/images/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/images/icons/dismiss-icon.png'
      }
    ]
  };
  
  let notificationData = {
    title: 'ShopEase Notification',
    body: 'You have a new update!',
    ...options
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        ...options,
        data: payload.data || {}
      };
    } catch (error) {
      console.error('Service Worker: Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Default action or 'view' action
  let targetUrl = '/';
  
  if (data && data.url) {
    targetUrl = data.url;
  } else if (data && data.productId) {
    targetUrl = `/product/${data.productId}`;
  } else if (data && data.orderId) {
    targetUrl = `/order/${data.orderId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Utility functions for IndexedDB operations
async function getStoredData(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ShopEaseDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offline'], 'readonly');
      const store = transaction.objectStore('offline');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result ? getRequest.result.data : null);
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function clearStoredData(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ShopEaseDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offline'], 'readwrite');
      const store = transaction.objectStore('offline');
      const deleteRequest = store.delete(key);
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
      
      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}