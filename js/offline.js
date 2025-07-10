// Offline Functionality Module
class OfflineManager {
    constructor() {
        this.dbName = 'ShopEaseDB';
        this.dbVersion = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        
        this.init();
    }
    
    async init() {
        await this.initDB();
        this.setupOfflineHandlers();
        this.setupPeriodicSync();
        
        console.log('Offline Manager initialized');
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB opened successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('products')) {
                    const productsStore = db.createObjectStore('products', { keyPath: 'id' });
                    productsStore.createIndex('category', 'category', { unique: false });
                    productsStore.createIndex('name', 'name', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('cart')) {
                    db.createObjectStore('cart', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('offline')) {
                    db.createObjectStore('offline', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('type', 'type', { unique: false });
                }
                
                console.log('IndexedDB schema created/updated');
            };
        });
    }
    
    setupOfflineHandlers() {
        // Network status changes
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnline();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOffline();
        });
        
        // Detect slow or unreliable connections
        this.setupConnectionQualityDetection();
    }
    
    async handleOnline() {
        console.log('Connection restored - syncing offline data');
        
        try {
            await this.syncPendingData();
            await this.updateCachedData();
            this.showConnectionStatus('online');
        } catch (error) {
            console.error('Error during online sync:', error);
        }
    }
    
    handleOffline() {
        console.log('Connection lost - switching to offline mode');
        this.showConnectionStatus('offline');
    }
    
    setupConnectionQualityDetection() {
        // Monitor connection quality using Network Information API
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const updateConnectionInfo = () => {
                console.log('Connection type:', connection.effectiveType);
                console.log('Downlink:', connection.downlink);
                console.log('RTT:', connection.rtt);
                
                // Adjust caching strategy based on connection quality
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    this.enableAggressiveCaching();
                }
            };
            
            connection.addEventListener('change', updateConnectionInfo);
            updateConnectionInfo();
        }
    }
    
    enableAggressiveCaching() {
        // Cache more aggressively on slow connections
        console.log('Enabling aggressive caching for slow connection');
    }
    
    async storeProducts(products) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        
        try {
            for (const product of products) {
                await this.promisifyRequest(store.put(product));
            }
            console.log('Products stored offline');
        } catch (error) {
            console.error('Error storing products:', error);
        }
    }
    
    async getStoredProducts() {
        if (!this.db) return [];
        
        const transaction = this.db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        
        try {
            const result = await this.promisifyRequest(store.getAll());
            return result || [];
        } catch (error) {
            console.error('Error retrieving stored products:', error);
            return [];
        }
    }
    
    async storeCart(cart) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['cart'], 'readwrite');
        const store = transaction.objectStore('cart');
        
        try {
            // Clear existing cart
            await this.promisifyRequest(store.clear());
            
            // Store new cart items
            for (const item of cart) {
                await this.promisifyRequest(store.put(item));
            }
            console.log('Cart stored offline');
        } catch (error) {
            console.error('Error storing cart:', error);
        }
    }
    
    async getStoredCart() {
        if (!this.db) return [];
        
        const transaction = this.db.transaction(['cart'], 'readonly');
        const store = transaction.objectStore('cart');
        
        try {
            const result = await this.promisifyRequest(store.getAll());
            return result || [];
        } catch (error) {
            console.error('Error retrieving stored cart:', error);
            return [];
        }
    }
    
    async queueForSync(data) {
        if (!this.db) return;
        
        const syncItem = {
            data: data,
            timestamp: Date.now(),
            type: data.type || 'unknown',
            retryCount: 0
        };
        
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        
        try {
            await this.promisifyRequest(store.add(syncItem));
            console.log('Item queued for sync:', syncItem);
        } catch (error) {
            console.error('Error queueing sync item:', error);
        }
    }
    
    async syncPendingData() {
        if (!this.db || !this.isOnline) return;
        
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        
        try {
            const syncItems = await this.promisifyRequest(store.getAll());
            
            for (const item of syncItems) {
                try {
                    await this.processSyncItem(item);
                    
                    // Remove successfully synced item
                    await this.promisifyRequest(store.delete(item.id));
                    console.log('Sync item processed and removed:', item.id);
                    
                } catch (error) {
                    console.error('Error processing sync item:', error);
                    
                    // Increment retry count
                    item.retryCount = (item.retryCount || 0) + 1;
                    
                    // Remove item if max retries reached
                    if (item.retryCount >= 3) {
                        await this.promisifyRequest(store.delete(item.id));
                        console.log('Max retries reached, removing sync item:', item.id);
                    } else {
                        await this.promisifyRequest(store.put(item));
                    }
                }
            }
        } catch (error) {
            console.error('Error during sync process:', error);
        }
    }
    
    async processSyncItem(item) {
        const { data } = item;
        
        switch (data.type) {
            case 'cart-update':
                await this.syncCartData(data.cart);
                break;
            case 'order':
                await this.syncOrderData(data.order);
                break;
            case 'user-action':
                await this.syncUserAction(data.action);
                break;
            default:
                console.warn('Unknown sync item type:', data.type);
        }
    }
    
    async syncCartData(cart) {
        // Simulate API call to sync cart
        console.log('Syncing cart data:', cart);
        
        // This would normally be a real API call
        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }
    
    async syncOrderData(order) {
        // Simulate API call to submit order
        console.log('Syncing order data:', order);
        
        return new Promise((resolve) => {
            setTimeout(resolve, 1500);
        });
    }
    
    async syncUserAction(action) {
        // Simulate API call to sync user actions
        console.log('Syncing user action:', action);
        
        return new Promise((resolve) => {
            setTimeout(resolve, 500);
        });
    }
    
    async updateCachedData() {
        try {
            // Fetch fresh data when connection is restored
            const response = await fetch('/api/products');
            if (response.ok) {
                const products = await response.json();
                await this.storeProducts(products);
                
                // Update UI with fresh data
                if (window.app) {
                    window.app.products = products;
                    window.app.renderProducts(products);
                }
            }
        } catch (error) {
            console.error('Error updating cached data:', error);
        }
    }
    
    setupPeriodicSync() {
        // Attempt sync every 30 seconds when online
        setInterval(() => {
            if (this.isOnline) {
                this.syncPendingData();
            }
        }, 30000);
    }
    
    showConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        if (status === 'online') {
            statusElement.classList.add('hidden');
        } else {
            statusElement.classList.remove('hidden');
            statusElement.className = 'connection-status offline';
            statusText.textContent = "You're offline. Changes will sync when connection is restored.";
        }
    }
    
    // Utility to promisify IndexedDB requests
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Cache management methods
    async getCacheSize() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    available: estimate.quota,
                    usedMB: Math.round(estimate.usage / 1024 / 1024),
                    availableMB: Math.round(estimate.quota / 1024 / 1024)
                };
            } catch (error) {
                console.error('Error getting cache size:', error);
                return null;
            }
        }
        return null;
    }
    
    async clearOfflineData() {
        try {
            // Clear IndexedDB
            if (this.db) {
                const stores = ['products', 'cart', 'offline', 'syncQueue'];
                const transaction = this.db.transaction(stores, 'readwrite');
                
                for (const storeName of stores) {
                    const store = transaction.objectStore(storeName);
                    await this.promisifyRequest(store.clear());
                }
            }
            
            // Clear cache storage
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(name => caches.delete(name))
                );
            }
            
            // Clear local storage
            localStorage.removeItem('shopease-cart');
            localStorage.removeItem('shopease-products');
            localStorage.removeItem('pendingCartUpdates');
            
            console.log('Offline data cleared');
        } catch (error) {
            console.error('Error clearing offline data:', error);
        }
    }
    
    // Health check for offline functionality
    async healthCheck() {
        const health = {
            indexedDB: !!this.db,
            serviceWorker: 'serviceWorker' in navigator,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            pushNotifications: 'PushManager' in window,
            networkStatus: this.isOnline,
            storage: await this.getCacheSize()
        };
        
        console.log('Offline functionality health check:', health);
        return health;
    }
}

// Initialize offline manager
const offlineManager = new OfflineManager();

// Export for use in other modules
window.offlineManager = offlineManager;