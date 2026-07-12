const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const EVENTS_SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-events.js');
const REWARDS_SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-cart-rewards.js');
const RENDERER_SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-cart-drawer-renderer.js');
const DRAWER_SCRIPT = path.join(ROOT, 'assets', 'js', 'components', 'spark-cart-drawer.js');

const GIFT_PRODUCT_ID = '77';
const GIFT_THRESHOLD = 50;

class FakeClassList {
    constructor() {
        this.values = [];
    }

    add(name) {
        if (this.values.indexOf(name) === -1) this.values.push(name);
    }

    remove(name) {
        const index = this.values.indexOf(name);
        if (index !== -1) this.values.splice(index, 1);
    }

    contains(name) {
        return this.values.indexOf(name) !== -1;
    }
}

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName || '';
        this.attributes = {};
        this.children = [];
        this.className = '';
        this.classList = new FakeClassList();
        this.listeners = {};
        this.queries = {};
        this.style = { display: '' };
        this._innerHTML = '';
    }

    set innerHTML(value) {
        this._innerHTML = String(value);
        this.children = [];
    }

    get innerHTML() {
        return this._innerHTML;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    insertAdjacentHTML(position, html) {
        this._innerHTML += String(html);
    }

    addEventListener(name, callback) {
        if (!this.listeners[name]) this.listeners[name] = [];
        this.listeners[name].push(callback);
    }

    removeEventListener(name, callback) {
        const callbacks = this.listeners[name] || [];
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
    }

    dispatchEvent(event) {
        for (const callback of (this.listeners[event.type] || []).slice()) callback(event);
        return true;
    }

    querySelector(selector) {
        const value = this.queries[selector];
        return Array.isArray(value) ? value[0] || null : value || null;
    }

    querySelectorAll(selector) {
        const value = this.queries[selector];
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }

    attachShadow() {
        const root = new FakeElement('shadow-root');
        for (const selector of [
            '.spark-drawer-backdrop',
            '.spark-drawer-panel',
            '.spark-drawer-header-title',
            '.spark-drawer-body',
            '.spark-drawer-footer',
            '.spark-drawer-close'
        ]) {
            root.queries[selector] = new FakeElement('div');
        }
        root.queries['.spark-drawer-close'].focus = function() { this.focused = true; };
        this.shadowRoot = root;
        return root;
    }
}

/* Fake progress bar that mirrors the real component's EDGE-ONLY event
   semantics: a gift event fires only when data-value crosses the threshold,
   never for consecutive updates on the same side. Reproducing that behavior
   is the whole point of these tests. Like the real component, the very first
   update always fires an edge (prevReached starts undefined). */
function createProgressBar(document) {
    const bar = new FakeElement('spark-progress-bar');
    const giftMsg = new FakeElement('div');
    giftMsg.setAttribute('data-gift', '');
    giftMsg.setAttribute('data-value', String(GIFT_THRESHOLD));
    giftMsg.setAttribute('data-gift-id', GIFT_PRODUCT_ID);
    bar.queries['[data-gift]'] = giftMsg;

    let prevReached;
    const baseSetAttribute = FakeElement.prototype.setAttribute.bind(bar);
    bar.setAttribute = function(name, value) {
        baseSetAttribute(name, value);
        if (name !== 'data-value') return;
        const reached = parseFloat(value) >= GIFT_THRESHOLD;
        if (prevReached !== reached) {
            prevReached = reached;
            const type = reached ? 'spark:progress:gift-reached' : 'spark:progress:gift-unreached';
            document.dispatchEvent({ type: type, detail: { giftId: GIFT_PRODUCT_ID } });
        }
    };
    return bar;
}

function giftLine(pk) {
    return {
        pk: pk,
        quantity: 1,
        unitPriceExclTax: 0,
        linePriceExclTax: 0,
        linePriceExclTaxInclDiscounts: 0,
        isUpsell: true,
        attributes: [],
        product: { pk: Number(GIFT_PRODUCT_ID), title: 'Free gift', url: '/gift', metadata: {} }
    };
}

function regularLine(pk, price) {
    return {
        pk: pk,
        quantity: 1,
        unitPriceExclTax: price,
        linePriceExclTax: price,
        linePriceExclTaxInclDiscounts: price,
        isUpsell: false,
        attributes: [],
        product: { pk: 10, title: 'Product', url: '/product', metadata: {} }
    };
}

function createCart(id, total, lines) {
    return {
        id: id,
        currency: 'USD',
        numItems: lines.length,
        totalExclTax: total,
        totalExclTaxExclDiscounts: total,
        totalDiscount: 0,
        offerDiscounts: [],
        voucherDiscounts: [],
        lines: lines
    };
}

function createEnvironment() {
    const registry = {};
    const document = new FakeElement('document');
    document.body = new FakeElement('body');
    document.createElement = function(tagName) {
        const element = new FakeElement(tagName);
        if (tagName === 'template') {
            element.content = { cloneNode: function() { return new FakeElement('fragment'); } };
        }
        return element;
    };
    document.createDocumentFragment = function() { return new FakeElement('fragment'); };
    document.getElementById = function() { return null; };

    const calls = [];
    const responders = { addToCart: [], removeCartLines: [], updateCartLines: [] };

    function respond(method, args) {
        calls.push({ method: method, args: args });
        const next = responders[method].shift();
        if (typeof next === 'function') return next.apply(null, args);
        if (next) return Promise.resolve(next);
        return Promise.resolve({ success: true, cart: null });
    }

    function FakeCartClient() {}
    FakeCartClient.prototype.getCart = function() { return Promise.resolve(null); };
    FakeCartClient.prototype.addToCart = function() {
        return respond('addToCart', Array.prototype.slice.call(arguments));
    };
    FakeCartClient.prototype.removeCartLines = function() {
        return respond('removeCartLines', Array.prototype.slice.call(arguments));
    };
    FakeCartClient.prototype.updateCartLines = function() {
        return respond('updateCartLines', Array.prototype.slice.call(arguments));
    };
    FakeCartClient.formatMoney = function(amount, currency) {
        return (currency === 'USD' ? '$' : currency + ' ') + Number(amount).toFixed(2);
    };
    FakeCartClient.MAX_QTY_PER_LINE = 15;

    const context = {
        console: console,
        document: document,
        HTMLElement: FakeElement,
        SparkCartClient: FakeCartClient,
        customElements: {
            define: function(name, constructor) { registry[name] = constructor; },
            get: function(name) { return registry[name]; }
        },
        CustomEvent: function CustomEvent(type, init) {
            this.type = type;
            this.detail = init && init.detail;
        },
        setTimeout: function(callback) { callback(); return 1; },
        clearTimeout: function() {},
        Promise: Promise
    };
    context.window = context;
    for (const script of [EVENTS_SCRIPT, REWARDS_SCRIPT, RENDERER_SCRIPT, DRAWER_SCRIPT]) {
        vm.runInNewContext(fs.readFileSync(script, 'utf8'), context, { filename: script });
    }
    return {
        context: context,
        document: document,
        Drawer: registry['spark-cart-drawer'],
        calls: calls,
        responders: responders
    };
}

function createDrawer(env) {
    const drawer = new env.Drawer();
    drawer.queries['spark-progress-bar'] = createProgressBar(env.document);
    drawer.connectedCallback();
    return drawer;
}

function callsFor(env, method) {
    return env.calls.filter(function(call) { return call.method === method; });
}

function flush() {
    return new Promise(function(resolve) { setImmediate(resolve); });
}

function updateCart(env, cart) {
    env.context.SparkEvents.cartUpdated(cart, 'update');
}

/* Race 1: a snapshot that crosses the gift threshold and ALREADY contains
   the gift must not trigger a second add. The progress bar emits
   gift-reached synchronously during render, before the old code updated
   its containsGift bookkeeping. */
async function testNoDuplicateGiftAddWhenSnapshotAlreadyContainsGift() {
    const env = createEnvironment();
    createDrawer(env);
    updateCart(env, createCart('a', 60, [regularLine('r1', 60), giftLine('g1')]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 0,
        'gift already in cart: crossing the threshold must not add a duplicate');
}

/* Race 2a: gift disappears between two snapshots that both sit ABOVE the
   threshold. No edge event fires, so edge-driven code never repairs it. */
async function testExternalGiftRemovalAboveThresholdIsRepaired() {
    const env = createEnvironment();
    createDrawer(env);
    env.responders.addToCart.push({ success: true, cart: createCart('b', 60, [regularLine('r1', 60), giftLine('g1')]) });
    updateCart(env, createCart('a', 60, [regularLine('r1', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 1, 'initial eligible cart auto-adds the gift');

    // External integration removed the gift; total stays above the threshold
    updateCart(env, createCart('c', 60, [regularLine('r1', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 2,
        'gift lost between same-side snapshots must be re-added');
}

/* Race 2b: a below-threshold snapshot containing a gift, arriving while the
   bar is already below the threshold, produces no edge and the gift was
   never removed. */
async function testGiftBelowThresholdWithoutEdgeIsRemoved() {
    const env = createEnvironment();
    createDrawer(env);
    updateCart(env, createCart('a', 20, [regularLine('r1', 20)]));
    await flush();
    assert.equal(callsFor(env, 'removeCartLines').length, 0);

    // Stale/server-provided snapshot still below threshold but carrying a gift
    env.responders.removeCartLines.push({ success: true, cart: createCart('c', 20, [regularLine('r1', 20)]) });
    updateCart(env, createCart('b', 20, [regularLine('r1', 20), giftLine('g1')]));
    await flush();
    const removals = callsFor(env, 'removeCartLines');
    assert.equal(removals.length, 1, 'ineligible gift must be removed without waiting for an edge');
    assert.equal(removals[0].args[1].join(','), 'g1');
}

/* Race 3: a newer cart snapshot arrives while a gift mutation is in flight.
   The stale mutation result must not overwrite the newer snapshot. */
async function testStaleGiftMutationResultIsDropped() {
    const env = createEnvironment();
    const drawer = createDrawer(env);

    let resolveAdd;
    env.responders.addToCart.push(function() {
        return new Promise(function(resolve) { resolveAdd = resolve; });
    });

    updateCart(env, createCart('a', 60, [regularLine('r1', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 1, 'eligible cart starts a gift add');

    // Before the add resolves, the shopper empties down below the threshold
    updateCart(env, createCart('d', 20, [regularLine('r2', 20)]));
    await flush();

    // The delayed add now resolves with a stale cart snapshot
    resolveAdd({ success: true, cart: createCart('stale', 60, [regularLine('r1', 60), giftLine('g1')]) });
    await flush();

    assert.equal(drawer._cart.id, 'd',
        'stale gift mutation result must not overwrite the newer cart snapshot');
}

/* Race 4: emptying the cart must reset gift bookkeeping so a later eligible
   cart is not suppressed by stale flags. */
async function testEmptyCartResetsGiftTracking() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    updateCart(env, createCart('a', 60, [regularLine('r1', 60), giftLine('g1')]));
    await flush();

    updateCart(env, createCart('empty', 0, []));
    await flush();
    assert.equal(drawer._isCartContainsGift, false, 'empty render must clear containsGift');
    assert.equal(drawer._giftLineId, null, 'empty render must clear the gift line id');

    env.responders.addToCart.push({ success: true, cart: createCart('c', 60, [regularLine('r3', 60), giftLine('g2')]) });
    updateCart(env, createCart('b', 60, [regularLine('r3', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 1,
        'eligible cart after an empty must auto-add the gift again');
}

/* Product guard: a gift the shopper explicitly removed in the drawer must
   not be forced back while they stay above the threshold; dropping below
   the threshold resets the offer. */
async function testShopperDeclinedGiftIsNotReAdded() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    env.responders.addToCart.push({ success: true, cart: createCart('b', 60, [regularLine('r1', 60), giftLine('g1')]) });
    updateCart(env, createCart('a', 60, [regularLine('r1', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 1);

    // Shopper explicitly removes the gift line in the drawer UI
    env.responders.removeCartLines.push({ success: true, cart: createCart('c', 60, [regularLine('r1', 60)]) });
    drawer._handleRemoveByLineId('g1', null);
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 1,
        'declined gift must not be re-added while still above the threshold');

    // Dropping below the threshold resets the offer...
    updateCart(env, createCart('d', 20, [regularLine('r2', 20)]));
    await flush();

    // ...so crossing it again re-adds the gift
    env.responders.addToCart.push({ success: true, cart: createCart('f', 60, [regularLine('r2', 60), giftLine('g2')]) });
    updateCart(env, createCart('e', 60, [regularLine('r2', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 2,
        're-crossing the threshold after a decline must offer the gift again');
}

/* findGiftLine returns only the first matching line, so duplicate gift lines
   must converge through successive reconcile passes. */
async function testDuplicateGiftLinesConverge() {
    const env = createEnvironment();
    createDrawer(env);
    updateCart(env, createCart('a', 20, [regularLine('r1', 20)]));
    await flush();

    env.responders.removeCartLines.push({ success: true, cart: createCart('c', 20, [regularLine('r1', 20), giftLine('g2')]) });
    env.responders.removeCartLines.push({ success: true, cart: createCart('d', 20, [regularLine('r1', 20)]) });
    updateCart(env, createCart('b', 20, [regularLine('r1', 20), giftLine('g1'), giftLine('g2')]));
    await flush();
    await flush();

    const removals = callsFor(env, 'removeCartLines');
    assert.equal(removals.length, 2, 'both duplicate gift lines must be removed');
    assert.equal(removals[0].args[1].join(','), 'g1');
    assert.equal(removals[1].args[1].join(','), 'g2');
}

/* The auto-mutation cap is per external snapshot, not per session: transient
   API failures must not permanently disable gift auto-management. */
async function testAttemptCapResetsOnExternalSnapshot() {
    const env = createEnvironment();
    createDrawer(env);
    const failure = function() { return Promise.reject(new Error('transient')); };
    env.responders.addToCart.push(failure, failure, failure);

    updateCart(env, createCart('a', 60, [regularLine('r1', 60)]));
    await flush();
    updateCart(env, createCart('b', 60, [regularLine('r1', 60)]));
    await flush();
    updateCart(env, createCart('c', 60, [regularLine('r1', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 3, 'each external snapshot retries the add');

    // API recovered: the next external snapshot must still auto-add
    env.responders.addToCart.push({ success: true, cart: createCart('e', 60, [regularLine('r1', 60), giftLine('g1')]) });
    updateCart(env, createCart('d', 60, [regularLine('r1', 60)]));
    await flush();
    assert.equal(callsFor(env, 'addToCart').length, 4,
        'a recovered API must resume gift auto-management');
}

/* Anti-storm guard: mutation-produced snapshots must NOT reset the attempt
   cap, or an API that accepts the add but drops the gift line would be
   mutated forever. */
async function testNonConvergingSnapshotsAreCapped() {
    const env = createEnvironment();
    createDrawer(env);
    // Every add "succeeds" but the returned cart never contains the gift
    for (let i = 0; i < 10; i++) {
        env.responders.addToCart.push({ success: true, cart: createCart('x' + i, 60, [regularLine('r1', 60)]) });
    }
    updateCart(env, createCart('a', 60, [regularLine('r1', 60)]));
    await flush();
    await flush();
    await flush();
    const adds = callsFor(env, 'addToCart').length;
    assert.ok(adds <= 3, 'non-converging snapshot must stop mutating at the cap, got ' + adds);
}

const tests = [
    ['no duplicate gift add when snapshot already contains gift', testNoDuplicateGiftAddWhenSnapshotAlreadyContainsGift],
    ['external gift removal above threshold is repaired', testExternalGiftRemovalAboveThresholdIsRepaired],
    ['gift below threshold without edge is removed', testGiftBelowThresholdWithoutEdgeIsRemoved],
    ['stale gift mutation result is dropped', testStaleGiftMutationResultIsDropped],
    ['empty cart resets gift tracking', testEmptyCartResetsGiftTracking],
    ['shopper-declined gift is not re-added', testShopperDeclinedGiftIsNotReAdded],
    ['duplicate gift lines converge', testDuplicateGiftLinesConverge],
    ['attempt cap resets on external snapshot', testAttemptCapResetsOnExternalSnapshot],
    ['non-converging snapshots are capped', testNonConvergingSnapshotsAreCapped]
];

(async function main() {
    for (const test of tests) {
        await test[1]();
        console.log('ok - ' + test[0]);
    }
    console.log(tests.length + ' spark cart drawer gift tests passed');
})().catch(function(error) {
    console.error('not ok - ' + error.stack);
    process.exitCode = 1;
});
