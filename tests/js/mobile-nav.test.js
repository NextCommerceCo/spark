const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const HEADER = fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8');
const DRAWER = fs.readFileSync(path.join(ROOT, 'partials', 'mobile_menu.html'), 'utf8');
const BASE = fs.readFileSync(path.join(ROOT, 'layouts', 'base.html'), 'utf8');
const THEME_JS = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'theme.js'), 'utf8');

class FakeClassList {
    constructor(values) {
        this.values = values ? values.slice() : [];
    }

    add(name) {
        if (!this.contains(name)) this.values.push(name);
    }

    remove(name) {
        const index = this.values.indexOf(name);
        if (index !== -1) this.values.splice(index, 1);
    }

    contains(name) {
        return this.values.includes(name);
    }
}

class FakeElement {
    constructor(document, classes) {
        this.ownerDocument = document;
        this.classList = new FakeClassList(classes);
        this.attributes = {};
        this.listeners = {};
        this.offsetWidth = 1;
        this.offsetHeight = 1;
        this.focusCount = 0;
    }

    addEventListener(name, callback) {
        if (!this.listeners[name]) this.listeners[name] = [];
        this.listeners[name].push(callback);
    }

    dispatchEvent(event) {
        for (const callback of (this.listeners[event.type] || []).slice()) callback(event);
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name];
    }

    getClientRects() {
        return [];
    }

    focus() {
        this.focusCount += 1;
        this.ownerDocument.activeElement = this;
    }
}

function event(type, values) {
    return Object.assign({
        type: type,
        defaultPrevented: false,
        preventDefault: function() { this.defaultPrevented = true; }
    }, values || {});
}

function createEnvironment() {
    let nextTimerId = 1;
    const timers = new Map();
    const document = {
        activeElement: null,
        listeners: {},
        addEventListener: function(name, callback) {
            if (!this.listeners[name]) this.listeners[name] = [];
            this.listeners[name].push(callback);
        },
        dispatchEvent: function(dispatched) {
            for (const callback of (this.listeners[dispatched.type] || []).slice()) callback(dispatched);
        },
        querySelectorAll: function() { return []; }
    };
    document.body = new FakeElement(document);
    document.body.style = { overflow: 'scroll' };
    document.documentElement = { style: { setProperty: function() {} } };

    const toggle = new FakeElement(document);
    toggle.setAttribute('aria-expanded', 'false');
    const mobileNav = new FakeElement(document, ['hidden']);
    const panel = new FakeElement(document);
    const closeButton = new FakeElement(document);
    const lastLink = new FakeElement(document);
    const backdrop = new FakeElement(document);
    const focusable = [closeButton, lastLink];

    panel.querySelectorAll = function() { return focusable; };
    panel.contains = function(node) { return node === panel || focusable.includes(node); };
    mobileNav.querySelector = function(selector) {
        if (selector === '[data-mobile-nav-panel]') return panel;
        if (selector === '[data-close="mobile-nav"][type="button"]') return closeButton;
        return null;
    };
    mobileNav.querySelectorAll = function(selector) {
        return selector === '[data-close="mobile-nav"]' ? [backdrop, closeButton] : [];
    };
    document.querySelector = function(selector) {
        return selector === '[data-toggle="mobile-nav"]' ? toggle : null;
    };
    document.getElementById = function(id) {
        return id === 'mobile-nav' ? mobileNav : null;
    };

    const desktopMedia = {
        matches: false,
        listeners: [],
        addEventListener: function(name, callback) {
            if (name === 'change') this.listeners.push(callback);
        },
        addListener: function(callback) { this.listeners.push(callback); }
    };
    const context = {
        console: console,
        document: document,
        CustomEvent: function CustomEvent(type, init) {
            this.type = type;
            this.detail = init && init.detail;
        },
        setTimeout: function(callback) {
            const id = nextTimerId++;
            timers.set(id, callback);
            return id;
        },
        clearTimeout: function(id) { timers.delete(id); }
    };
    context.window = context;
    context.matchMedia = function(query) {
        return query === '(min-width: 48rem)' ? desktopMedia : { matches: false };
    };

    vm.runInNewContext(THEME_JS, context, { filename: 'assets/js/theme.js' });

    const delightMatch = BASE.match(/{% block delight_scripts %}[\s\S]*?<script>([\s\S]*?)<\/script>[\s\S]*?{% endblock delight_scripts %}/);
    assert.ok(delightMatch, 'base should expose the delight script block');
    vm.runInNewContext(delightMatch[1], context, { filename: 'layouts/base.html#delight_scripts' });

    document.dispatchEvent(event('DOMContentLoaded'));

    function runTimers() {
        const callbacks = Array.from(timers.values());
        timers.clear();
        for (const callback of callbacks) callback();
    }

    return {
        backdrop: backdrop,
        closeButton: closeButton,
        desktopMedia: desktopMedia,
        document: document,
        lastLink: lastLink,
        mobileNav: mobileNav,
        pendingTimers: function() { return timers.size; },
        runTimers: runTimers,
        toggle: toggle,
        window: context
    };
}

function testTemplateSeamAndHooks() {
    assert.match(HEADER, /{%\s*include\s+'partials\/mobile_menu\.html'\s*%}/);
    assert.equal(HEADER.includes('id="mobile-nav"'), false);
    assert.match(HEADER, /aria-expanded="false"/);
    assert.match(HEADER, /aria-controls="mobile-nav"/);
    assert.match(DRAWER, /id="mobile-nav"/);
    assert.match(DRAWER, /role="dialog"/);
    assert.match(DRAWER, /aria-modal="true"/);
    assert.doesNotMatch(DRAWER, /mobile_menu_products|mobile_menu_reassurance|purchase_info_for_product/);
}

function testEscapeUsesOneClosePath() {
    const env = createEnvironment();
    assert.equal(env.document.listeners.keydown.length, 1, 'only initMobileNav should own mobile-nav Escape');

    env.toggle.dispatchEvent(event('click'));
    assert.equal(env.mobileNav.classList.contains('hidden'), false);
    assert.equal(env.toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(env.document.body.style.overflow, 'hidden');
    env.runTimers();
    assert.equal(env.document.activeElement, env.closeButton);

    env.document.dispatchEvent(event('keydown', { key: 'Escape' }));
    assert.equal(env.mobileNav.classList.contains('hidden'), true);
    assert.equal(env.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(env.document.body.style.overflow, 'scroll');
    assert.equal(env.document.activeElement, env.toggle);
}

function testTabAndShiftTabStayInsidePanel() {
    const env = createEnvironment();
    env.toggle.dispatchEvent(event('click'));
    env.runTimers();

    env.document.activeElement = env.lastLink;
    const forward = event('keydown', { key: 'Tab', shiftKey: false });
    env.document.dispatchEvent(forward);
    assert.equal(forward.defaultPrevented, true);
    assert.equal(env.document.activeElement, env.closeButton);

    const backward = event('keydown', { key: 'Tab', shiftKey: true });
    env.document.dispatchEvent(backward);
    assert.equal(backward.defaultPrevented, true);
    assert.equal(env.document.activeElement, env.lastLink);
}

function testClosingCancelsDelayedFocus() {
    const env = createEnvironment();
    env.toggle.dispatchEvent(event('click'));
    assert.equal(env.pendingTimers(), 1);

    env.closeButton.dispatchEvent(event('click'));
    assert.equal(env.pendingTimers(), 0);
    assert.equal(env.document.activeElement, env.toggle);
    env.runTimers();
    assert.equal(env.document.activeElement, env.toggle, 'a stale timer must not focus the hidden close button');
}

function testDesktopBreakpointClosesSilently() {
    const env = createEnvironment();
    env.toggle.dispatchEvent(event('click'));
    env.runTimers();
    const toggleFocusCount = env.toggle.focusCount;

    env.desktopMedia.listeners[0]({ matches: true });
    assert.equal(env.mobileNav.classList.contains('hidden'), true);
    assert.equal(env.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(env.document.body.style.overflow, 'scroll');
    assert.equal(env.toggle.focusCount, toggleFocusCount, 'breakpoint closure should not steal focus');
}

function testJsAssetStaysAscii() {
    const offender = THEME_JS.split('').find((character) => character.charCodeAt(0) > 127);
    assert.equal(offender, undefined, 'theme.js must stay ASCII-only');
}

function testSharedScrollLockWaitsForEveryPanel() {
    const env = createEnvironment();
    env.window.SparkBodyScrollLock.lock();
    env.window.SparkBodyScrollLock.lock();
    assert.equal(env.document.body.style.overflow, 'hidden');
    env.window.SparkBodyScrollLock.unlock();
    assert.equal(env.document.body.style.overflow, 'hidden');
    env.window.SparkBodyScrollLock.unlock();
    assert.equal(env.document.body.style.overflow, 'scroll');
}

const tests = [
    ['template seam and hooks', testTemplateSeamAndHooks],
    ['Escape uses one close path', testEscapeUsesOneClosePath],
    ['Tab and Shift+Tab stay inside panel', testTabAndShiftTabStayInsidePanel],
    ['closing cancels delayed focus', testClosingCancelsDelayedFocus],
    ['desktop breakpoint closes silently', testDesktopBreakpointClosesSilently],
    ['shared scroll lock waits for every panel', testSharedScrollLockWaitsForEveryPanel],
    ['JavaScript asset stays ASCII', testJsAssetStaysAscii]
];

for (const test of tests) {
    test[1]();
    console.log('ok - ' + test[0]);
}
console.log(tests.length + ' mobile-nav tests passed');
