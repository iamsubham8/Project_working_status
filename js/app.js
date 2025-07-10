// Main Application JavaScript
class ShopPWA {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    async init() {
        // Initialize app components
        this.setupEventListeners();
        this.setupOfflineDetection();
        this.setupPWAInstallation();
        this.setupIntersectionObserver();
        
        // Load initial data
        await this.loadProducts();
        this.renderProducts();
        
        // Handle URL shortcuts
        this.handleShortcuts();
        
        // Check for service worker updates
        this.checkForUpdates();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        searchInput?.addEventListener('input', this.debounce((e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterProducts();
        }, 300));
        
        searchBtn?.addEventListener('click', () => {
            this.filterProducts();
        });

        // Category filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.currentFilter = e.target.dataset.filter;
                this.filterProducts();
            });
        });

        // Category cards
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.setFilterByCategory(category);
            });
        });

        // Install banner
        const installBtn = document.getElementById('install-btn');
        const dismissBtn = document.getElementById('dismiss-btn');
        
        installBtn?.addEventListener('click', () => this.installPWA());
        dismissBtn?.addEventListener('click', () => this.dismissInstallBanner());

        // Notification button
        const notificationBtn = document.getElementById('notification-btn');
        notificationBtn?.addEventListener('click', () => {
            this.requestNotificationPermission();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k': // Ctrl/Cmd + K for search
                        e.preventDefault();
                        searchInput?.focus();
                        break;
                    case 'm': // Ctrl/Cmd + M for cart
                        e.preventDefault();
                        this.toggleCart();
                        break;
                }
            }
        });
    }

    setupOfflineDetection() {
        const offlineIndicator = document.getElementById('offline-indicator');
        
        window.addEventListener('online', () => {
            this.isOnline = true;
            offlineIndicator?.classList.add('hidden');
            this.showToast('✅ Back online!', 'You\'re connected to the internet.', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            offlineIndicator?.classList.remove('hidden');
            this.showToast('📵 You\'re offline', 'Don\'t worry, you can still browse products!', 'warning');
        });

        // Initial state
        if (!this.isOnline) {
            offlineIndicator?.classList.remove('hidden');
        }
    }

    setupPWAInstallation() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });

        // Listen for app installation
        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.hideInstallBanner();
            this.showToast('🎉 App Installed!', 'ShopPWA is now available on your home screen.', 'success');
        });
    }

    setupIntersectionObserver() {
        // Lazy loading for product images and animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    if (entry.target.dataset.src) {
                        entry.target.src = entry.target.dataset.src;
                        entry.target.removeAttribute('data-src');
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        // Observe product cards when they're rendered
        this.observer = observer;
    }

    async loadProducts() {
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator?.classList.remove('hidden');

        try {
            // Try to load from network first
            if (this.isOnline) {
                const response = await fetch('/data/products.json');
                if (response.ok) {
                    this.products = await response.json();
                    // Cache products in localStorage for offline use
                    localStorage.setItem('cached-products', JSON.stringify(this.products));
                } else {
                    throw new Error('Network response was not ok');
                }
            } else {
                throw new Error('Offline mode');
            }
        } catch (error) {
            console.log('Loading from cache due to:', error.message);
            // Fallback to cached data
            const cachedProducts = localStorage.getItem('cached-products');
            if (cachedProducts) {
                this.products = JSON.parse(cachedProducts);
            } else {
                // Ultimate fallback - demo products
                this.products = this.getDemoProducts();
            }
        }

        this.filteredProducts = [...this.products];
        loadingIndicator?.classList.add('hidden');
    }

    getDemoProducts() {
        return [
            {
                id: 1,
                title: "Wireless Headphones",
                description: "High-quality wireless headphones with noise cancellation",
                price: 99.99,
                category: "electronics",
                image: "🎧",
                featured: true
            },
            {
                id: 2,
                title: "Smart Watch",
                description: "Feature-rich smartwatch with health monitoring",
                price: 199.99,
                category: "electronics",
                image: "⌚",
                featured: true
            },
            {
                id: 3,
                title: "Cotton T-Shirt",
                description: "Comfortable cotton t-shirt in various colors",
                price: 19.99,
                category: "clothing",
                image: "👕",
                featured: false
            },
            {
                id: 4,
                title: "JavaScript Guide",
                description: "Comprehensive guide to modern JavaScript",
                price: 29.99,
                category: "books",
                image: "📚",
                featured: true
            },
            {
                id: 5,
                title: "Indoor Plant",
                description: "Beautiful indoor plant for home decoration",
                price: 24.99,
                category: "home",
                image: "🪴",
                featured: false
            },
            {
                id: 6,
                title: "Bluetooth Speaker",
                description: "Portable Bluetooth speaker with excellent sound",
                price: 79.99,
                category: "electronics",
                image: "🔊",
                featured: true
            }
        ];
    }

    filterProducts() {
        this.filteredProducts = this.products.filter(product => {
            const matchesCategory = this.currentFilter === 'all' || product.category === this.currentFilter;
            const matchesSearch = this.searchTerm === '' || 
                product.title.toLowerCase().includes(this.searchTerm) ||
                product.description.toLowerCase().includes(this.searchTerm) ||
                product.category.toLowerCase().includes(this.searchTerm);
            
            return matchesCategory && matchesSearch;
        });

        this.renderProducts();
    }

    renderProducts() {
        const productsGrid = document.getElementById('products-grid');
        if (!productsGrid) return;

        productsGrid.innerHTML = '';

        if (this.filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <div class="no-products-icon">🔍</div>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        this.filteredProducts.forEach(product => {
            const productCard = this.createProductCard(product);
            productsGrid.appendChild(productCard);
        });

        // Apply intersection observer to new cards
        const productCards = productsGrid.querySelectorAll('.product-card');
        productCards.forEach(card => {
            this.observer?.observe(card);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                ${product.image}
            </div>
            <div class="product-info">
                <h4 class="product-title">${product.title}</h4>
                <p class="product-description">${product.description}</p>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-actions">
                    <button class="add-to-cart" data-product-id="${product.id}">
                        Add to Cart
                    </button>
                    <button class="wishlist-btn" data-product-id="${product.id}" title="Add to Wishlist">
                        ❤️
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const addToCartBtn = card.querySelector('.add-to-cart');
        const wishlistBtn = card.querySelector('.wishlist-btn');

        addToCartBtn.addEventListener('click', () => {
            this.addToCart(product);
        });

        wishlistBtn.addEventListener('click', () => {
            this.toggleWishlist(product);
        });

        return card;
    }

    addToCart(product) {
        // This will be handled by cart.js
        if (window.cartManager) {
            window.cartManager.addItem(product);
            this.showToast('🛒 Added to Cart', `${product.title} has been added to your cart.`, 'success');
            
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }
    }

    toggleWishlist(product) {
        const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const isInWishlist = wishlist.some(item => item.id === product.id);
        
        if (isInWishlist) {
            const updatedWishlist = wishlist.filter(item => item.id !== product.id);
            localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
            this.showToast('💔 Removed from Wishlist', `${product.title} has been removed from your wishlist.`, 'warning');
        } else {
            wishlist.push(product);
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            this.showToast('❤️ Added to Wishlist', `${product.title} has been added to your wishlist.`, 'success');
        }
    }

    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    setFilterByCategory(category) {
        this.currentFilter = category;
        const filterBtn = document.querySelector(`[data-filter="${category}"]`);
        if (filterBtn) {
            this.setActiveFilter(filterBtn);
        }
        this.filterProducts();
    }

    showInstallBanner() {
        const installBanner = document.getElementById('install-banner');
        installBanner?.classList.remove('hidden');
    }

    hideInstallBanner() {
        const installBanner = document.getElementById('install-banner');
        installBanner?.classList.add('hidden');
    }

    async installPWA() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        this.deferredPrompt = null;
        this.hideInstallBanner();
    }

    dismissInstallBanner() {
        this.hideInstallBanner();
        // Remember user's choice
        localStorage.setItem('install-banner-dismissed', 'true');
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('❌ Not Supported', 'Notifications are not supported in this browser.', 'error');
            return;
        }

        if (Notification.permission === 'granted') {
            this.showToast('✅ Already Enabled', 'Notifications are already enabled.', 'success');
            return;
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            this.showToast('🔔 Notifications Enabled', 'You\'ll now receive notifications about deals and updates.', 'success');
            this.updateNotificationStatus();
            
            // Send a welcome notification
            new Notification('Welcome to ShopPWA!', {
                body: 'Thanks for enabling notifications. We\'ll keep you updated on the latest deals.',
                icon: '/icons/icon-192x192.png',
                tag: 'welcome'
            });
        } else {
            this.showToast('🔕 Notifications Blocked', 'Notifications have been blocked. You can enable them in your browser settings.', 'warning');
        }
    }

    updateNotificationStatus() {
        const statusIndicator = document.getElementById('notification-status');
        if (statusIndicator) {
            statusIndicator.style.backgroundColor = 
                Notification.permission === 'granted' ? '#10b981' : '#ef4444';
        }
    }

    toggleCart() {
        if (window.cartManager) {
            window.cartManager.toggleCart();
        }
    }

    handleShortcuts() {
        const urlParams = new URLSearchParams(window.location.search);
        const shortcut = urlParams.get('shortcut');
        
        switch(shortcut) {
            case 'cart':
                this.toggleCart();
                break;
            case 'search':
                document.getElementById('search-input')?.focus();
                break;
        }
    }

    async syncOfflineData() {
        // Sync any pending operations when back online
        const pendingOperations = JSON.parse(localStorage.getItem('pending-operations') || '[]');
        
        if (pendingOperations.length > 0) {
            this.showToast('🔄 Syncing Data', 'Syncing your offline changes...', 'warning');
            
            for (const operation of pendingOperations) {
                try {
                    await this.performOperation(operation);
                } catch (error) {
                    console.error('Failed to sync operation:', operation, error);
                }
            }
            
            localStorage.removeItem('pending-operations');
            this.showToast('✅ Sync Complete', 'All your changes have been synced.', 'success');
        }
    }

    async performOperation(operation) {
        // Placeholder for syncing operations
        console.log('Syncing operation:', operation);
    }

    checkForUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                this.showToast('🔄 App Updated', 'The app has been updated. Refresh to see the latest version.', 'success');
            });
        }
    }

    showToast(title, message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${this.getToastIcon(type)}</div>
                <div class="toast-message">
                    <div class="toast-title">${title}</div>
                    <div class="toast-description">${message}</div>
                </div>
            </div>
            <button class="toast-close">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.shopPWA = new ShopPWA();
});

// Add CSS for animations and no-products state
const additionalStyles = `
<style>
.product-card {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
}

.product-card.animate-in {
    opacity: 1;
    transform: translateY(0);
}

.no-products {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--spacing-12);
    color: var(--text-secondary);
}

.no-products-icon {
    font-size: var(--font-size-4xl);
    margin-bottom: var(--spacing-4);
}

.no-products h3 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--spacing-2);
    color: var(--text-primary);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);