/**
 * Spark Theme - GraphQL Cart Client
 *
 * Shared module for cart operations via the Storefront GraphQL API.
 * Dispatches CustomEvents so Web Components and UI can react.
 *
 * Usage:
 *   var cart = new SparkCartClient('/api/graphql/');
 *   cart.addToCart(productPk, quantity).then(function(result) { ... });
 *   cart.getCart().then(function(cart) { ... });
 *   cart.updateCartLines(cartId, [{lineId: 'x', quantity: 2}]).then(...);
 *   cart.removeCartLines(cartId, ['lineId1']).then(...);
 *   cart.addVoucher(cartId, 'CODE').then(...);
 *   cart.removeVoucher(cartId, 'voucherId').then(...);
 *   SparkCartClient.formatMoney(29.99, 'USD') // "$29.99"
 */

(function() {
    'use strict';

    var CART_ID_KEY = 'storefront_cart_id';
    var CSRF_COOKIE = 'csrftoken';
    var FETCH_TIMEOUT = 5000;
    var RETRY_DELAY = 2000;
    var MAX_QTY_PER_LINE = 15;

    /* --- Cookie helpers --- */

    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function setCookie(name, value, days) {
        var expires = '';
        if (days) {
            var d = new Date();
            d.setTime(d.getTime() + days * 86400000);
            expires = '; expires=' + d.toUTCString();
        }
        document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
    }

    /* --- Cart ID persistence (sessionStorage + cookie) --- */

    function getCartId() {
        try {
            var id = sessionStorage.getItem(CART_ID_KEY);
            if (id) return id;
        } catch(e) {}
        return getCookie(CART_ID_KEY) || null;
    }

    function setCartId(id) {
        try {
            sessionStorage.setItem(CART_ID_KEY, id);
        } catch(e) {}
        setCookie(CART_ID_KEY, id, 30);
    }

    /* --- Currency formatting --- */

    function formatMoney(amount, currency) {
        currency = currency || 'USD';
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (e) {
            return currency + ' ' + Number(amount).toFixed(2);
        }
    }

    /* --- Fetch with timeout --- */

    function fetchWithTimeout(url, options, timeout) {
        return new Promise(function(resolve, reject) {
            var controller = new AbortController();
            options.signal = controller.signal;
            var timer = setTimeout(function() {
                controller.abort();
                reject(new Error('Network timeout'));
            }, timeout);
            fetch(url, options).then(function(res) {
                clearTimeout(timer);
                resolve(res);
            }).catch(function(err) {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    /* --- GraphQL field fragment --- */

    var CART_FIELDS = [
        'id pk currency totalExclTax totalExclTaxExclDiscounts totalDiscount numItems numLines',
        'voucherDiscounts { name amount voucher { name code } }',
        'lines {',
        '  pk quantity unitPriceExclTax linePriceExclTax linePriceExclTaxInclDiscounts isUpsell',
        '  attributes { value option }',
        '  product {',
        '    pk title url metadata',
        '    primaryImage { thumbnail: url(transform: { maxWidth: 150, maxHeight: 150, format: webp, crop: center }) }',
        '    subscriptionInfo { interval intervalCount }',
        '    parent { pk title metadata }',
        '    purchaseInfo { priceRetail { value format currency } availableForSale availability }',
        '  }',
        '}'
    ].join(' ');

    /* --- GraphQL queries --- */

    var CREATE_CART = 'mutation CreateCart($input: CreateCartInput!) { createCart(input: $input) { cart { ' + CART_FIELDS + ' } } }';

    var GET_CART = 'query GetCart($id: ID!) { cart(id: $id) { ' + CART_FIELDS + ' } }';

    var ADD_CART_LINES = 'mutation AddCartLines($input: AddCartLinesInput!) { addCartLines(input: $input) { success errors cart { ' + CART_FIELDS + ' } } }';

    var UPDATE_CART_LINES = 'mutation UpdateCartLines($input: UpdateCartLinesInput!) { updateCartLines(input: $input) { success errors cart { ' + CART_FIELDS + ' } } }';

    var REMOVE_CART_LINES = 'mutation RemoveCartLines($input: RemoveCartLinesInput!) { removeCartLines(input: $input) { success errors cart { ' + CART_FIELDS + ' } } }';

    var ADD_VOUCHER = 'mutation AddVoucher($input: AddVoucherInput!) { addVoucher(input: $input) { success errors cart { ' + CART_FIELDS + ' } } }';

    var REMOVE_VOUCHER = 'mutation RemoveVoucher($input: RemoveVoucherInput!) { removeVoucher(input: $input) { success errors cart { ' + CART_FIELDS + ' } } }';

    /* --- SparkCartClient --- */

    function SparkCartClient(graphqlUrl) {
        this.graphqlUrl = graphqlUrl || '/api/graphql/';
    }

    SparkCartClient.prototype._dispatch = function(name, detail) {
        if (window.SparkEvents) {
            SparkEvents.dispatch(name, detail);
            return;
        }
        document.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
    };

    SparkCartClient.prototype._dispatchCartUpdated = function(cart, action) {
        if (window.SparkEvents) {
            SparkEvents.cartUpdated(cart, action);
            return;
        }
        this._dispatch('spark:cart:updated', {
            cart: cart,
            count: cart ? cart.numItems : 0,
            action: action
        });
    };

    SparkCartClient.prototype._request = function(query, variables) {
        var self = this;
        var csrfToken = getCookie(CSRF_COOKIE);
        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        var body = JSON.stringify({ query: query, variables: variables || {} });

        return fetchWithTimeout(this.graphqlUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            credentials: 'same-origin'
        }, FETCH_TIMEOUT).then(function(response) {
            if (response.status === 403) {
                // CSRF token may have expired - refresh and retry once
                var freshToken = getCookie(CSRF_COOKIE);
                if (freshToken && freshToken !== csrfToken) {
                    headers['X-CSRFToken'] = freshToken;
                    return fetchWithTimeout(self.graphqlUrl, {
                        method: 'POST',
                        headers: headers,
                        body: body,
                        credentials: 'same-origin'
                    }, FETCH_TIMEOUT).then(function(r) { return r.json(); });
                }
                throw new Error('CSRF validation failed');
            }
            if (response.status === 429) {
                // Rate limited - wait and retry once
                return new Promise(function(resolve) {
                    setTimeout(resolve, RETRY_DELAY);
                }).then(function() {
                    return fetchWithTimeout(self.graphqlUrl, {
                        method: 'POST',
                        headers: headers,
                        body: body,
                        credentials: 'same-origin'
                    }, FETCH_TIMEOUT).then(function(r) { return r.json(); });
                });
            }
            return response.json();
        }).then(function(json) {
            if (json.errors && json.errors.length) {
                var err = new Error(json.errors[0].message || 'GraphQL error');
                err.graphqlErrors = json.errors;
                throw err;
            }
            return json.data;
        });
    };

    /**
     * Helper: check if error indicates an expired/invalid cart.
     */
    function isCartExpiredError(err) {
        if (!err || !err.message) return false;
        var msg = err.message.toLowerCase();
        return msg.indexOf('not found') !== -1 ||
               msg.indexOf('does not exist') !== -1 ||
               msg.indexOf('invalid') !== -1;
    }

    /**
     * Create a new empty cart. Stores the cart ID for future requests.
     * @returns {Promise<Object>} Full cart object
     */
    SparkCartClient.prototype.createCart = function() {
        return this._request(CREATE_CART, { input: {} }).then(function(data) {
            var cart = data.createCart && data.createCart.cart;
            if (cart && cart.id) {
                setCartId(cart.id);
            }
            return cart;
        });
    };

    /**
     * Fetch the current cart contents.
     * @param {string} [cartId] - Cart ID (uses stored ID if omitted)
     * @returns {Promise<Object|null>} Full cart object or null if no cart
     */
    SparkCartClient.prototype.getCart = function(cartId) {
        var id = cartId || getCartId();
        if (!id) return Promise.resolve(null);
        return this._request(GET_CART, { id: id }).then(function(data) {
            return data.cart || null;
        }).catch(function(err) {
            if (isCartExpiredError(err)) return null;
            throw err;
        });
    };

    /**
     * Add a product to the cart. Auto-creates cart if none exists.
     * @param {number} productPk - The product ID to add
     * @param {number} [quantity=1] - Quantity to add
     * @param {boolean} [isUpsell=false] - Mark as upsell line
     * @returns {Promise<{success, cart}>}
     */
    SparkCartClient.prototype.addToCart = function(productPk, quantity, isUpsell) {
        var self = this;
        quantity = quantity || 1;

        function doAdd(cartId) {
            var lineInput = { productPk: productPk, quantity: quantity };
            if (isUpsell) lineInput.isUpsell = true;
            var input = {
                cartId: cartId,
                lines: [lineInput]
            };
            return self._request(ADD_CART_LINES, { input: input }).then(function(data) {
                var result = data.addCartLines;
                if (result && result.cart) {
                    setCartId(result.cart.id);
                    self._dispatchCartUpdated(result.cart, 'add');
                }
                return result;
            });
        }

        var cartId = getCartId();
        if (cartId) {
            return doAdd(cartId).catch(function(err) {
                if (isCartExpiredError(err)) {
                    return self.createCart().then(function(cart) {
                        return doAdd(cart.id);
                    });
                }
                throw err;
            });
        }

        return this.createCart().then(function(cart) {
            return doAdd(cart.id);
        });
    };

    /**
     * Update quantities on existing cart lines.
     * @param {string} cartId - Cart ID
     * @param {Array<{lineId: string, quantity: number}>} lines - Lines to update
     * @returns {Promise<{success, cart}>}
     */
    SparkCartClient.prototype.updateCartLines = function(cartId, lines) {
        var self = this;
        var input = { cartId: cartId, lines: lines };
        return this._request(UPDATE_CART_LINES, { input: input }).then(function(data) {
            var result = data.updateCartLines;
            if (result && result.cart) {
                setCartId(result.cart.id);
                self._dispatchCartUpdated(result.cart, 'update');
            }
            return result;
        });
    };

    /**
     * Remove lines from the cart.
     * @param {string} cartId - Cart ID
     * @param {Array<string>} lineIds - Line PKs to remove
     * @returns {Promise<{success, cart}>}
     */
    SparkCartClient.prototype.removeCartLines = function(cartId, lineIds) {
        var self = this;
        var input = { cartId: cartId, lineIds: lineIds };
        return this._request(REMOVE_CART_LINES, { input: input }).then(function(data) {
            var result = data.removeCartLines;
            if (result && result.cart) {
                setCartId(result.cart.id);
                self._dispatchCartUpdated(result.cart, 'remove');
            }
            return result;
        });
    };

    /**
     * Apply a voucher code to the cart.
     * @param {string} cartId - Cart ID
     * @param {string} code - Voucher code
     * @returns {Promise<{success, errors, cart}>}
     */
    SparkCartClient.prototype.addVoucher = function(cartId, code) {
        var self = this;
        var input = { cartId: cartId, vouchers: [code] };
        return this._request(ADD_VOUCHER, { input: input }).then(function(data) {
            var result = data.addVoucher;
            if (result && result.cart) {
                self._dispatchCartUpdated(result.cart, 'voucher_add');
            }
            return result;
        });
    };

    /**
     * Remove a voucher from the cart.
     * @param {string} cartId - Cart ID
     * @param {string} voucherCode - Voucher code to remove
     * @returns {Promise<{success, errors, cart}>}
     */
    SparkCartClient.prototype.removeVoucher = function(cartId, voucherCode) {
        var self = this;
        var input = { cartId: cartId, vouchers: [voucherCode] };
        return this._request(REMOVE_VOUCHER, { input: input }).then(function(data) {
            var result = data.removeVoucher;
            if (result && result.cart) {
                self._dispatchCartUpdated(result.cart, 'voucher_remove');
            }
            return result;
        });
    };

    /**
     * Get the current cart ID (or null if none).
     * @returns {string|null}
     */
    SparkCartClient.prototype.getCartId = function() {
        return getCartId();
    };

    /* --- Static utilities --- */

    /**
     * Format a monetary value with currency symbol.
     * @param {number} amount
     * @param {string} [currency='USD']
     * @returns {string}
     */
    SparkCartClient.formatMoney = formatMoney;

    /**
     * Maximum allowed quantity per cart line.
     * @type {number}
     */
    SparkCartClient.MAX_QTY_PER_LINE = MAX_QTY_PER_LINE;

    /* --- Export --- */

    window.SparkCartClient = SparkCartClient;

})();
