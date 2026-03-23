/**
 * Spark Theme - Cart Drawer Web Component
 *
 * Custom side cart replacing platform's side_cart.js.
 * Uses SparkCartClient for all GraphQL operations.
 * Shadow DOM for encapsulation, Tailwind in light DOM shell.
 *
 * Events listened:
 *   spark:cart:added   - Opens drawer + updates with cart data
 *   spark:cart:toggle  - Toggles drawer open/close
 *   spark:cart:updated - Re-renders cart UI
 *
 * Events dispatched:
 *   spark:cart:updated - After quantity/remove/voucher mutations
 */

(function() {
    'use strict';

    /* --- HTML escaping (XSS prevention) --- */

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* --- Cart Item Sub-component (rendered inside drawer shadow DOM) --- */

    function createCartItemEl(line, currency, doc) {
        var item = doc.createElement('div');
        item.className = 'spark-drawer-item';
        item.setAttribute('data-line-id', line.pk);

        var product = line.product || {};
        var image = product.primaryImage ? product.primaryImage.thumbnail : '';
        var title = product.title || '';
        var url = product.url || '#';
        var attrs = line.attributes || [];
        var variant = attrs.map(function(a) { return a.option + ': ' + a.value; }).join(', ');
        var price = SparkCartClient.formatMoney(line.linePriceExclTaxInclDiscounts || line.linePriceExclTax || 0, currency);
        var unitPrice = Number(line.unitPriceExclTax || 0);
        var retailInfo = product.purchaseInfo ? product.purchaseInfo.priceRetail : null;
        var retailValue = retailInfo ? Number(retailInfo.value || 0) : 0;
        var hasComparePrice = retailValue > 0 && retailValue > unitPrice;
        var isFreeGift = line.isUpsell;
        var subInfo = product.subscriptionInfo;
        var maxQty = SparkCartClient.MAX_QTY_PER_LINE || 15;

        var safeTitle = escapeHtml(title);
        var safeVariant = escapeHtml(variant);
        var safeUrl = escapeHtml(url);

        var html = '<div class="spark-drawer-item-image">' +
            (image ? '<img src="' + escapeHtml(image) + '" alt="' + safeTitle + '" width="80" height="80" loading="lazy" />' : '') +
            '</div>' +
            '<div class="spark-drawer-item-details">' +
            '<a href="' + safeUrl + '" class="spark-drawer-item-title">' + safeTitle + '</a>' +
            (safeVariant ? '<div class="spark-drawer-item-variant">' + safeVariant + '</div>' : '') +
            (subInfo && subInfo.interval ? '<div class="spark-drawer-item-sub">Every ' + subInfo.intervalCount + ' ' + subInfo.interval.toLowerCase() + (subInfo.intervalCount > 1 ? 's' : '') + '</div>' : '') +
            '<div class="spark-drawer-item-bottom">';

        if (isFreeGift) {
            html += '<span class="spark-drawer-item-free">FREE</span>';
        } else {
            html += '<div class="spark-drawer-item-qty">' +
                '<button class="spark-drawer-qty-btn" data-action="decrease" aria-label="Decrease quantity"' +
                (line.quantity <= 1 ? ' disabled' : '') +
                '>&minus;</button>' +
                '<span class="spark-drawer-qty-val" aria-label="Quantity">' + line.quantity + '</span>' +
                '<button class="spark-drawer-qty-btn" data-action="increase" aria-label="Increase quantity"' +
                (line.quantity >= maxQty ? ' disabled' : '') +
                '>+</button>' +
                '</div>';
        }

        html += '<div class="spark-drawer-item-price">' +
            (hasComparePrice ? '<span class="spark-drawer-item-compare">' + SparkCartClient.formatMoney(retailValue * line.quantity, currency) + '</span> ' : '') +
            '<span' + (isFreeGift ? ' class="spark-drawer-item-free"' : '') + '>' + (isFreeGift ? 'FREE' : price) + '</span>' +
            '</div>' +
            '</div>';

        if (!isFreeGift) {
            html += '<button class="spark-drawer-item-remove" data-action="remove" aria-label="Remove ' + safeTitle + '">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>';
        }

        html += '</div>';
        item.innerHTML = html;
        return item;
    }

    /* --- Drawer styles (injected into Shadow DOM) --- */

    var DRAWER_STYLES = [
        ':host { display: block; }',
        ':host([data-open="false"]) .spark-drawer-backdrop { opacity: 0; pointer-events: none; }',
        ':host([data-open="false"]) .spark-drawer-panel { transform: translateX(100%); }',
        ':host([data-open="true"]) .spark-drawer-backdrop { opacity: 1; }',
        ':host([data-open="true"]) .spark-drawer-panel { transform: translateX(0); }',

        '.spark-drawer-backdrop {' +
        '  position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,0.3);' +
        '  transition: opacity 200ms ease-out; cursor: pointer;' +
        '}',

        '.spark-drawer-panel {' +
        '  position: fixed; top: 0; right: 0; bottom: 0; z-index: 71;' +
        '  width: 100%; max-width: 400px; background: #fff;' +
        '  display: flex; flex-direction: column;' +
        '  transition: transform 250ms ease-out;' +
        '  transform: translateX(100%);' +
        '  font-family: var(--font-body, system-ui, -apple-system, sans-serif);' +
        '  color: #1E293B;' +
        '}',

        '@media (max-width: 767px) { .spark-drawer-panel { max-width: 100%; } }',

        /* Header */
        '.spark-drawer-header {' +
        '  display: flex; align-items: center; justify-content: space-between;' +
        '  padding: 16px 20px; border-bottom: 1px solid #E2E8F0;' +
        '  flex-shrink: 0;' +
        '}',
        '.spark-drawer-header-title {' +
        '  font-size: 18px; font-weight: 600; margin: 0;' +
        '  font-family: var(--font-header, var(--font-body, system-ui, -apple-system, sans-serif));' +
        '}',
        '.spark-drawer-close {' +
        '  background: none; border: none; cursor: pointer; padding: 8px;' +
        '  color: #475569; transition: color 150ms ease-out; line-height: 0;' +
        '}',
        '.spark-drawer-close:hover { color: #1E293B; }',
        '.spark-drawer-close:focus-visible { outline: 2px solid var(--primary-color, #1E293B); outline-offset: 2px; }',

        /* Body */
        '.spark-drawer-body {' +
        '  flex: 1 1 auto; overflow-y: auto; padding: 16px 20px;' +
        '}',

        /* Empty state */
        '.spark-drawer-empty {' +
        '  display: flex; flex-direction: column; align-items: center; justify-content: center;' +
        '  text-align: center; padding: 48px 20px; gap: 8px;' +
        '}',
        '.spark-drawer-empty svg { color: #CBD5E1; margin-bottom: 8px; }',
        '.spark-drawer-empty-title { font-size: 18px; color: #475569; font-weight: 500; }',
        '.spark-drawer-empty-sub { font-size: 14px; color: #94A3B8; }',
        '.spark-drawer-empty-cta {' +
        '  margin-top: 16px; display: inline-block; padding: 10px 24px;' +
        '  background: var(--primary-color, #1E293B); color: #fff; text-decoration: none;' +
        '  font-size: 14px; font-weight: 500; border-radius: 4px;' +
        '  transition: opacity 150ms ease-out;' +
        '}',
        '[data-light-primary] .spark-drawer-empty-cta { color: #1E293B; }',
        '.spark-drawer-empty-cta:hover { opacity: 0.9; }',

        /* Loading */
        '.spark-drawer-loading {' +
        '  display: flex; align-items: center; justify-content: center; padding: 48px;' +
        '}',
        '@keyframes spark-drawer-spin { to { transform: rotate(360deg); } }',
        '.spark-drawer-spinner {' +
        '  width: 24px; height: 24px; border: 2px solid #E2E8F0;' +
        '  border-top-color: var(--primary-color, #1E293B);' +
        '  border-radius: 50%; animation: spark-drawer-spin 800ms linear infinite;' +
        '}',

        /* Cart items */
        '.spark-drawer-items { display: flex; flex-direction: column; gap: 0; }',
        '.spark-drawer-item {' +
        '  display: flex; gap: 12px; padding: 16px 0;' +
        '  border-bottom: 1px solid #E2E8F0; position: relative;' +
        '}',
        '.spark-drawer-item:last-child { border-bottom: none; }',
        '.spark-drawer-item[data-loading="true"] { opacity: 0.5; pointer-events: none; }',
        '.spark-drawer-item-image { flex-shrink: 0; width: 80px; height: 80px; }',
        '.spark-drawer-item-image img { width: 80px; height: 80px; object-fit: cover; border-radius: 2px; }',
        '.spark-drawer-item-details { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }',
        '.spark-drawer-item-title {' +
        '  font-size: 14px; font-weight: 500; color: #1E293B; text-decoration: none;' +
        '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' +
        '}',
        '.spark-drawer-item-title:hover { color: #475569; }',
        '.spark-drawer-item-variant { font-size: 12px; color: #94A3B8; }',
        '.spark-drawer-item-sub { font-size: 12px; color: #64748B; }',
        '.spark-drawer-item-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }',
        '.spark-drawer-item-qty { display: inline-flex; align-items: center; gap: 0; }',
        '.spark-drawer-qty-btn {' +
        '  width: 28px; height: 28px; border: 1px solid #E2E8F0; background: transparent;' +
        '  color: #475569; font-size: 14px; cursor: pointer; display: inline-flex;' +
        '  align-items: center; justify-content: center; padding: 0;' +
        '  transition: background-color 150ms ease-out;' +
        '}',
        '.spark-drawer-qty-btn:hover:not(:disabled) { background-color: #F8FAFC; }',
        '.spark-drawer-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }',
        '.spark-drawer-qty-btn:focus-visible { outline: 2px solid var(--primary-color, #1E293B); outline-offset: 2px; }',
        '.spark-drawer-qty-val {' +
        '  width: 36px; height: 28px; display: inline-flex; align-items: center; justify-content: center;' +
        '  font-size: 13px; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;' +
        '}',
        '.spark-drawer-item-price { font-size: 14px; font-weight: 500; text-align: right; white-space: nowrap; }',
        '.spark-drawer-item-compare { text-decoration: line-through; color: #94A3B8; font-weight: 400; font-size: 12px; }',
        '.spark-drawer-item-free { color: #22C55E; font-weight: 600; font-size: 13px; }',
        '.spark-drawer-item-remove {' +
        '  position: absolute; top: 16px; right: 0; background: none; border: none;' +
        '  cursor: pointer; padding: 4px; color: #94A3B8;' +
        '  transition: color 150ms ease-out; line-height: 0;' +
        '}',
        '.spark-drawer-item-remove:hover { color: #EF4444; }',
        '.spark-drawer-item-remove:focus-visible { outline: 2px solid var(--primary-color, #1E293B); outline-offset: 2px; }',

        /* Voucher */
        '.spark-drawer-voucher { padding: 12px 0; border-top: 1px solid #E2E8F0; }',
        '.spark-drawer-voucher-form { display: flex; gap: 8px; }',
        '.spark-drawer-voucher-input {' +
        '  flex: 1; padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 13px;' +
        '  font-family: var(--font-body, inherit); color: #1E293B;' +
        '}',
        '.spark-drawer-voucher-input:focus { outline: 2px solid var(--primary-color, #1E293B); outline-offset: -2px; }',
        '.spark-drawer-voucher-btn {' +
        '  padding: 8px 16px; background: transparent; border: 1px solid #E2E8F0;' +
        '  font-size: 13px; font-weight: 500; cursor: pointer; color: #1E293B;' +
        '  font-family: var(--font-body, inherit); transition: background-color 150ms ease-out;' +
        '}',
        '.spark-drawer-voucher-btn:hover { background: #F8FAFC; }',
        '.spark-drawer-voucher-btn:focus-visible { outline: 2px solid var(--primary-color, #1E293B); outline-offset: 2px; }',
        '.spark-drawer-voucher-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
        '.spark-drawer-voucher-error { font-size: 12px; color: #EF4444; margin-top: 4px; }',
        '.spark-drawer-voucher-applied { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 13px; }',
        '.spark-drawer-voucher-tag { display: inline-flex; align-items: center; gap: 4px; color: #22C55E; }',
        '.spark-drawer-voucher-remove {' +
        '  background: none; border: none; cursor: pointer; color: #94A3B8; padding: 2px;' +
        '  line-height: 0; transition: color 150ms ease-out;' +
        '}',
        '.spark-drawer-voucher-remove:hover { color: #EF4444; }',

        /* Footer */
        '.spark-drawer-footer {' +
        '  flex-shrink: 0; padding: 16px 20px; border-top: 1px solid #E2E8F0;' +
        '  background: #fff;' +
        '}',
        '.spark-drawer-totals { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }',
        '.spark-drawer-total-row { display: flex; justify-content: space-between; font-size: 14px; }',
        '.spark-drawer-total-row.discount { color: #22C55E; }',
        '.spark-drawer-total-row.grand { font-weight: 600; font-size: 16px; }',
        '.spark-drawer-checkout {' +
        '  display: block; width: 100%; padding: 12px; text-align: center;' +
        '  background: var(--primary-color, #1E293B); color: #fff; text-decoration: none;' +
        '  font-size: 15px; font-weight: 500; border: none; border-radius: 4px;' +
        '  cursor: pointer; transition: opacity 150ms ease-out;' +
        '  font-family: var(--font-body, inherit);' +
        '}',
        '[data-light-primary] .spark-drawer-checkout { color: #1E293B; }',
        '.spark-drawer-checkout:hover { opacity: 0.9; }',
        '.spark-drawer-checkout:focus-visible { outline: 2px solid var(--primary-color, #1E293B); outline-offset: 2px; }',
        '.spark-drawer-continue {' +
        '  display: block; text-align: center; margin-top: 10px; font-size: 13px;' +
        '  color: #475569; text-decoration: none; cursor: pointer; background: none; border: none;' +
        '  font-family: var(--font-body, inherit); padding: 4px;' +
        '}',
        '.spark-drawer-continue:hover { color: #1E293B; }'
    ].join('\n');

    /* --- SparkCartDrawer Web Component --- */

    var template = document.createElement('template');
    template.innerHTML = '<style>' + DRAWER_STYLES + '</style>' +
        '<div class="spark-drawer-backdrop" data-action="close"></div>' +
        '<div class="spark-drawer-panel" role="document">' +
        '  <div class="spark-drawer-header">' +
        '    <h2 class="spark-drawer-header-title"></h2>' +
        '    <button class="spark-drawer-close" data-action="close" aria-label="Close cart">' +
        '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '    </button>' +
        '  </div>' +
        '  <slot name="progress"></slot>' +
        '  <div class="spark-drawer-body"></div>' +
        '  <slot name="upsells"></slot>' +
        '  <div class="spark-drawer-footer" style="display:none;"></div>' +
        '</div>';

    class SparkCartDrawerEl extends HTMLElement {

    connectedCallback() {
        var self = this;
        this._cart = null;
        this._isOpen = false;
        this._isLoading = false;

        // Read data attributes from host (set by DTL template)
        this._checkoutUrl = this.getAttribute('data-checkout-url') || '/checkout/';
        this._headerTitle = this.getAttribute('data-header-title') || 'Your Cart';
        this._emptyTitle = this.getAttribute('data-empty-title') || 'Your cart is empty';
        this._emptySub = this.getAttribute('data-empty-sub') || 'Add items to get started';
        this._continueCta = this.getAttribute('data-continue-text') || 'Continue Shopping';
        this._continueUrl = this.getAttribute('data-continue-url') || '/';
        this._checkoutText = this.getAttribute('data-checkout-text') || 'Proceed to Checkout';
        this._subtotalText = this.getAttribute('data-subtotal-text') || 'Subtotal';
        this._discountText = this.getAttribute('data-discount-text') || 'Discount';
        this._shippingText = this.getAttribute('data-shipping-text') || 'Calculated at checkout';
        this._couponPlaceholder = this.getAttribute('data-coupon-placeholder') || 'Coupon code';
        this._couponBtn = this.getAttribute('data-coupon-btn') || 'Apply';
        this._giftProductId = this.getAttribute('data-gift-product-id') || '';
        this._currencyCode = this.getAttribute('data-currency') || 'USD';
        this._openOnAdd = this.getAttribute('data-open-on-add') !== 'false';

        // Attach shadow DOM
        var shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(template.content.cloneNode(true));

        // Cache references
        this._backdrop = shadow.querySelector('.spark-drawer-backdrop');
        this._panel = shadow.querySelector('.spark-drawer-panel');
        this._titleEl = shadow.querySelector('.spark-drawer-header-title');
        this._body = shadow.querySelector('.spark-drawer-body');
        this._footer = shadow.querySelector('.spark-drawer-footer');

        this._titleEl.textContent = this._headerTitle;
        this.setAttribute('data-open', 'false');

        // Progress bar reference (slotted from light DOM)
        this._progressBar = this.querySelector('spark-progress-bar');

        // Mutation guard - prevents concurrent GraphQL calls from rapid clicks
        this._isMutating = false;

        // Track gift state
        this._giftLineId = null;
        this._isCartContainsGift = false;

        // Get cart client
        this._client = window.SparkCartClient ? new SparkCartClient() : null;

        // Click handler (delegation)
        shadow.addEventListener('click', function(e) {
            var target = e.target.closest('[data-action]');
            if (!target) return;
            var action = target.getAttribute('data-action');

            if (action === 'close') {
                self.closeCart();
            } else if (action === 'decrease') {
                self._handleQtyChange(target, -1);
            } else if (action === 'increase') {
                self._handleQtyChange(target, 1);
            } else if (action === 'remove') {
                self._handleRemove(target);
            } else if (action === 'apply-voucher') {
                self._handleApplyVoucher();
            } else if (action === 'remove-voucher') {
                var vid = target.getAttribute('data-voucher-id');
                if (vid) self._handleRemoveVoucher(vid);
            }
        });

        // Voucher form enter key
        shadow.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.classList.contains('spark-drawer-voucher-input')) {
                e.preventDefault();
                self._handleApplyVoucher();
            }
        });

        // Global event listeners
        this._onCartAdded = function(e) {
            var detail = e.detail || {};
            if (detail.cart) {
                self._cart = detail.cart;
                self._currencyCode = detail.cart.currency || self._currencyCode;
                self._renderCart();
            }
            if (self._openOnAdd && detail.openSideCart !== false) {
                self.openCart();
            }
        };

        this._onCartToggle = function() {
            self.toggleCart();
        };

        this._onCartUpdated = function(e) {
            var detail = e.detail || {};
            if (detail.cart) {
                self._cart = detail.cart;
                self._currencyCode = detail.cart.currency || self._currencyCode;
                self._renderCart();
            }
        };

        this._onKeydown = function(e) {
            if (e.key === 'Escape' && self._isOpen) {
                self.closeCart();
            }
        };

        // Gift threshold listeners (from progress bar)
        this._onGiftReached = function(e) {
            var giftId = self._giftProductId || (e.detail && e.detail.giftId);
            if (giftId && !self._isCartContainsGift) {
                self._toggleGift(true, giftId);
            }
        };
        this._onGiftUnreached = function(e) {
            var giftId = self._giftProductId || (e.detail && e.detail.giftId);
            if (giftId && self._isCartContainsGift && self._giftLineId) {
                self._toggleGift(false, giftId);
            }
        };

        document.addEventListener('spark:cart:added', this._onCartAdded);
        document.addEventListener('spark:cart:toggle', this._onCartToggle);
        document.addEventListener('spark:cart:updated', this._onCartUpdated);
        document.addEventListener('keydown', this._onKeydown);
        document.addEventListener('spark:progress:gift-reached', this._onGiftReached);
        document.addEventListener('spark:progress:gift-unreached', this._onGiftUnreached);

        // Expose SparkSideCart API for backward compat
        var drawer = this;
        window.SparkSideCart = {
            open: function() { drawer.openCart(); },
            close: function() { drawer.closeCart(); },
            toggle: function() { drawer.toggleCart(); },
            isOpen: function() { return drawer._isOpen; }
        };
    };

    disconnectedCallback() {
        document.removeEventListener('spark:cart:added', this._onCartAdded);
        document.removeEventListener('spark:cart:toggle', this._onCartToggle);
        document.removeEventListener('spark:cart:updated', this._onCartUpdated);
        document.removeEventListener('keydown', this._onKeydown);
        document.removeEventListener('spark:progress:gift-reached', this._onGiftReached);
        document.removeEventListener('spark:progress:gift-unreached', this._onGiftUnreached);
    };

    /* --- Open / Close / Toggle --- */

    openCart() {
        if (this._isOpen) return;
        this._isOpen = true;
        this.setAttribute('data-open', 'true');
        this.setAttribute('aria-expanded', 'true');
        document.body.classList.add('sidecart-open');

        // Load cart if we don't have data
        if (!this._cart) {
            this._loadCart();
        }

        // Focus close button
        var closeBtn = this.shadowRoot.querySelector('.spark-drawer-close');
        if (closeBtn) {
            var btn = closeBtn;
            setTimeout(function() { btn.focus(); }, 50);
        }
    };

    closeCart() {
        if (!this._isOpen) return;
        this._isOpen = false;
        this.setAttribute('data-open', 'false');
        this.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('sidecart-open');

        // Return focus to cart icon
        var cartIcon = document.getElementById('cart-icon');
        if (cartIcon) cartIcon.focus();
    };

    toggleCart() {
        if (this._isOpen) {
            this.closeCart();
        } else {
            this.openCart();
        }
    };

    /* --- Load cart via GraphQL --- */

    _loadCart() {
        var self = this;
        if (!this._client) return;

        this._setLoading(true);
        this._client.getCart().then(function(cart) {
            self._cart = cart;
            if (cart) {
                self._currencyCode = cart.currency || self._currencyCode;
            }
            self._renderCart();
            self._setLoading(false);
        }).catch(function() {
            self._setLoading(false);
            self._renderEmpty();
        });
    };

    /* --- Rendering --- */

    _setLoading(loading) {
        this._isLoading = loading;
        if (loading) {
            this._body.innerHTML = '<div class="spark-drawer-loading"><div class="spark-drawer-spinner"></div></div>';
            this._footer.style.display = 'none';
        }
    };

    _renderCart() {
        var cart = this._cart;
        if (!cart || !cart.lines || cart.lines.length === 0) {
            this._renderEmpty();
            return;
        }

        var currency = this._currencyCode;
        var self = this;

        // Render items
        var itemsHtml = '';
        var doc = this.shadowRoot;
        var frag = document.createDocumentFragment();
        var lines = cart.lines || [];
        for (var i = 0; i < lines.length; i++) {
            frag.appendChild(createCartItemEl(lines[i], currency, document));
        }

        // Voucher section
        var voucherHtml = '<div class="spark-drawer-voucher">';
        var vouchers = cart.voucherDiscounts || [];
        for (var v = 0; v < vouchers.length; v++) {
            var vc = vouchers[v];
            var vcode = escapeHtml(vc.voucher ? vc.voucher.code : vc.name);
            var vid = escapeHtml(vc.voucher ? vc.voucher.code : '');
            voucherHtml += '<div class="spark-drawer-voucher-applied">' +
                '<span class="spark-drawer-voucher-tag">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> ' +
                vcode + ' (-' + SparkCartClient.formatMoney(vc.amount, currency) + ')' +
                '</span>' +
                '<button class="spark-drawer-voucher-remove" data-action="remove-voucher" data-voucher-id="' + vid + '" aria-label="Remove voucher">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button></div>';
        }
        voucherHtml += '<div class="spark-drawer-voucher-form">' +
            '<input type="text" class="spark-drawer-voucher-input" placeholder="' + this._couponPlaceholder + '" />' +
            '<button class="spark-drawer-voucher-btn" data-action="apply-voucher">' + this._couponBtn + '</button>' +
            '</div>' +
            '<div class="spark-drawer-voucher-error" style="display:none;"></div>' +
            '</div>';

        this._body.innerHTML = '';
        var itemsContainer = document.createElement('div');
        itemsContainer.className = 'spark-drawer-items';
        itemsContainer.appendChild(frag);
        this._body.appendChild(itemsContainer);
        this._body.insertAdjacentHTML('beforeend', voucherHtml);

        // Footer with totals
        var totalDiscount = Number(cart.totalDiscount || 0);
        var subtotal = Number(cart.totalExclTaxExclDiscounts || cart.totalExclTax || 0);
        var total = Number(cart.totalExclTax || 0);

        var footerHtml = '<div class="spark-drawer-totals">' +
            '<div class="spark-drawer-total-row"><span>' + this._subtotalText + '</span><span>' + SparkCartClient.formatMoney(subtotal, currency) + '</span></div>';

        if (totalDiscount > 0) {
            footerHtml += '<div class="spark-drawer-total-row discount"><span>' + this._discountText + '</span><span>-' + SparkCartClient.formatMoney(totalDiscount, currency) + '</span></div>';
        }

        footerHtml += '<div class="spark-drawer-total-row"><span>Shipping</span><span style="color:#94A3B8;font-size:12px;">' + this._shippingText + '</span></div>' +
            '<div class="spark-drawer-total-row grand"><span>Total</span><span>' + SparkCartClient.formatMoney(total, currency) + '</span></div>' +
            '</div>' +
            '<a href="' + this._checkoutUrl + '" class="spark-drawer-checkout">' + this._checkoutText + '</a>' +
            '<button class="spark-drawer-continue" data-action="close">' + this._continueCta + '</button>';

        this._footer.innerHTML = footerHtml;
        this._footer.style.display = '';

        // Update progress bar value
        if (this._progressBar) {
            this._progressBar.setAttribute('data-value', String(total));
        }

        // Update upsell visibility
        this._updateUpsellVisibility(cart);

        // Track gift state for auto-add/remove
        this._isCartContainsGift = false;
        this._giftLineId = null;
        if (this._giftProductId) {
            for (var g = 0; g < lines.length; g++) {
                var gLine = lines[g];
                if (gLine.isUpsell && gLine.product &&
                    String(gLine.product.pk) === String(this._giftProductId)) {
                    this._isCartContainsGift = true;
                    this._giftLineId = gLine.pk;
                    break;
                }
            }
        }
    };

    _renderEmpty() {
        this._body.innerHTML = '<div class="spark-drawer-empty">' +
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
            '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>' +
            '<line x1="3" y1="6" x2="21" y2="6"/>' +
            '<path d="M16 10a4 4 0 01-8 0"/>' +
            '</svg>' +
            '<div class="spark-drawer-empty-title">' + this._emptyTitle + '</div>' +
            '<div class="spark-drawer-empty-sub">' + this._emptySub + '</div>' +
            '<a href="' + this._continueUrl + '" class="spark-drawer-empty-cta">' + this._continueCta + '</a>' +
            '</div>';
        this._footer.style.display = 'none';

        // Hide upsells and reset progress bar when empty
        var upsells = this.querySelectorAll('spark-upsell-item');
        for (var i = 0; i < upsells.length; i++) {
            upsells[i].style.display = 'none';
        }
        if (this._progressBar) {
            this._progressBar.setAttribute('data-value', '0');
        }
    };

    /* --- Item interactions --- */

    _handleQtyChange(btn, delta) {
        var self = this;
        if (this._isMutating) return;
        var itemEl = btn.closest('.spark-drawer-item');
        if (!itemEl || !this._client || !this._cart) return;

        var lineId = itemEl.getAttribute('data-line-id');
        var line = this._findLine(lineId);
        if (!line) return;

        var newQty = line.quantity + delta;
        if (newQty <= 0) {
            return this._handleRemoveByLineId(lineId, itemEl);
        }

        this._isMutating = true;
        itemEl.setAttribute('data-loading', 'true');
        this._client.updateCartLines(this._cart.id, [{ lineId: lineId, quantity: newQty }])
            .then(function(result) {
                self._isMutating = false;
                if (result && result.cart) {
                    self._cart = result.cart;
                    self._renderCart();
                }
            }).catch(function() {
                self._isMutating = false;
                itemEl.setAttribute('data-loading', 'false');
            });
    };

    _handleRemove(btn) {
        var itemEl = btn.closest('.spark-drawer-item');
        if (!itemEl) return;
        var lineId = itemEl.getAttribute('data-line-id');
        this._handleRemoveByLineId(lineId, itemEl);
    };

    _handleRemoveByLineId(lineId, itemEl) {
        var self = this;
        if (this._isMutating || !this._client || !this._cart) return;

        this._isMutating = true;
        if (itemEl) itemEl.setAttribute('data-loading', 'true');
        this._client.removeCartLines(this._cart.id, [lineId])
            .then(function(result) {
                self._isMutating = false;
                if (result && result.cart) {
                    self._cart = result.cart;
                    self._renderCart();
                }
            }).catch(function() {
                self._isMutating = false;
                if (itemEl) itemEl.setAttribute('data-loading', 'false');
            });
    };

    _findLine(lineId) {
        if (!this._cart || !this._cart.lines) return null;
        for (var i = 0; i < this._cart.lines.length; i++) {
            if (String(this._cart.lines[i].pk) === String(lineId)) return this._cart.lines[i];
        }
        return null;
    };

    /* --- Gift auto-management --- */

    _toggleGift(shouldAdd, giftProductId) {
        var self = this;
        if (!this._client || !this._cart) return;

        if (shouldAdd && !this._isCartContainsGift) {
            this._client.addToCart(Number(giftProductId), 1, true)
                .then(function(result) {
                    if (result && result.cart) {
                        self._cart = result.cart;
                        self._renderCart();
                    }
                }).catch(function() {});
        } else if (!shouldAdd && this._isCartContainsGift && this._giftLineId) {
            this._client.removeCartLines(this._cart.id, [this._giftLineId])
                .then(function(result) {
                    if (result && result.cart) {
                        self._cart = result.cart;
                        self._renderCart();
                    }
                }).catch(function() {});
        }
    };

    /* --- Upsell visibility --- */

    _updateUpsellVisibility(cart) {
        var upsells = this.querySelectorAll('spark-upsell-item');
        if (!upsells.length) return;

        // Build set of product PKs in cart (including parent PKs)
        var cartProductPks = {};
        var lines = cart.lines || [];
        for (var i = 0; i < lines.length; i++) {
            var p = lines[i].product;
            if (p) {
                cartProductPks[String(p.pk)] = true;
                if (p.parent) cartProductPks[String(p.parent.pk)] = true;
            }
        }

        // Build set of active upsell slots from cart products' metadata
        var activeSlots = {};
        for (var j = 0; j < lines.length; j++) {
            var prod = lines[j].product;
            if (!prod) continue;
            var meta = prod.metadata || (prod.parent ? prod.parent.metadata : null);
            if (meta) {
                var slotsStr = '';
                // metadata can be object or JSON string
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
                }
                slotsStr = meta.cart_upsell_slots || '';
                if (slotsStr) {
                    var slotArr = String(slotsStr).split(',');
                    for (var s = 0; s < slotArr.length; s++) {
                        activeSlots[slotArr[s].trim()] = true;
                    }
                }
            }
        }

        // Show/hide each upsell
        for (var u = 0; u < upsells.length; u++) {
            var upsell = upsells[u];
            var slot = upsell.getAttribute('data-upsell-slot');
            var productId = upsell.getAttribute('data-product-id');
            var fallback = upsell.getAttribute('data-fallback-slots') || '1,2';

            // Hide if product already in cart
            if (productId && cartProductPks[String(productId)]) {
                upsell.style.display = 'none';
                continue;
            }

            // Check slot visibility
            var hasActiveSlots = Object.keys(activeSlots).length > 0;
            var slotsToCheck = hasActiveSlots ? activeSlots : {};
            if (!hasActiveSlots) {
                // Use fallback slots
                var fb = fallback.split(',');
                for (var f = 0; f < fb.length; f++) {
                    slotsToCheck[fb[f].trim()] = true;
                }
            }

            if (slot && slotsToCheck[slot]) {
                upsell.style.display = '';
            } else if (!slot) {
                upsell.style.display = '';
            } else {
                upsell.style.display = 'none';
            }
        }
    };

    /* --- Voucher interactions --- */

    _handleApplyVoucher() {
        var self = this;
        if (this._isMutating || !this._client || !this._cart) return;

        var input = this.shadowRoot.querySelector('.spark-drawer-voucher-input');
        var errorEl = this.shadowRoot.querySelector('.spark-drawer-voucher-error');
        var btn = this.shadowRoot.querySelector('.spark-drawer-voucher-btn');
        if (!input) return;

        var code = input.value.trim();
        if (!code) return;

        this._isMutating = true;
        if (btn) btn.disabled = true;
        if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

        this._client.addVoucher(this._cart.id, code)
            .then(function(result) {
                self._isMutating = false;
                if (btn) btn.disabled = false;
                if (result && result.errors && result.errors.length) {
                    if (errorEl) {
                        errorEl.textContent = result.errors[0];
                        errorEl.style.display = '';
                    }
                    return;
                }
                if (result && result.cart) {
                    self._cart = result.cart;
                    self._renderCart();
                }
            }).catch(function(err) {
                self._isMutating = false;
                if (btn) btn.disabled = false;
                if (errorEl) {
                    errorEl.textContent = err.message || 'Invalid coupon code';
                    errorEl.style.display = '';
                }
            });
    };

    _handleRemoveVoucher(voucherId) {
        var self = this;
        if (!this._client || !this._cart) return;

        this._client.removeVoucher(this._cart.id, voucherId)
            .then(function(result) {
                if (result && result.cart) {
                    self._cart = result.cart;
                    self._renderCart();
                }
            }).catch(function() {
                // Silently fail - voucher may already be removed
            });
    }

    } /* end class SparkCartDrawerEl */

    if (typeof customElements !== 'undefined' && !customElements.get('spark-cart-drawer')) {
        customElements.define('spark-cart-drawer', SparkCartDrawerEl);
    }

})();
