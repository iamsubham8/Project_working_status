// Main Application Class
class ShopEaseApp {
    constructor() {
        this.cart = [];
        this.products = [];
        this.isOnline = navigator.onLine;
        this.deferredPrompt = null;
        
        this.init();
    }
    
    async init() {
        // Register service worker
        await this.registerServiceWorker();
        
        // Initialize app components
        this.initializeUI();
        this.bindEvents();
        this.setupNetworkMonitoring();
        this.setupInstallPrompt();
        
        // Load initial data
        await this.loadInitialData();
        
        // Handle app shortcuts
        this.handleAppShortcuts();
        
        console.log('ShopEase App initialized successfully');
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                
                console.log('Service Worker registered successfully:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    console.log('New service worker available');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    initializeUI() {
        // Initialize connection status
        this.updateConnectionStatus();
        
        // Load cart from localStorage
        this.loadCartFromStorage();
        this.updateCartUI();
        
        // Set up loading states
        this.hideLoadingSpinner();
    }
    
    bindEvents() {
        // Navigation events
        document.getElementById('cartBtn').addEventListener('click', () => this.toggleCart());
        document.getElementById('closeCartBtn').addEventListener('click', () => this.toggleCart());
        
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        // Category filtering
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => this.filterByCategory(e.currentTarget.dataset.category));
        });
        
        // Cart actions
        document.getElementById('checkoutBtn').addEventListener('click', () => this.handleCheckout());
        document.getElementById('clearCartBtn').addEventListener('click', () => this.clearCart());
        
        // Install prompt events
        document.getElementById('installBtn').addEventListener('click', () => this.installApp());
        document.getElementById('dismissInstallBtn').addEventListener('click', () => this.dismissInstallPrompt());
        
        // Close modal on background click
        document.getElementById('cartModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.toggleCart();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }
    
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });
    }
    
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.hideInstallPrompt();
            this.deferredPrompt = null;
        });
    }
    
    async loadInitialData() {
        this.showLoadingSpinner();
        
        try {
            // Load products (simulated API call)
            this.products = await this.fetchProducts();
            this.renderProducts(this.products);
        } catch (error) {
            console.error('Error loading initial data:', error);
            // Load from cache or show offline message
            await this.loadOfflineData();
        } finally {
            this.hideLoadingSpinner();
        }
    }
    
    async fetchProducts() {
        // Simulate API call with sample data
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: 1,
                        name: 'Smartphone Pro Max',
                        description: 'Latest flagship smartphone with advanced features',
                        price: 999.99,
                        category: 'electronics',
                        image: '📱',
                        inStock: true
                    },
                    {
                        id: 2,
                        name: 'Wireless Headphones',
                        description: 'Premium noise-cancelling wireless headphones',
                        price: 299.99,
                        category: 'electronics',
                        image: '🎧',
                        inStock: true
                    },
                    {
                        id: 3,
                        name: 'Cotton T-Shirt',
                        description: 'Comfortable 100% cotton t-shirt in various colors',
                        price: 24.99,
                        category: 'clothing',
                        image: '👕',
                        inStock: true
                    },
                    {
                        id: 4,
                        name: 'Denim Jeans',
                        description: 'Classic fit denim jeans with premium quality',
                        price: 79.99,
                        category: 'clothing',
                        image: '👖',
                        inStock: true
                    },
                    {
                        id: 5,
                        name: 'JavaScript Guide',
                        description: 'Complete guide to modern JavaScript development',
                        price: 39.99,
                        category: 'books',
                        image: '📚',
                        inStock: true
                    },
                    {
                        id: 6,
                        name: 'Web Development Handbook',
                        description: 'Essential handbook for web developers',
                        price: 49.99,
                        category: 'books',
                        image: '📖',
                        inStock: true
                    },
                    {
                        id: 7,
                        name: 'Garden Tool Set',
                        description: 'Complete set of essential gardening tools',
                        price: 89.99,
                        category: 'home',
                        image: '🛠️',
                        inStock: true
                    },
                    {
                        id: 8,
                        name: 'Indoor Plant',
                        description: 'Beautiful low-maintenance indoor plant',
                        price: 29.99,
                        category: 'home',
                        image: '🪴',
                        inStock: true
                    }
                ]);
            }, 1000);
        });
    }
    
    renderProducts(products) {
        const grid = document.getElementById('productsGrid');
        
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <p>No products found. Try adjusting your search or check your connection.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = products.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">${product.image}</div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <div class="product-actions">
                        <button class="btn-add-cart" onclick="app.addToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    handleSearch() {
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        
        if (!query) {
            this.renderProducts(this.products);
            return;
        }
        
        const filteredProducts = this.products.filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
        );
        
        this.renderProducts(filteredProducts);
    }
    
    filterByCategory(category) {
        const filteredProducts = this.products.filter(product => product.category === category);
        this.renderProducts(filteredProducts);
        
        // Update active category visual feedback
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
    }
    
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        
        if (!product || !product.inStock) {
            this.showNotification('Product not available', 'error');
            return;
        }
        
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }
        
        this.saveCartToStorage();
        this.updateCartUI();
        this.showNotification(`${product.name} added to cart!`, 'success');
        
        // Sync with server if online, otherwise queue for sync
        if (this.isOnline) {
            this.syncCartToServer();
        } else {
            this.queueCartUpdate();
        }
    }
    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCartToStorage();
        this.updateCartUI();
        this.showNotification('Item removed from cart', 'info');
    }
    
    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        
        if (item) {
            item.quantity += change;
            
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.saveCartToStorage();
                this.updateCartUI();
            }
        }
    }
    
    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        // Update cart count
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        // Update cart modal
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            cartTotal.textContent = '0.00';
            return;
        }
        
        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">${item.image}</div>
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, 1)">+</button>
                </div>
                <button class="btn-close" onclick="app.removeFromCart(${item.id})" aria-label="Remove item">&times;</button>
            </div>
        `).join('');
        
        // Update total
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = total.toFixed(2);
    }
    
    toggleCart() {
        const modal = document.getElementById('cartModal');
        modal.classList.toggle('hidden');
        
        if (!modal.classList.contains('hidden')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    clearCart() {
        if (confirm('Are you sure you want to clear your cart?')) {
            this.cart = [];
            this.saveCartToStorage();
            this.updateCartUI();
            this.showNotification('Cart cleared', 'info');
        }
    }
    
    async handleCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty', 'warning');
            return;
        }
        
        try {
            // Simulate checkout process
            this.showNotification('Processing checkout...', 'info');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Clear cart after successful checkout
            this.cart = [];
            this.saveCartToStorage();
            this.updateCartUI();
            this.toggleCart();
            
            this.showNotification('Order placed successfully! 🎉', 'success');
            
        } catch (error) {
            console.error('Checkout error:', error);
            this.showNotification('Checkout failed. Please try again.', 'error');
        }
    }
    
    saveCartToStorage() {
        localStorage.setItem('shopease-cart', JSON.stringify(this.cart));
    }
    
    loadCartFromStorage() {
        const stored = localStorage.getItem('shopease-cart');
        if (stored) {
            this.cart = JSON.parse(stored);
        }
    }
    
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        if (this.isOnline) {
            statusElement.classList.add('hidden');
        } else {
            statusElement.classList.remove('hidden');
            statusElement.classList.add('offline');
            statusText.textContent = "You're offline. Some features may be limited.";
        }
    }
    
    async syncOfflineData() {
        // Sync cart data when coming back online
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('cart-sync');
                console.log('Background sync registered');
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }
    }
    
    async queueCartUpdate() {
        // Store cart update for background sync
        const updates = JSON.parse(localStorage.getItem('pendingCartUpdates') || '[]');
        updates.push({
            cart: this.cart,
            timestamp: Date.now()
        });
        localStorage.setItem('pendingCartUpdates', JSON.stringify(updates));
    }
    
    async syncCartToServer() {
        // Simulate server sync
        try {
            // This would normally send cart data to your backend
            console.log('Cart synced to server:', this.cart);
        } catch (error) {
            console.error('Cart sync failed:', error);
        }
    }
    
    async loadOfflineData() {
        // Load cached products if available
        const cached = localStorage.getItem('shopease-products');
        if (cached) {
            this.products = JSON.parse(cached);
            this.renderProducts(this.products);
        }
    }
    
    showInstallPrompt() {
        const prompt = document.getElementById('installPrompt');
        prompt.classList.remove('hidden');
    }
    
    hideInstallPrompt() {
        const prompt = document.getElementById('installPrompt');
        prompt.classList.add('hidden');
    }
    
    dismissInstallPrompt() {
        this.hideInstallPrompt();
        localStorage.setItem('installPromptDismissed', 'true');
    }
    
    async installApp() {
        if (!this.deferredPrompt) return;
        
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        console.log('Install prompt outcome:', outcome);
        this.deferredPrompt = null;
        this.hideInstallPrompt();
    }
    
    showUpdateNotification() {
        this.showNotification('A new version is available! Refresh to update.', 'info', 5000);
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '3000',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease',
            backgroundColor: this.getNotificationColor(type)
        });
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    getNotificationColor(type) {
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        return colors[type] || colors.info;
    }
    
    handleAppShortcuts() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        
        switch (action) {
            case 'cart':
                this.toggleCart();
                break;
            case 'search':
                document.getElementById('searchInput').focus();
                break;
        }
    }
    
    handleKeyboardNavigation(e) {
        // Escape key to close modals
        if (e.key === 'Escape') {
            const cartModal = document.getElementById('cartModal');
            if (!cartModal.classList.contains('hidden')) {
                this.toggleCart();
            }
        }
        
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    }
    
    showLoadingSpinner() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    }
    
    hideLoadingSpinner() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    }
}

// CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ShopEaseApp();
});

// Make app globally available for onclick handlers
window.app = app;