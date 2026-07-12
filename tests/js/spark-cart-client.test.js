const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-cart.js');

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

function createEnvironment(options = {}) {
    const events = [];
    const fetchCalls = [];
    const cookieJar = Object.assign({}, options.cookies);
    const storage = {};
    const responses = (options.responses || []).slice();

    const document = {
        dispatchEvent: function(event) {
            events.push(event);
            return true;
        }
    };
    Object.defineProperty(document, 'cookie', {
        get: function() {
            return Object.keys(cookieJar).map(function(key) {
                return key + '=' + encodeURIComponent(cookieJar[key]);
            }).join('; ');
        },
        set: function(value) {
            const pair = value.split(';')[0].split('=');
            cookieJar[pair[0]] = decodeURIComponent(pair.slice(1).join('='));
        }
    });

    const sessionStorage = {
        getItem: function(key) {
            if (options.storageThrows) throw new Error('storage unavailable');
            return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
        },
        setItem: function(key, value) {
            if (options.storageThrows) throw new Error('storage unavailable');
            storage[key] = String(value);
        }
    };

    const context = {
        console: console,
        document: document,
        sessionStorage: sessionStorage,
        CustomEvent: function CustomEvent(type, init) {
            this.type = type;
            this.detail = init && init.detail;
        },
        AbortController: AbortController,
        Intl: Intl,
        Date: Date,
        Promise: Promise,
        clearTimeout: function() {},
        setTimeout: function(callback, delay) {
            if (delay === 2000) callback();
            return 1;
        },
        fetch: function(url, init) {
            fetchCalls.push({
                url: url,
                init: Object.assign({}, init, { headers: Object.assign({}, init.headers) })
            });
            if (options.onFetch) options.onFetch(fetchCalls.length, cookieJar);
            const response = responses.shift();
            if (!response) throw new Error('Unexpected fetch');
            return Promise.resolve({
                status: response.status || 200,
                json: function() {
                    return Promise.resolve(response.json);
                }
            });
        },
        window: {}
    };

    vm.runInNewContext(fs.readFileSync(SCRIPT, 'utf8'), context, { filename: SCRIPT });
    return {
        Client: context.window.SparkCartClient,
        context: context,
        cookieJar: cookieJar,
        events: events,
        fetchCalls: fetchCalls,
        storage: storage
    };
}

async function testCreateCartPersistencePaths() {
    const env = createEnvironment();
    const client = new env.Client('/graphql');
    client._request = function() {
        return Promise.resolve({ createCart: { cart: { id: 'cart-storage' } } });
    };
    await client.createCart();
    assert.equal(env.storage.storefront_cart_id, 'cart-storage');
    assert.equal(env.cookieJar.storefront_cart_id, 'cart-storage');

    const fallback = createEnvironment({ storageThrows: true });
    const fallbackClient = new fallback.Client();
    fallbackClient._request = function() {
        return Promise.resolve({ createCart: { cart: { id: 'cart-cookie' } } });
    };
    await fallbackClient.createCart();
    assert.equal(fallback.cookieJar.storefront_cart_id, 'cart-cookie');
    assert.equal(fallbackClient.getCartId(), 'cart-cookie');
}

async function testGetCartOutcomes() {
    const env = createEnvironment();
    const client = new env.Client();
    let requests = 0;
    client._request = function() {
        requests += 1;
        return Promise.resolve({ cart: {} });
    };
    assert.equal(await client.getCart(), null);
    assert.equal(requests, 0);

    client._request = function() {
        return Promise.reject(new Error('Cart not found'));
    };
    assert.equal(await client.getCart('expired'), null);

    const failure = new Error('Network failed');
    client._request = function() {
        return Promise.reject(failure);
    };
    await assert.rejects(client.getCart('current'), function(error) {
        return error === failure;
    });
}

async function testAddToCartCreationAndDefaults() {
    const env = createEnvironment();
    const client = new env.Client();
    const calls = [];
    client._request = function(query, variables) {
        calls.push({ query: query, variables: plain(variables) });
        if (query.indexOf('CreateCart') !== -1) {
            return Promise.resolve({ createCart: { cart: { id: 'new-cart' } } });
        }
        return Promise.resolve({ addCartLines: { success: true, cart: { id: 'new-cart', numItems: 1 } } });
    };

    await client.addToCart(42, undefined, true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].variables, {
        input: { cartId: 'new-cart', lines: [{ productPk: 42, quantity: 1, isUpsell: true }] }
    });
    assert.equal(env.events[0].detail.action, 'add');
    assert.equal(env.events[0].detail.count, 1);
}

async function testAddToCartExpiredRetry() {
    const env = createEnvironment({ cookies: { storefront_cart_id: 'old-cart' } });
    const client = new env.Client();
    const cartIds = [];
    let addAttempts = 0;
    client._request = function(query, variables) {
        if (query.indexOf('CreateCart') !== -1) {
            return Promise.resolve({ createCart: { cart: { id: 'replacement-cart' } } });
        }
        addAttempts += 1;
        cartIds.push(variables.input.cartId);
        if (addAttempts === 1) return Promise.reject(new Error('Cart does not exist'));
        return Promise.resolve({ addCartLines: { success: true, cart: { id: 'replacement-cart', numItems: 2 } } });
    };

    const result = await client.addToCart(7, 2);
    assert.equal(result.success, true);
    assert.deepEqual(cartIds, ['old-cart', 'replacement-cart']);
    assert.equal(env.cookieJar.storefront_cart_id, 'replacement-cart');
}

async function testSubscriptionValidationAndInput() {
    const env = createEnvironment({ cookies: { storefront_cart_id: 'cart-1' } });
    const client = new env.Client();
    let requests = 0;
    client._request = function() {
        requests += 1;
        return Promise.resolve({});
    };

    const badInterval = await client.addToCart(5, 1, false, {
        subscriptionOption: 'subscribe', interval: ' ', intervalCount: 2
    });
    const badCount = await client.addToCart(5, 1, false, {
        subscriptionOption: 'subscribe', interval: 'month', intervalCount: 0
    });
    assert.equal(badInterval.success, false);
    assert.equal(badCount.success, false);
    assert.equal(requests, 0);

    let variables;
    client._request = function(query, inputVariables) {
        variables = plain(inputVariables);
        return Promise.resolve({ addCartLines: { success: true, cart: { id: 'cart-1', numItems: 1 } } });
    };
    await client.addToCart(5, 3, false, {
        subscriptionOption: 'subscribe', interval: ' month ', intervalCount: '2'
    });
    assert.deepEqual(variables.input.lines[0].subscription, { interval: 'month', intervalCount: 2 });
}

async function testMutationVariablesAndEvents() {
    const env = createEnvironment();
    const client = new env.Client();
    const seen = [];
    client._request = function(query, variables) {
        const operation = ['updateCartLines', 'removeCartLines', 'addVoucher', 'removeVoucher'].find(function(name) {
            return query.indexOf(name + '(input') !== -1;
        });
        seen.push({ operation: operation, variables: plain(variables) });
        const data = {};
        data[operation] = { success: true, cart: { id: 'cart-9', numItems: 4 } };
        return Promise.resolve(data);
    };

    await client.updateCartLines('cart-9', [{ lineId: 'line-1', quantity: 3 }]);
    await client.removeCartLines('cart-9', ['line-2']);
    await client.addVoucher('cart-9', 'SAVE10');
    await client.removeVoucher('cart-9', 'SAVE10');

    assert.deepEqual(seen.map(function(call) { return call.variables.input; }), [
        { cartId: 'cart-9', lines: [{ lineId: 'line-1', quantity: 3 }] },
        { cartId: 'cart-9', lineIds: ['line-2'] },
        { cartId: 'cart-9', vouchers: ['SAVE10'] },
        { cartId: 'cart-9', vouchers: ['SAVE10'] }
    ]);
    assert.deepEqual(env.events.map(function(event) {
        return [event.detail.action, event.detail.count];
    }), [
        ['update', 4], ['remove', 4], ['voucher_add', 4], ['voucher_remove', 4]
    ]);
}

async function testRequestErrorsAndRetries() {
    const graphql = createEnvironment({
        responses: [{ json: { errors: [{ message: 'Bad query', extensions: { code: 'BAD' } }] } }]
    });
    await assert.rejects(new graphql.Client()._request('query Test', {}), function(error) {
        assert.equal(error.message, 'Bad query');
        assert.equal(error.graphqlErrors[0].extensions.code, 'BAD');
        return true;
    });

    const csrf = createEnvironment({
        cookies: { csrftoken: 'old-token' },
        responses: [
            { status: 403, json: {} },
            { status: 200, json: { data: { retried: true } } }
        ],
        onFetch: function(count, cookies) {
            if (count === 1) cookies.csrftoken = 'fresh-token';
        }
    });
    assert.equal((await new csrf.Client()._request('query Test', {})).retried, true);
    assert.equal(csrf.fetchCalls.length, 2);
    assert.equal(csrf.fetchCalls[0].init.headers['X-CSRFToken'], 'old-token');
    assert.equal(csrf.fetchCalls[1].init.headers['X-CSRFToken'], 'fresh-token');

    const limited = createEnvironment({ responses: [
        { status: 429, json: {} },
        { status: 200, json: { data: { retried: true } } }
    ] });
    assert.equal((await new limited.Client()._request('query Test', {})).retried, true);
    assert.equal(limited.fetchCalls.length, 2);
}

async function testStaticUtilities() {
    const env = createEnvironment();
    assert.equal(env.Client.formatMoney(29.99, 'USD'), '$29.99');
    assert.equal(env.Client.MAX_QTY_PER_LINE, 15);
}

const tests = [
    ['createCart persistence paths', testCreateCartPersistencePaths],
    ['getCart outcomes', testGetCartOutcomes],
    ['addToCart creation and defaults', testAddToCartCreationAndDefaults],
    ['addToCart expired retry', testAddToCartExpiredRetry],
    ['subscription validation and input', testSubscriptionValidationAndInput],
    ['mutation variables and events', testMutationVariablesAndEvents],
    ['request errors and retries', testRequestErrorsAndRetries],
    ['static utilities', testStaticUtilities]
];

(async function main() {
    for (const test of tests) {
        await test[1]();
        console.log('ok - ' + test[0]);
    }
    console.log(tests.length + ' spark cart client tests passed');
})().catch(function(error) {
    console.error('not ok - ' + error.stack);
    process.exitCode = 1;
});
