// Push Notifications Manager
class NotificationManager {
    constructor() {
        this.swRegistration = null;
        this.isSubscribed = false;
        this.vapidPublicKey = 'your-vapid-public-key-here'; // Replace with actual VAPID key
        
        this.init();
    }
    
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return;
        }
        
        try {
            this.swRegistration = await navigator.serviceWorker.ready;
            await this.checkSubscription();
            this.bindEvents();
            
            console.log('Notification Manager initialized');
        } catch (error) {
            console.error('Error initializing notifications:', error);
        }
    }
    
    bindEvents() {
        const notificationBtn = document.getElementById('notificationBtn');
        const enableBtn = document.getElementById('enableNotificationsBtn');
        const dismissBtn = document.getElementById('dismissNotificationsBtn');
        
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.handleNotificationClick());
        }
        
        if (enableBtn) {
            enableBtn.addEventListener('click', () => this.requestPermission());
        }
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => this.dismissNotificationPrompt());
        }
    }
    
    async checkSubscription() {
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            this.isSubscribed = !(subscription === null);
            
            this.updateUI();
            
            if (this.isSubscribed) {
                console.log('User is subscribed to notifications');
            } else {
                console.log('User is not subscribed to notifications');
                this.showNotificationPrompt();
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
        }
    }
    
    async handleNotificationClick() {
        const permission = Notification.permission;
        
        if (permission === 'denied') {
            this.showPermissionDeniedMessage();
        } else if (permission === 'granted') {
            if (this.isSubscribed) {
                this.showNotificationSettings();
            } else {
                await this.subscribeUser();
            }
        } else {
            await this.requestPermission();
        }
    }
    
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Notification permission granted');
                await this.subscribeUser();
                this.hideNotificationPrompt();
                this.showSuccessMessage('Notifications enabled successfully!');
            } else if (permission === 'denied') {
                console.log('Notification permission denied');
                this.hideNotificationPrompt();
                this.showPermissionDeniedMessage();
            } else {
                console.log('Notification permission dismissed');
                this.hideNotificationPrompt();
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    }
    
    async subscribeUser() {
        try {
            const applicationServerKey = this.urlB64ToUint8Array(this.vapidPublicKey);
            
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });
            
            console.log('User subscribed:', subscription);
            
            await this.sendSubscriptionToServer(subscription);
            
            this.isSubscribed = true;
            this.updateUI();
            
            // Send welcome notification
            this.sendLocalNotification('Welcome to ShopEase!', 'You\'ll now receive updates about deals and new products.');
            
        } catch (error) {
            console.error('Failed to subscribe user:', error);
            this.showErrorMessage('Failed to enable notifications. Please try again.');
        }
    }
    
    async unsubscribeUser() {
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();
                await this.removeSubscriptionFromServer(subscription);
                
                console.log('User unsubscribed');
                this.isSubscribed = false;
                this.updateUI();
                
                this.showSuccessMessage('Notifications disabled successfully');
            }
        } catch (error) {
            console.error('Error unsubscribing:', error);
        }
    }
    
    async sendSubscriptionToServer(subscription) {
        // Simulate sending subscription to server
        console.log('Sending subscription to server:', subscription);
        
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });
            
            if (!response.ok) {
                throw new Error('Failed to send subscription to server');
            }
            
        } catch (error) {
            // If server is not available, store locally for later sync
            console.log('Server not available, storing subscription locally');
            localStorage.setItem('pendingSubscription', JSON.stringify(subscription));
        }
    }
    
    async removeSubscriptionFromServer(subscription) {
        try {
            await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('Error removing subscription from server:', error);
        }
    }
    
    sendLocalNotification(title, body, options = {}) {
        if (Notification.permission === 'granted') {
            const defaultOptions = {
                icon: '/images/icons/icon-192x192.png',
                badge: '/images/icons/icon-72x72.png',
                vibrate: [200, 100, 200],
                data: {
                    timestamp: Date.now()
                },
                actions: [
                    {
                        action: 'view',
                        title: 'View'
                    },
                    {
                        action: 'dismiss',
                        title: 'Dismiss'
                    }
                ]
            };
            
            const notificationOptions = { ...defaultOptions, ...options };
            
            if (this.swRegistration) {
                this.swRegistration.showNotification(title, notificationOptions);
            } else {
                new Notification(title, notificationOptions);
            }
        }
    }
    
    // Predefined notification types for e-commerce
    notifyNewDeal(product) {
        this.sendLocalNotification(
            '🏷️ Special Deal!',
            `${product.name} is now ${product.discount}% off!`,
            {
                data: {
                    type: 'deal',
                    productId: product.id,
                    url: `/product/${product.id}`
                },
                tag: 'deal-' + product.id
            }
        );
    }
    
    notifyOrderUpdate(order) {
        this.sendLocalNotification(
            '📦 Order Update',
            `Your order #${order.id} is ${order.status}`,
            {
                data: {
                    type: 'order',
                    orderId: order.id,
                    url: `/order/${order.id}`
                },
                tag: 'order-' + order.id
            }
        );
    }
    
    notifyPriceAlert(product) {
        this.sendLocalNotification(
            '💰 Price Alert',
            `${product.name} dropped to $${product.price}!`,
            {
                data: {
                    type: 'price-alert',
                    productId: product.id,
                    url: `/product/${product.id}`
                },
                tag: 'price-' + product.id
            }
        );
    }
    
    notifyBackInStock(product) {
        this.sendLocalNotification(
            '✨ Back in Stock',
            `${product.name} is available again!`,
            {
                data: {
                    type: 'stock',
                    productId: product.id,
                    url: `/product/${product.id}`
                },
                tag: 'stock-' + product.id
            }
        );
    }
    
    showNotificationPrompt() {
        const dismissed = localStorage.getItem('notificationPromptDismissed');
        if (!dismissed && Notification.permission === 'default') {
            const prompt = document.getElementById('notificationPrompt');
            if (prompt) {
                prompt.classList.remove('hidden');
            }
        }
    }
    
    hideNotificationPrompt() {
        const prompt = document.getElementById('notificationPrompt');
        if (prompt) {
            prompt.classList.add('hidden');
        }
    }
    
    dismissNotificationPrompt() {
        this.hideNotificationPrompt();
        localStorage.setItem('notificationPromptDismissed', 'true');
    }
    
    showNotificationSettings() {
        // Create and show notification settings modal
        const modal = this.createSettingsModal();
        document.body.appendChild(modal);
    }
    
    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Notification Settings</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="dealNotifications" ${this.getSetting('deals') ? 'checked' : ''}>
                            Deal alerts
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="orderNotifications" ${this.getSetting('orders') ? 'checked' : ''}>
                            Order updates
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="priceNotifications" ${this.getSetting('prices') ? 'checked' : ''}>
                            Price alerts
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="stockNotifications" ${this.getSetting('stock') ? 'checked' : ''}>
                            Stock alerts
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="notificationManager.saveSettings()">Save</button>
                    <button class="btn-secondary" onclick="notificationManager.unsubscribeUser()">Disable All</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
    
    saveSettings() {
        const settings = {
            deals: document.getElementById('dealNotifications').checked,
            orders: document.getElementById('orderNotifications').checked,
            prices: document.getElementById('priceNotifications').checked,
            stock: document.getElementById('stockNotifications').checked
        };
        
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
        
        // Close modal
        document.querySelector('.modal').remove();
        
        this.showSuccessMessage('Notification settings saved');
    }
    
    getSetting(type) {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        return settings[type] !== false; // Default to true
    }
    
    updateUI() {
        const notificationBtn = document.getElementById('notificationBtn');
        
        if (notificationBtn) {
            if (this.isSubscribed) {
                notificationBtn.textContent = '🔔';
                notificationBtn.title = 'Notifications enabled - Click to manage';
            } else {
                notificationBtn.textContent = '🔕';
                notificationBtn.title = 'Click to enable notifications';
            }
        }
    }
    
    showPermissionDeniedMessage() {
        this.showMessage(
            'Notifications Blocked',
            'To enable notifications, please allow them in your browser settings.',
            'warning'
        );
    }
    
    showSuccessMessage(message) {
        this.showMessage('Success', message, 'success');
    }
    
    showErrorMessage(message) {
        this.showMessage('Error', message, 'error');
    }
    
    showMessage(title, message, type) {
        if (window.app) {
            window.app.showNotification(`${title}: ${message}`, type);
        }
    }
    
    // Utility function to convert VAPID key
    urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
    
    // Demo functions for testing
    async testNotifications() {
        if (!this.isSubscribed) {
            console.log('User not subscribed to notifications');
            return;
        }
        
        // Test different notification types
        setTimeout(() => {
            this.notifyNewDeal({
                id: 1,
                name: 'Smartphone Pro Max',
                discount: 20
            });
        }, 2000);
        
        setTimeout(() => {
            this.notifyOrderUpdate({
                id: '12345',
                status: 'shipped'
            });
        }, 4000);
        
        setTimeout(() => {
            this.notifyPriceAlert({
                id: 2,
                name: 'Wireless Headphones',
                price: 199.99
            });
        }, 6000);
    }
    
    // Sync pending subscriptions when coming online
    async syncPendingSubscription() {
        const pending = localStorage.getItem('pendingSubscription');
        if (pending) {
            try {
                const subscription = JSON.parse(pending);
                await this.sendSubscriptionToServer(subscription);
                localStorage.removeItem('pendingSubscription');
                console.log('Pending subscription synced');
            } catch (error) {
                console.error('Error syncing pending subscription:', error);
            }
        }
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Export for global access
window.notificationManager = notificationManager;

// Add CSS for notification settings
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .setting-item {
        margin-bottom: 1rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--light-gray);
    }
    
    .setting-item:last-child {
        border-bottom: none;
    }
    
    .setting-item label {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-weight: 500;
    }
    
    .setting-item input[type="checkbox"] {
        margin-right: 0.75rem;
        transform: scale(1.2);
    }
`;
document.head.appendChild(notificationStyles);