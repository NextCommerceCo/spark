/**
 * Spark Theme -GraphQL Cart Client
 *
 * Shared module for cart operations via the Storefront GraphQL API.
 * Dispatches CustomEvents so Web Components and UI can react.
 *
 * Usage:
 *   var cart = new SparkCartClient('/api/graphql/');
 *   cart.addToCart(productPk, quantity).then(function(result) { ... });
 */

(function() {
    'use strict';

    var CART_ID_KEY = 'storefront_cart_id';
    var CSRF_COOKIE = 'csrftoken';
    var FETCH_TIMEOUT = 5000;
    var RETRY_DELAY = 2000;

    /* ---Cookie helpers ---*/

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

    /* ---Cart ID persistence (sessionStorage + cookie) ---*/

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

    /* ---Fetch with timeout ---*/

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

    /* ---GraphQL queries ---*/

    var CREATE_CART = 'mutation CreateCart($input: CreateCartInput!) { createCart(input: $input) { cart { id numItems totalInclTax currency } } }';

    var ADD_CART_LINES = 'mutation AddCartLines($input: AddCartLinesInput!) { addCartLines(input: $input) { success cart { id numItems totalInclTax currency lines { pk quantity product { title } linePriceInclTax } } } }';

    /* ---SparkCartClient ---*/

    function SparkCartClient(graphqlUrl) {
        this.graphqlUrl = graphqlUrl || '/api/graphql/';
    }

    SparkCartClient.prototype._dispatch = function(name, detail) {
        document.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
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
                // CSRF token may have expired -refresh and retry once
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
                // Rate limited -wait and retry once
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
     * Create a new empty cart. Stores the cart ID for future requests.
     * @returns {Promise<{id, numItems, totalInclTax, currency}>}
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
     * Add a product to the cart. Auto-creates cart if none exists.
     * @param {number} productPk - The product ID to add
     * @param {number} [quantity=1] - Quantity to add
     * @returns {Promise<{success, cart}>}
     */
    SparkCartClient.prototype.addToCart = function(productPk, quantity) {
        var self = this;
        quantity = quantity || 1;

        function doAdd(cartId) {
            var input = {
                cartId: cartId,
                lines: [{ productPk: productPk, quantity: quantity }]
            };
            return self._request(ADD_CART_LINES, { input: input }).then(function(data) {
                var result = data.addCartLines;
                if (result && result.cart) {
                    setCartId(result.cart.id);
                    self._dispatch('spark:cart:updated', {
                        cart: result.cart,
                        count: result.cart.numItems,
                        action: 'add'
                    });
                }
                return result;
            });
        }

        var cartId = getCartId();
        if (cartId) {
            return doAdd(cartId).catch(function(err) {
                // Cart may have expired -create a new one and retry
                if (err.message && (
                    err.message.toLowerCase().indexOf('not found') !== -1 ||
                    err.message.toLowerCase().indexOf('does not exist') !== -1 ||
                    err.message.toLowerCase().indexOf('invalid') !== -1
                )) {
                    return self.createCart().then(function(cart) {
                        return doAdd(cart.id);
                    });
                }
                throw err;
            });
        }

        // No cart yet - create one first, then add lines
        return this.createCart().then(function(cart) {
            return doAdd(cart.id);
        });
    };

    /**
     * Get the current cart ID (or null if none).
     * @returns {string|null}
     */
    SparkCartClient.prototype.getCartId = function() {
        return getCartId();
    };

    /* ---Export ---*/

    window.SparkCartClient = SparkCartClient;

})();
