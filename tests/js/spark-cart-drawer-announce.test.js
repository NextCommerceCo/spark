const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const DRAWER_SCRIPT = path.join(ROOT, 'assets', 'js', 'components', 'spark-cart-drawer.js');
const SHADOW_SELECTORS = [
    '.spark-drawer-backdrop',
    '.spark-drawer-panel',
    '.spark-drawer-header-title',
    '.spark-drawer-body',
    '.spark-drawer-footer',
    '.spark-drawer-close',
    '.spark-drawer-announcement'
];

class FakeClassList {
    add() {}
    remove() {}
    contains() { return false; }
}

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName || '';
        this.attributes = {};
        this.children = [];
        this.classList = new FakeClassList();
        this.listeners = {};
        this.queries = {};
        this.style = { display: '' };
        this.textContent = '';
        this._innerHTML = '';
    }

    set innerHTML(value) {
        this._innerHTML = String(value);
        if (this.tagName === 'template') this.templateMarkup = this._innerHTML;
    }

    get innerHTML() { return this._innerHTML; }

    setAttribute(name, value) { this.attributes[name] = String(value); }

    getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    }

    removeAttribute(name) { delete this.attributes[name]; }

    appendChild(child) {
        this.children.push(child);
        if (this.tagName === 'shadow-root' && child.templateMarkup) {
            for (const selector of SHADOW_SELECTORS) {
                const className = selector.slice(1);
                const element = new FakeElement('div');
                const tagPattern = new RegExp('<[^>]*class="[^"]*' + className + '[^"]*"[^>]*>');
                const tag = child.templateMarkup.match(tagPattern);
                if (tag) {
                    const live = tag[0].match(/aria-live="([^"]+)"/);
                    const role = tag[0].match(/role="([^"]+)"/);
                    if (live) element.setAttribute('aria-live', live[1]);
                    if (role) element.setAttribute('role', role[1]);
                }
                this.queries[selector] = element;
            }
        }
        return child;
    }

    addEventListener(name, callback) {
        if (!this.listeners[name]) this.listeners[name] = [];
        this.listeners[name].push(callback);
    }

    dispatchEvent(event) {
        for (const callback of (this.listeners[event.type] || []).slice()) callback(event);
        return true;
    }

    removeEventListener() {}

    querySelector(selector) { return this.queries[selector] || null; }
    querySelectorAll() { return []; }

    attachShadow() {
        this.shadowRoot = new FakeElement('shadow-root');
        return this.shadowRoot;
    }
}

function createEnvironment() {
    const registry = {};
    const document = new FakeElement('document');
    document.body = new FakeElement('body');
    document.getElementById = function() { return null; };
    document.createElement = function(tagName) {
        const element = new FakeElement(tagName);
        if (tagName === 'template') {
            element.content = {
                cloneNode: function() {
                    const fragment = new FakeElement('fragment');
                    fragment.templateMarkup = element.templateMarkup;
                    return fragment;
                }
            };
        }
        return element;
    };

    const timers = [];
    const context = {
        console: console,
        document: document,
        HTMLElement: FakeElement,
        customElements: {
            define: function(name, constructor) { registry[name] = constructor; },
            get: function(name) { return registry[name]; }
        },
        setTimeout: function(callback) {
            const timer = { callback: callback };
            timers.push(timer);
            return timer;
        },
        clearTimeout: function(timer) { if (timer) timer.callback = null; },
        Promise: Promise
    };
    context.window = context;
    vm.runInNewContext(fs.readFileSync(DRAWER_SCRIPT, 'utf8'), context, { filename: DRAWER_SCRIPT });
    function flushTimers() {
        while (timers.length) {
            const timer = timers.shift();
            if (timer.callback) timer.callback();
        }
    }
    return { document: document, Drawer: registry['spark-cart-drawer'], flushTimers: flushTimers };
}

function createDrawer(env) {
    const drawer = new env.Drawer();
    drawer.connectedCallback();
    return drawer;
}

async function testRemoveAnnouncement() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    env.document.dispatchEvent({ type: 'spark:cart:updated', detail: { action: 'remove' } });
    env.flushTimers();
    assert.match(drawer._announcementEl.textContent, /Item removed from cart\./);
}

async function testUpdateAnnouncement() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    env.document.dispatchEvent({ type: 'spark:cart:updated', detail: { action: 'update' } });
    env.flushTimers();
    assert.match(drawer._announcementEl.textContent, /Cart quantity updated\./);
}

async function testRepeatedAnnouncementClearsBeforeReset() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    env.document.dispatchEvent({ type: 'spark:cart:updated', detail: { action: 'remove' } });
    env.flushTimers();
    assert.match(drawer._announcementEl.textContent, /Item removed from cart\./);
    // Same message again: region must be cleared synchronously and only
    // repopulated in a later task, so screen readers re-announce it
    env.document.dispatchEvent({ type: 'spark:cart:updated', detail: { action: 'remove' } });
    assert.equal(drawer._announcementEl.textContent, '');
    env.flushTimers();
    assert.match(drawer._announcementEl.textContent, /Item removed from cart\./);
}

async function testLiveRegionAttributes() {
    const drawer = createDrawer(createEnvironment());
    assert.equal(drawer._announcementEl.getAttribute('aria-live'), 'polite');
    assert.equal(drawer._announcementEl.getAttribute('role'), 'status');
}

async function testAddDoesNotAnnounceRemoval() {
    const env = createEnvironment();
    const drawer = createDrawer(env);
    env.document.dispatchEvent({ type: 'spark:cart:updated', detail: { action: 'remove' } });
    env.document.dispatchEvent({ type: 'spark:cart:updated', detail: { action: 'add' } });
    assert.doesNotMatch(drawer._announcementEl.textContent, /Item removed from cart\./);
}

const tests = [
    ['remove announces item removal', testRemoveAnnouncement],
    ['update announces quantity change', testUpdateAnnouncement],
    ['repeated announcement clears before reset', testRepeatedAnnouncementClearsBeforeReset],
    ['live region is polite status', testLiveRegionAttributes],
    ['add does not announce removal', testAddDoesNotAnnounceRemoval]
];

(async function main() {
    for (const test of tests) {
        await test[1]();
        console.log('ok - ' + test[0]);
    }
    console.log(tests.length + ' spark cart drawer announcement tests passed');
})().catch(function(error) {
    console.error('not ok - ' + error.stack);
    process.exitCode = 1;
});
