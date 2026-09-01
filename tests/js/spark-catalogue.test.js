const assert = require('assert');
const fs = require('fs');
const path = require('path');

const catalogue = require('../../assets/js/spark-catalogue.js');

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(name) {
        this.values.add(name);
    }

    remove(name) {
        this.values.delete(name);
    }

    contains(name) {
        return this.values.has(name);
    }

    toggle(name, force) {
        if (force) this.add(name);
        else this.remove(name);
    }
}

class FakeElement {
    constructor(doc) {
        this.doc = doc;
        this.attributes = {};
        this.classList = new FakeClassList();
        this.listeners = {};
        this.offsetWidth = 44;
        this.offsetHeight = 44;
        this.style = {};
    }

    addEventListener(name, handler) {
        this.listeners[name] = handler;
    }

    dispatch(name, event = {}) {
        this.listeners[name](Object.assign({ preventDefault() {} }, event));
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    getAttribute(name) {
        return this.attributes[name];
    }

    focus() {
        this.doc.activeElement = this;
    }
}

function makeBarFixture(rect) {
    const listeners = {};
    const doc = { getElementById() { return null; } };
    const bar = new FakeElement(doc);
    const grid = rect && { getBoundingClientRect() { return rect.current; } };
    doc.getElementById = function(id) {
        if (id === 'catalogue-bar') return bar;
        if (id === 'product-grid') return grid;
        return null;
    };
    const win = {
        innerHeight: 800,
        addEventListener(name, handler) { listeners[name] = handler; }
    };
    return { bar, doc, listeners, win };
}

function makeDrawerFixture(scrollLock) {
    const doc = {
        activeElement: null,
        body: { style: { overflow: 'auto' } },
        listeners: {},
        addEventListener(name, handler) { this.listeners[name] = handler; }
    };
    const drawer = new FakeElement(doc);
    const panel = new FakeElement(doc);
    const closeButton = new FakeElement(doc);
    const applyButton = new FakeElement(doc);
    const backdrop = new FakeElement(doc);
    const opener = new FakeElement(doc);

    panel.querySelectorAll = function() { return [closeButton, applyButton]; };
    drawer.querySelector = function(selector) {
        if (selector === '.filter-drawer-panel') return panel;
        if (selector === '.filter-drawer-close') return closeButton;
        return null;
    };
    drawer.querySelectorAll = function(selector) {
        return selector === '[data-close="filter-drawer"]' ? [backdrop, closeButton] : [];
    };
    doc.getElementById = function(id) { return id === 'filter-drawer' ? drawer : null; };
    doc.querySelectorAll = function(selector) {
        return selector === '[data-toggle="filter-drawer"]' ? [opener] : [];
    };

    return { applyButton, backdrop, closeButton, doc, drawer, opener, scrollLock };
}

// Empty grids keep their primary inline opener, while the supplemental bar
// remains absent from the tab order.
{
    const fixture = makeBarFixture(null);
    catalogue.initCatalogueBar(fixture.doc, fixture.win);
    assert.strictEqual(fixture.bar.getAttribute('aria-hidden'), 'true');
    assert.ok(Object.prototype.hasOwnProperty.call(fixture.bar.attributes, 'inert'));
    assert.deepStrictEqual(Object.keys(fixture.listeners), []);
}

// Short grids never activate the supplemental fixed bar.
{
    const rect = { current: { top: -10, bottom: 500 } };
    const fixture = makeBarFixture(rect);
    const controller = catalogue.initCatalogueBar(fixture.doc, fixture.win);
    assert.strictEqual(controller.check(), false);
    assert.ok(Object.prototype.hasOwnProperty.call(fixture.bar.attributes, 'inert'));
}

// Long grids activate the bar only while products extend below the viewport.
{
    const rect = { current: { top: 20, bottom: 1600 } };
    const fixture = makeBarFixture(rect);
    const controller = catalogue.initCatalogueBar(fixture.doc, fixture.win);
    assert.strictEqual(controller.check(), false);
    rect.current = { top: -1, bottom: 1600 };
    assert.strictEqual(controller.check(), true);
    assert.strictEqual(fixture.bar.getAttribute('aria-hidden'), 'false');
    assert.ok(!Object.prototype.hasOwnProperty.call(fixture.bar.attributes, 'inert'));
    rect.current = { top: -1000, bottom: 700 };
    assert.strictEqual(controller.check(), false);
    assert.ok(Object.prototype.hasOwnProperty.call(fixture.bar.attributes, 'inert'));
}

// The drawer moves and traps focus, then restores focus and scroll state.
{
    const fixture = makeDrawerFixture();
    fixture.doc.activeElement = fixture.opener;
    const controller = catalogue.initFilterDrawer(fixture.doc);
    fixture.opener.dispatch('click');

    assert.strictEqual(controller.isOpen(), true);
    assert.strictEqual(fixture.drawer.getAttribute('aria-hidden'), 'false');
    assert.strictEqual(fixture.opener.getAttribute('aria-expanded'), 'true');
    assert.strictEqual(fixture.doc.body.style.overflow, 'hidden');
    assert.strictEqual(fixture.doc.activeElement, fixture.closeButton);

    fixture.doc.activeElement = fixture.applyButton;
    let prevented = false;
    fixture.doc.listeners.keydown({
        key: 'Tab',
        shiftKey: false,
        preventDefault() { prevented = true; }
    });
    assert.strictEqual(prevented, true);
    assert.strictEqual(fixture.doc.activeElement, fixture.closeButton);

    fixture.doc.activeElement = fixture.closeButton;
    prevented = false;
    fixture.doc.listeners.keydown({
        key: 'Tab',
        shiftKey: true,
        preventDefault() { prevented = true; }
    });
    assert.strictEqual(prevented, true);
    assert.strictEqual(fixture.doc.activeElement, fixture.applyButton);

    fixture.doc.listeners.keydown({ key: 'Escape' });
    assert.strictEqual(controller.isOpen(), false);
    assert.strictEqual(fixture.drawer.getAttribute('aria-hidden'), 'true');
    assert.ok(Object.prototype.hasOwnProperty.call(fixture.drawer.attributes, 'inert'));
    assert.strictEqual(fixture.opener.getAttribute('aria-expanded'), 'false');
    assert.strictEqual(fixture.doc.body.style.overflow, 'auto');
    assert.strictEqual(fixture.doc.activeElement, fixture.opener);
}

// The drawer participates in the theme-wide lock when core JavaScript is present.
{
    const calls = [];
    const scrollLock = {
        lock() { calls.push('lock'); },
        unlock() { calls.push('unlock'); }
    };
    const fixture = makeDrawerFixture(scrollLock);
    const controller = catalogue.initFilterDrawer(fixture.doc, fixture.scrollLock);
    fixture.opener.dispatch('click');
    controller.close();
    assert.deepStrictEqual(calls, ['lock', 'unlock']);
    assert.strictEqual(fixture.doc.body.style.overflow, 'auto');
}

// Template contracts cover the reachable opener and native query preservation.
{
    const root = path.resolve(__dirname, '../..');
    const category = fs.readFileSync(path.join(root, 'templates/catalogue/category.html'), 'utf8');
    const pagination = fs.readFileSync(path.join(root, 'partials/pagination.html'), 'utf8');
    const bar = fs.readFileSync(path.join(root, 'partials/catalogue_bar.html'), 'utf8');
    const drawer = fs.readFileSync(path.join(root, 'partials/catalogue_filter_drawer.html'), 'utf8');

    assert.ok(category.indexOf('catalogue-filter-inline') < category.indexOf('{% if products %}'));
    assert.ok(category.includes("'js/spark-catalogue.js'|asset_url"));
    assert.match(pagination, /add_query_param request 'page'/);
    assert.doesNotMatch(pagination, /request\.GET\.lists|pagination_query/);
    assert.match(bar, /aria-hidden="true" inert/);
    assert.match(drawer, /aria-hidden="true"[\s\S]*inert/);
}

console.log('spark-catalogue tests passed');
