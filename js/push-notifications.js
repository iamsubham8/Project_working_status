// Push Notifications Manager
class PushNotificationManager {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.subscription = null;
        this.registration = null;
        this.vapidPublicKey = 'BMqmKaAzOEJ8MfPCl9cKkYFtuxZGNNH6o-PvFXn5z8K9v1cOTJXe8OBFhKb9Z6hf-TqaZGvAw3bJOAa6KOoEu6E'; // Demo VAPID key
        
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Push notifications are not supported');
            return;
        }

        await this.setupServiceWorker();
        this.setupEventListeners();
        this.loadNotificationPreferences();
        this.updateUI();
        
        // Check existing subscription
        await this.checkExistingSubscription();
    }

    async setupServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.ready;
            console.log('Service Worker ready for push notifications');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    setupEventListeners() {
        // Modal controls
        const enableNotificationsBtn = document.getElementById('enable-notifications');
        const skipNotificationsBtn = document.getElementById('skip-notifications');
        const notificationModal = document.getElementById('notification-modal');
        const modalOverlay = document.getElementById('modal-overlay');

        enableNotificationsBtn?.addEventListener('click', () => {
            this.requestNotificationPermission();
            this.hideNotificationModal();
        });

        skipNotificationsBtn?.addEventListener('click', () => {
            this.hideNotificationModal();
            this.setNotificationPreference('skipped');
        });

        modalOverlay?.addEventListener('click', () => {
            this.hideNotificationModal();
        });

        // Demo notification buttons (for testing)
        this.createDemoControls();
    }

    createDemoControls() {
        // Add demo notification controls to the page
        const demoControls = document.createElement('div');
        demoControls.id = 'demo-controls';
        demoControls.className = 'demo-controls';
        demoControls.innerHTML = `
            <details class="demo-section">
                <summary>🔔 Push Notification Demo</summary>
                <div class="demo-buttons">
                    <button class="btn btn-secondary demo-btn" data-type="welcome">
                        Welcome Notification
                    </button>
                    <button class="btn btn-secondary demo-btn" data-type="promotion">
                        Promotion Alert
                    </button>
                    <button class="btn btn-secondary demo-btn" data-type="cart-reminder">
                        Cart Reminder
                    </button>
                    <button class="btn btn-secondary demo-btn" data-type="order-update">
                        Order Update
                    </button>
                </div>
            </details>
        `;

        // Add to footer
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.appendChild(demoControls);
        }

        // Add event listeners for demo buttons
        demoControls.querySelectorAll('.demo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.sendDemoNotification(type);
            });
        });
    }

    async requestNotificationPermission() {
        if (!this.isSupported) {
            this.showToast('❌ Not Supported', 'Push notifications are not supported in this browser.', 'error');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                await this.subscribeToPush();
                this.setNotificationPreference('granted');
                this.updateUI();
                this.showWelcomeNotification();
                return true;
            } else {
                this.setNotificationPreference('denied');
                this.showToast('🔕 Permission Denied', 'Notifications have been blocked.', 'warning');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showToast('❌ Error', 'Failed to request notification permission.', 'error');
            return false;
        }
    }

    async subscribeToPush() {
        if (!this.registration) {
            console.error('Service Worker not available');
            return;
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            this.subscription = subscription;
            
            // In a real app, send subscription to server
            await this.sendSubscriptionToServer(subscription);
            
            console.log('Successfully subscribed to push notifications');
            this.showToast('✅ Notifications Enabled', 'You\'ll now receive notifications!', 'success');
            
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            this.showToast('❌ Subscription Failed', 'Could not subscribe to notifications.', 'error');
        }
    }

    async sendSubscriptionToServer(subscription) {
        // Simulate sending subscription to server
        console.log('Sending subscription to server:', subscription);
        
        // Store subscription locally for demo purposes
        localStorage.setItem('push-subscription', JSON.stringify(subscription));
        
        // In a real app, this would be:
        // await fetch('/api/push-subscriptions', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(subscription)
        // });
    }

    async checkExistingSubscription() {
        if (!this.registration) return;

        try {
            const subscription = await this.registration.pushManager.getSubscription();
            if (subscription) {
                this.subscription = subscription;
                console.log('Found existing push subscription');
            }
        } catch (error) {
            console.error('Error checking existing subscription:', error);
        }
    }

    showNotificationModal() {
        const modal = document.getElementById('notification-modal');
        const overlay = document.getElementById('modal-overlay');
        
        modal?.classList.remove('hidden');
        overlay?.classList.remove('hidden');
    }

    hideNotificationModal() {
        const modal = document.getElementById('notification-modal');
        const overlay = document.getElementById('modal-overlay');
        
        modal?.classList.add('hidden');
        overlay?.classList.add('hidden');
    }

    showWelcomeNotification() {
        this.sendLocalNotification('Welcome to ShopPWA! 🎉', {
            body: 'Thanks for enabling notifications. We\'ll keep you updated on deals and order status.',
            icon: '/icons/icon-192x192.png',
            tag: 'welcome',
            actions: [
                {
                    action: 'view-deals',
                    title: 'View Deals'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        });
    }

    sendLocalNotification(title, options = {}) {
        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                timestamp: Date.now(),
                url: '/'
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

        const finalOptions = { ...defaultOptions, ...options };
        
        // Create notification
        const notification = new Notification(title, finalOptions);
        
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            notification.close();
            
            // Navigate to specific URL if provided
            if (finalOptions.data?.url) {
                window.location.href = finalOptions.data.url;
            }
        };

        // Auto close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
    }

    sendDemoNotification(type) {
        if (Notification.permission !== 'granted') {
            this.showToast('🔔 Enable Notifications', 'Please enable notifications first to see the demo.', 'warning');
            return;
        }

        const notifications = {
            welcome: {
                title: '🎉 Welcome to ShopPWA!',
                options: {
                    body: 'Thanks for joining us! Check out our latest deals and products.',
                    tag: 'welcome',
                    data: { url: '/' }
                }
            },
            promotion: {
                title: '🎁 Special Offer - 50% Off!',
                options: {
                    body: 'Limited time offer on electronics. Don\'t miss out!',
                    tag: 'promotion',
                    requireInteraction: true,
                    data: { url: '/?category=electronics' }
                }
            },
            'cart-reminder': {
                title: '🛒 Don\'t forget your cart!',
                options: {
                    body: 'You have items waiting in your cart. Complete your purchase now!',
                    tag: 'cart-reminder',
                    data: { url: '/?shortcut=cart' }
                }
            },
            'order-update': {
                title: '📦 Order Update',
                options: {
                    body: 'Your order #12345 has been shipped and is on its way!',
                    tag: 'order-update',
                    data: { url: '/orders/12345' }
                }
            }
        };

        const notification = notifications[type];
        if (notification) {
            this.sendLocalNotification(notification.title, notification.options);
            this.showToast('📤 Demo Sent', 'Demo notification sent!', 'success');
        }
    }

    setNotificationPreference(preference) {
        localStorage.setItem('notification-preference', preference);
        
        // Don't show modal again if user has made a choice
        if (preference !== 'granted') {
            localStorage.setItem('notification-modal-shown', 'true');
        }
    }

    loadNotificationPreferences() {
        const preference = localStorage.getItem('notification-preference');
        const modalShown = localStorage.getItem('notification-modal-shown');
        
        // Show modal if user hasn't made a choice and notifications are supported
        if (!preference && !modalShown && this.isSupported && Notification.permission === 'default') {
            // Show modal after a delay
            setTimeout(() => {
                this.showNotificationModal();
            }, 3000);
        }
    }

    updateUI() {
        const notificationBtn = document.getElementById('notification-btn');
        const statusIndicator = document.getElementById('notification-status');
        
        if (statusIndicator) {
            let color = '#ef4444'; // Red for denied/default
            
            if (Notification.permission === 'granted') {
                color = '#10b981'; // Green for granted
            } else if (Notification.permission === 'default') {
                color = '#f59e0b'; // Yellow for default
            }
            
            statusIndicator.style.backgroundColor = color;
        }

        if (notificationBtn) {
            const permission = Notification.permission;
            let title = 'Enable Notifications';
            
            if (permission === 'granted') {
                title = 'Notifications Enabled';
            } else if (permission === 'denied') {
                title = 'Notifications Blocked';
            }
            
            notificationBtn.title = title;
        }
    }

    // Schedule notification (for demo purposes)
    scheduleNotification(title, options, delay) {
        setTimeout(() => {
            this.sendLocalNotification(title, options);
        }, delay);
    }

    // Send push notification via service worker (simulated)
    async sendPushNotification(payload) {
        if (!this.registration) {
            console.error('Service Worker not available');
            return;
        }

        // In a real app, this would be done by the server
        // For demo, we'll simulate a push event
        this.registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: payload.tag || 'push-notification',
            data: payload.data || {},
            actions: payload.actions || [
                { action: 'view', title: 'View' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        });
    }

    // Utility function to convert VAPID key
    urlBase64ToUint8Array(base64String) {
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

    // Show toast notification
    showToast(title, message, type = 'info') {
        if (window.shopPWA) {
            window.shopPWA.showToast(title, message, type);
        }
    }

    // Get notification statistics
    getNotificationStats() {
        return {
            permission: Notification.permission,
            isSupported: this.isSupported,
            hasSubscription: !!this.subscription,
            preference: localStorage.getItem('notification-preference')
        };
    }

    // Test notification with different types
    testNotificationTypes() {
        const types = ['welcome', 'promotion', 'cart-reminder', 'order-update'];
        
        types.forEach((type, index) => {
            setTimeout(() => {
                this.sendDemoNotification(type);
            }, index * 2000); // 2 second intervals
        });
    }

    // Unsubscribe from push notifications
    async unsubscribe() {
        if (this.subscription) {
            try {
                await this.subscription.unsubscribe();
                this.subscription = null;
                localStorage.removeItem('push-subscription');
                this.setNotificationPreference('unsubscribed');
                this.updateUI();
                this.showToast('🔕 Unsubscribed', 'You will no longer receive push notifications.', 'success');
            } catch (error) {
                console.error('Failed to unsubscribe:', error);
                this.showToast('❌ Error', 'Failed to unsubscribe from notifications.', 'error');
            }
        }
    }
}

// Initialize push notification manager
document.addEventListener('DOMContentLoaded', () => {
    window.pushNotificationManager = new PushNotificationManager();
});

// Add styles for demo controls
const notificationStyles = `
<style>
.demo-controls {
    margin-top: var(--spacing-8);
    padding: var(--spacing-6);
    background: var(--bg-secondary);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
}

.demo-section summary {
    cursor: pointer;
    font-weight: 600;
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    transition: background-color var(--transition-fast);
}

.demo-section summary:hover {
    background-color: var(--bg-tertiary);
}

.demo-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-3);
    margin-top: var(--spacing-4);
}

.demo-btn {
    font-size: var(--font-size-sm);
    padding: var(--spacing-2) var(--spacing-3);
}

@media (max-width: 768px) {
    .demo-buttons {
        grid-template-columns: 1fr;
    }
}

.notification-stats {
    display: flex;
    gap: var(--spacing-4);
    margin-top: var(--spacing-4);
    font-size: var(--font-size-sm);
}

.stat-item {
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
}

.stat-label {
    font-weight: 600;
    color: var(--text-secondary);
}

.stat-value {
    color: var(--text-primary);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);