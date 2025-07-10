// Shopping Cart Manager
class CartManager {
    constructor() {
        this.items = [];
        this.isOpen = false;
        this.storageKey = 'shop-pwa-cart';
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.updateCartDisplay();
        this.setupOfflineSupport();
    }

    setupEventListeners() {
        // Cart toggle button
        const cartBtn = document.getElementById('cart-btn');
        const closeCartBtn = document.getElementById('close-cart');
        const cartOverlay = document.getElementById('cart-overlay');
        const checkoutBtn = document.getElementById('checkout-btn');

        cartBtn?.addEventListener('click', () => this.toggleCart());
        closeCartBtn?.addEventListener('click', () => this.closeCart());
        cartOverlay?.addEventListener('click', () => this.closeCart());
        checkoutBtn?.addEventListener('click', () => this.proceedToCheckout());

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeCart();
            }
        });

        // Handle background sync registration
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            this.setupBackgroundSync();
        }
    }

    setupOfflineSupport() {
        // Listen for online/offline events
        window.addEventListener('offline', () => {
            this.showOfflineMessage();
        });

        window.addEventListener('online', () => {
            this.syncPendingOperations();
        });
    }

    setupBackgroundSync() {
        navigator.serviceWorker.ready.then(registration => {
            this.registration = registration;
        });
    }

    loadFromStorage() {
        try {
            const savedCart = localStorage.getItem(this.storageKey);
            if (savedCart) {
                this.items = JSON.parse(savedCart);
            }
        } catch (error) {
            console.error('Error loading cart from storage:', error);
            this.items = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        } catch (error) {
            console.error('Error saving cart to storage:', error);
        }
    }

    addItem(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                ...product,
                quantity: quantity,
                addedAt: new Date().toISOString()
            });
        }

        this.saveToStorage();
        this.updateCartDisplay();
        this.animateCartButton();
        
        // Track operation for offline sync
        this.trackOperation('add', { productId: product.id, quantity });
        
        // Trigger analytics event
        this.trackAnalytics('add_to_cart', {
            item_id: product.id,
            item_name: product.title,
            price: product.price,
            quantity: quantity
        });
    }

    removeItem(productId) {
        const itemIndex = this.items.findIndex(item => item.id === productId);
        
        if (itemIndex > -1) {
            const removedItem = this.items[itemIndex];
            this.items.splice(itemIndex, 1);
            this.saveToStorage();
            this.updateCartDisplay();
            
            // Track operation for offline sync
            this.trackOperation('remove', { productId });
            
            // Show toast notification
            if (window.shopPWA) {
                window.shopPWA.showToast('🗑️ Item Removed', `${removedItem.title} has been removed from your cart.`, 'warning');
            }
        }
    }

    updateQuantity(productId, newQuantity) {
        const item = this.items.find(item => item.id === productId);
        
        if (item) {
            if (newQuantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = newQuantity;
                this.saveToStorage();
                this.updateCartDisplay();
                
                // Track operation for offline sync
                this.trackOperation('update', { productId, quantity: newQuantity });
            }
        }
    }

    clearCart() {
        this.items = [];
        this.saveToStorage();
        this.updateCartDisplay();
        
        // Track operation for offline sync
        this.trackOperation('clear', {});
        
        if (window.shopPWA) {
            window.shopPWA.showToast('🧹 Cart Cleared', 'All items have been removed from your cart.', 'success');
        }
    }

    toggleCart() {
        if (this.isOpen) {
            this.closeCart();
        } else {
            this.openCart();
        }
    }

    openCart() {
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartOverlay = document.getElementById('cart-overlay');
        
        cartSidebar?.classList.add('open');
        cartOverlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        this.isOpen = true;
        
        // Focus management for accessibility
        const closeBtn = document.getElementById('close-cart');
        closeBtn?.focus();
    }

    closeCart() {
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartOverlay = document.getElementById('cart-overlay');
        
        cartSidebar?.classList.remove('open');
        cartOverlay?.classList.remove('open');
        document.body.style.overflow = '';
        
        this.isOpen = false;
    }

    updateCartDisplay() {
        this.updateCartCount();
        this.updateCartItems();
        this.updateCartTotal();
    }

    updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    updateCartItems() {
        const cartItemsContainer = document.getElementById('cart-items');
        if (!cartItemsContainer) return;

        if (this.items.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <h4>Your cart is empty</h4>
                    <p>Add some amazing products to get started!</p>
                    <button class="btn btn-primary" onclick="cartManager.closeCart()">
                        Continue Shopping
                    </button>
                </div>
            `;
            return;
        }

        cartItemsContainer.innerHTML = this.items.map(item => this.createCartItemHTML(item)).join('');
        
        // Add event listeners to cart items
        this.attachCartItemListeners();
    }

    createCartItemHTML(item) {
        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-image">
                    ${item.image}
                </div>
                <div class="cart-item-info">
                    <h5 class="cart-item-title">${item.title}</h5>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease" data-product-id="${item.id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn increase" data-product-id="${item.id}">+</button>
                    </div>
                </div>
                <button class="remove-item" data-product-id="${item.id}" title="Remove item">
                    🗑️
                </button>
            </div>
        `;
    }

    attachCartItemListeners() {
        // Quantity controls
        document.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                const isIncrease = e.target.classList.contains('increase');
                const currentItem = this.items.find(item => item.id === productId);
                
                if (currentItem) {
                    const newQuantity = isIncrease ? 
                        currentItem.quantity + 1 : 
                        currentItem.quantity - 1;
                    this.updateQuantity(productId, newQuantity);
                }
            });
        });

        // Remove buttons
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                this.removeItem(productId);
            });
        });
    }

    updateCartTotal() {
        const cartTotalElement = document.getElementById('cart-total');
        const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (cartTotalElement) {
            cartTotalElement.textContent = `$${total.toFixed(2)}`;
        }

        // Update checkout button state
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = this.items.length === 0;
            checkoutBtn.textContent = this.items.length === 0 ? 
                'Cart is Empty' : 
                `Checkout ($${total.toFixed(2)})`;
        }
    }

    animateCartButton() {
        const cartBtn = document.getElementById('cart-btn');
        if (cartBtn) {
            cartBtn.style.transform = 'scale(1.1)';
            setTimeout(() => {
                cartBtn.style.transform = 'scale(1)';
            }, 200);
        }
    }

    async proceedToCheckout() {
        if (this.items.length === 0) return;

        const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create order object
        const order = {
            id: Date.now(),
            items: [...this.items],
            total: total,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        // Show loading state
        const checkoutBtn = document.getElementById('checkout-btn');
        const originalText = checkoutBtn.textContent;
        checkoutBtn.textContent = 'Processing...';
        checkoutBtn.disabled = true;

        try {
            // Simulate checkout process
            await this.processCheckout(order);
            
            // Success - clear cart and show confirmation
            this.clearCart();
            this.closeCart();
            this.showCheckoutSuccess(order);
            
        } catch (error) {
            console.error('Checkout failed:', error);
            this.showCheckoutError();
        } finally {
            // Reset button state
            checkoutBtn.textContent = originalText;
            checkoutBtn.disabled = false;
        }
    }

    async processCheckout(order) {
        // In a real app, this would send the order to a server
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (navigator.onLine) {
                    // Save order to localStorage for demo
                    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                    orders.push(order);
                    localStorage.setItem('orders', JSON.stringify(orders));
                    resolve(order);
                } else {
                    // Queue order for offline processing
                    this.queueOfflineOrder(order);
                    resolve(order);
                }
            }, 2000);
        });
    }

    queueOfflineOrder(order) {
        const offlineOrders = JSON.parse(localStorage.getItem('offline-orders') || '[]');
        offlineOrders.push(order);
        localStorage.setItem('offline-orders', JSON.stringify(offlineOrders));
        
        // Register background sync if available
        if (this.registration && 'sync' in this.registration) {
            this.registration.sync.register('order-sync');
        }
    }

    showCheckoutSuccess(order) {
        if (window.shopPWA) {
            window.shopPWA.showToast(
                '🎉 Order Placed!', 
                `Your order #${order.id} has been placed successfully.`,
                'success'
            );
        }

        // Show order confirmation modal
        this.showOrderConfirmation(order);
        
        // Track analytics
        this.trackAnalytics('purchase', {
            transaction_id: order.id,
            value: order.total,
            currency: 'USD',
            items: order.items.map(item => ({
                item_id: item.id,
                item_name: item.title,
                price: item.price,
                quantity: item.quantity
            }))
        });
    }

    showCheckoutError() {
        if (window.shopPWA) {
            window.shopPWA.showToast(
                '❌ Checkout Failed', 
                'There was an error processing your order. Please try again.',
                'error'
            );
        }
    }

    showOrderConfirmation(order) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🎉 Order Confirmed!</h3>
                <p>Thank you for your purchase!</p>
                <div class="order-details">
                    <p><strong>Order ID:</strong> #${order.id}</p>
                    <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                    <p><strong>Items:</strong> ${order.items.length}</p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        Continue Shopping
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    showOfflineMessage() {
        if (window.shopPWA) {
            window.shopPWA.showToast(
                '📵 Offline Mode', 
                'Your cart is saved locally. Orders will be processed when you\'re back online.',
                'warning'
            );
        }
    }

    async syncPendingOperations() {
        // Sync offline orders
        const offlineOrders = JSON.parse(localStorage.getItem('offline-orders') || '[]');
        
        if (offlineOrders.length > 0) {
            try {
                for (const order of offlineOrders) {
                    await this.processCheckout(order);
                }
                
                localStorage.removeItem('offline-orders');
                
                if (window.shopPWA) {
                    window.shopPWA.showToast(
                        '✅ Orders Synced', 
                        `${offlineOrders.length} offline orders have been processed.`,
                        'success'
                    );
                }
            } catch (error) {
                console.error('Failed to sync offline orders:', error);
            }
        }
    }

    trackOperation(type, data) {
        if (!navigator.onLine) {
            const pendingOps = JSON.parse(localStorage.getItem('pending-cart-operations') || '[]');
            pendingOps.push({
                id: Date.now(),
                type: type,
                data: data,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('pending-cart-operations', JSON.stringify(pendingOps));
        }
    }

    trackAnalytics(event, data) {
        // Placeholder for analytics tracking
        console.log('Analytics Event:', event, data);
        
        // In a real app, this would send to analytics service
        if (window.gtag) {
            window.gtag('event', event, data);
        }
    }

    // Get cart summary for external use
    getCartSummary() {
        const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
        
        return {
            items: this.items,
            total: total,
            itemCount: itemCount,
            isEmpty: this.items.length === 0
        };
    }

    // Export cart data
    exportCart() {
        const cartData = {
            items: this.items,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(cartData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'shoppwa-cart-export.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // Import cart data
    importCart(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const cartData = JSON.parse(e.target.result);
                if (cartData.items && Array.isArray(cartData.items)) {
                    this.items = cartData.items;
                    this.saveToStorage();
                    this.updateCartDisplay();
                    
                    if (window.shopPWA) {
                        window.shopPWA.showToast(
                            '📥 Cart Imported', 
                            `${cartData.items.length} items have been imported.`,
                            'success'
                        );
                    }
                }
            } catch (error) {
                console.error('Failed to import cart:', error);
                if (window.shopPWA) {
                    window.shopPWA.showToast(
                        '❌ Import Failed', 
                        'The cart file is invalid or corrupted.',
                        'error'
                    );
                }
            }
        };
        reader.readAsText(file);
    }
}

// Initialize cart manager
document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
});

// Add styles for cart components
const cartStyles = `
<style>
.empty-cart {
    text-align: center;
    padding: var(--spacing-8);
    color: var(--text-secondary);
}

.empty-cart-icon {
    font-size: var(--font-size-4xl);
    margin-bottom: var(--spacing-4);
    opacity: 0.5;
}

.empty-cart h4 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-2);
    color: var(--text-primary);
}

.empty-cart p {
    margin-bottom: var(--spacing-6);
}

.remove-item {
    position: absolute;
    top: var(--spacing-2);
    right: var(--spacing-2);
    background: none;
    border: none;
    font-size: var(--font-size-lg);
    cursor: pointer;
    opacity: 0.6;
    transition: opacity var(--transition-fast);
    padding: var(--spacing-1);
}

.remove-item:hover {
    opacity: 1;
}

.cart-item {
    position: relative;
}

.order-details {
    background: var(--bg-secondary);
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    margin: var(--spacing-4) 0;
}

.order-details p {
    margin-bottom: var(--spacing-2);
}

.order-details p:last-child {
    margin-bottom: 0;
}

@media (max-width: 480px) {
    .cart-item {
        flex-direction: column;
        text-align: center;
    }
    
    .cart-item-image {
        margin: 0 auto var(--spacing-3);
    }
    
    .remove-item {
        position: static;
        margin-top: var(--spacing-3);
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', cartStyles);