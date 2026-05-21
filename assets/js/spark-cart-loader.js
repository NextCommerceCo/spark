/**
 * Spark Cart Loader
 *
 * Keeps the heavy cart drawer stack off the initial page until the shopper
 * asks for the drawer. Saved carts load only the cart client for badge
 * hydration. The cart page and PDP still keep normal form fallbacks.
 */

(function() {
    'use strict';

    var assets = window.SparkCartAssets || {};
    var scriptPromises = {};
    var drawerPromise = null;
    var pendingToggle = false;

    function readCookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function clearCookie(name) {
        document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    function getSavedCartId() {
        try {
            var id = sessionStorage.getItem('storefront_cart_id');
            if (id) return id;
        } catch (e) {}
        return readCookie('storefront_cart_id');
    }

    function loadScript(name, globalName) {
        if (globalName && window[globalName]) return Promise.resolve();
        if (scriptPromises[name]) return scriptPromises[name];

        scriptPromises[name] = new Promise(function(resolve, reject) {
            var src = assets[name];
            if (!src) {
                reject(new Error('Missing Spark cart asset: ' + name));
                return;
            }

            var script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = resolve;
            script.onerror = function() {
                reject(new Error('Unable to load Spark cart asset: ' + name));
            };
            document.head.appendChild(script);
        });

        return scriptPromises[name];
    }

    function loadCartClient() {
        return loadScript('cart', 'SparkCartClient');
    }

    function waitForDrawerUpgrade() {
        if (window.customElements && customElements.whenDefined) {
            return customElements.whenDefined('spark-cart-drawer').then(function() {
                return new Promise(function(resolve) {
                    requestAnimationFrame(resolve);
                });
            });
        }
        return new Promise(function(resolve) {
            setTimeout(resolve, 0);
        });
    }

    function ensureDrawer() {
        if (window.SparkSideCart) return Promise.resolve();
        if (drawerPromise) return drawerPromise;

        drawerPromise = loadCartClient()
            .then(function() { return loadScript('cartRewards', 'SparkCartRewards'); })
            .then(function() { return loadScript('cartRenderer', 'SparkCartDrawerRenderer'); })
            .then(function() { return loadScript('progressBar'); })
            .then(function() { return loadScript('upsellItem'); })
            .then(function() { return loadScript('cartDrawer'); })
            .then(waitForDrawerUpgrade)
            .catch(function(err) {
                drawerPromise = null;
                if (window.console && console.error) console.error('[spark-cart-loader]', err);
            });

        return drawerPromise;
    }

    function updateCartBadge(count) {
        var badge = document.getElementById('cart-badge');
        if (!badge) return;
        if (count && count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = '';
            badge.removeAttribute('data-animate');
            void badge.offsetWidth;
            badge.setAttribute('data-animate', '');
        } else {
            badge.style.display = 'none';
        }
    }

    function rememberCart(cart) {
        if (!cart) return;
        window.SparkCartInitialCart = cart;
        updateCartBadge(cart.numItems);

        var drawer = document.querySelector('spark-cart-drawer');
        if (drawer && !drawer._cart) {
            drawer._cart = cart;
            drawer._currencyCode = cart.currency || drawer._currencyCode;
            if (drawer._renderCart) drawer._renderCart();
        }
    }

    function hydrateBadgeFromSavedCart() {
        if (!getSavedCartId()) return;
        loadCartClient().then(function() {
            var client = new SparkCartClient();
            return client.getCart();
        }).then(function(cart) {
            rememberCart(cart);
        }).catch(function() {});
    }

    function openDrawer() {
        return ensureDrawer().then(function() {
            if (window.SparkSideCart) SparkSideCart.open();
        });
    }

    function toggleDrawer() {
        if (pendingToggle && !window.SparkSideCart) return drawerPromise || Promise.resolve();
        pendingToggle = true;
        return ensureDrawer().then(function() {
            pendingToggle = false;
            if (window.SparkSideCart) SparkSideCart.toggle();
        }).catch(function(err) {
            pendingToggle = false;
            throw err;
        });
    }

    function replayCartAdded(detail) {
        detail = detail || {};
        if (detail._sparkCartLoaderReplay) return;

        var replayDetail = {};
        Object.keys(detail).forEach(function(key) {
            replayDetail[key] = detail[key];
        });
        replayDetail._sparkCartLoaderReplay = true;

        document.dispatchEvent(new CustomEvent('spark:cart:added', {
            detail: replayDetail,
            bubbles: true
        }));
    }

    document.addEventListener('spark:cart:updated', function(e) {
        var detail = e.detail || {};
        rememberCart(detail.cart);
        updateCartBadge(detail.count);
    });

    document.addEventListener('spark:cart:added', function(e) {
        var detail = e.detail || {};
        rememberCart(detail.cart);
        updateCartBadge(detail.count);

        if (detail._sparkCartLoaderReplay) return;
        if (detail.openSideCart === false) return;
        if (window.SparkSideCart) return;

        ensureDrawer().then(function() {
            replayCartAdded(detail);
        });
    });

    document.addEventListener('spark:cart:toggle', function() {
        if (window.SparkSideCart) return;
        toggleDrawer();
    });

    if (readCookie('openSideCart') === '1') {
        clearCookie('openSideCart');
        setTimeout(openDrawer, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydrateBadgeFromSavedCart);
    } else {
        hydrateBadgeFromSavedCart();
    }

    window.SparkCartLoader = {
        ensureDrawer: ensureDrawer,
        loadCartClient: loadCartClient,
        open: openDrawer,
        toggle: toggleDrawer,
        updateCartBadge: updateCartBadge
    };
})();
