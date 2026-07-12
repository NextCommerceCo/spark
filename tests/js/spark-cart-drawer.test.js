const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const EVENTS_SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-events.js');
const REWARDS_SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-cart-rewards.js');
const RENDERER_SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-cart-drawer-renderer.js');
const DRAWER_SCRIPT = path.join(ROOT, 'assets', 'js', 'components', 'spark-cart-drawer.js');
const FABRICATED_SHADOW_SELECTORS = [
    '.spark-drawer-backdrop',
    '.spark-drawer-panel',
    '.spark-drawer-header-title',
    '.spark-drawer-body',
    '.spark-drawer-footer',
    '.spark-drawer-close'
];

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
        for (const selector of FABRICATED_SHADOW_SELECTORS) {
            root.queries[selector] = new FakeElement('div');
        }
        root.queries['.spark-drawer-close'].focus = function() { this.focused = true; };
        this.shadowRoot = root;
        return root;
    }
}

function allMarkup(element) {
    let markup = element.innerHTML || '';
    for (const child of element.children) markup += allMarkup(child);
    return markup;
}

function createCart(id, title) {
    return {
        id: id,
        currency: 'USD',
        numItems: 1,
        totalExclTax: 12,
        totalExclTaxExclDiscounts: 12,
        totalDiscount: 0,
        offerDiscounts: [],
        voucherDiscounts: [],
        lines: [{
            pk: 'line-' + id,
            quantity: 1,
            unitPriceExclTax: 12,
            linePriceExclTax: 12,
            linePriceExclTaxInclDiscounts: 12,
            isUpsell: false,
            attributes: [],
            product: { pk: 10, title: title, url: '/product', metadata: {} }
        }]
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

    function FakeCartClient() {}
    FakeCartClient.prototype.getCart = function() { return Promise.resolve(null); };
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
    return { context: context, document: document, Drawer: registry['spark-cart-drawer'] };
}

function createDrawer(env) {
    const drawer = new env.Drawer();
    drawer.connectedCallback();
    return drawer;
}

async function testOpenAndCloseVisibleState() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    drawer._cart = createCart('one', 'First product');

    env.context.SparkSideCart.open();
    assert.equal(drawer.getAttribute('data-open'), 'true');
    assert.equal(drawer.getAttribute('aria-expanded'), 'true');
    assert.equal(env.document.body.classList.contains('sidecart-open'), true);

    env.context.SparkSideCart.close();
    assert.equal(drawer.getAttribute('data-open'), 'false');
    assert.equal(drawer.getAttribute('aria-expanded'), 'false');
    assert.equal(env.document.body.classList.contains('sidecart-open'), false);
}

async function testCartUpdatedEventRerendersContents() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    env.context.SparkEvents.cartUpdated(createCart('one', 'First product'), 'update');
    assert.match(allMarkup(drawer._body), /First product/);

    env.context.SparkEvents.cartUpdated(createCart('two', 'Replacement product'), 'update');
    const markup = allMarkup(drawer._body);
    assert.match(markup, /Replacement product/);
    assert.doesNotMatch(markup, /First product/);
    assert.equal(drawer._footer.style.display, '');
}

async function testEmptyCartRendersEmptyState() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    env.context.SparkEvents.cartUpdated({
        id: 'empty', currency: 'USD', numItems: 0, totalExclTax: 0, lines: []
    }, 'update');

    assert.match(drawer._body.innerHTML, /spark-drawer-empty/);
    assert.match(drawer._body.innerHTML, /Your cart is empty/);
    assert.equal(drawer._footer.style.display, 'none');
}

async function testFabricatedShadowNodesMatchSourceTemplate() {
    const source = fs.readFileSync(DRAWER_SCRIPT, 'utf8');
    const templateStart = source.indexOf('template.innerHTML =');
    const classStart = source.indexOf('class SparkCartDrawerEl', templateStart);
    assert.notEqual(templateStart, -1);
    assert.notEqual(classStart, -1);
    const templateSource = source.slice(templateStart, classStart);

    for (const selector of FABRICATED_SHADOW_SELECTORS) {
        const className = selector.slice(1);
        const classAttribute = new RegExp('class="[^"]*' + className + '(?:\\s|\\")');
        assert.match(templateSource, classAttribute, selector + ' must remain in the real drawer template');
    }
}

const tests = [
    ['open and close visible state', testOpenAndCloseVisibleState],
    ['cart updated event rerenders contents', testCartUpdatedEventRerendersContents],
    ['empty cart renders empty state', testEmptyCartRendersEmptyState],
    ['fabricated shadow nodes match source template', testFabricatedShadowNodesMatchSourceTemplate]
];

(async function main() {
    for (const test of tests) {
        await test[1]();
        console.log('ok - ' + test[0]);
    }
    console.log(tests.length + ' spark cart drawer tests passed');
})().catch(function(error) {
    console.error('not ok - ' + error.stack);
    process.exitCode = 1;
});
