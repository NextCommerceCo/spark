const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-membership-pricing.js');

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.nodeType = 1;
        this.attributes = {};
        this.children = [];
        this.parentNode = null;
        this.className = '';
        this.hidden = false;
        this.textContent = '';
    }

    get classList() {
        const element = this;
        return {
            contains: function(name) {
                return element.className.split(/\s+/).indexOf(name) !== -1;
            },
            toggle: function(name, force) {
                const classes = element.className ? element.className.split(/\s+/) : [];
                const index = classes.indexOf(name);
                const shouldAdd = typeof force === 'undefined' ? index === -1 : !!force;
                if (shouldAdd && index === -1) classes.push(name);
                if (!shouldAdd && index !== -1) classes.splice(index, 1);
                element.className = classes.join(' ');
            }
        };
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    remove() {
        if (!this.parentNode) return;
        const siblings = this.parentNode.children;
        const index = siblings.indexOf(this);
        if (index !== -1) siblings.splice(index, 1);
        this.parentNode = null;
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

    hasAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, name);
    }

    matches(selector) {
        if (selector === '[data-spark-membership-price]') return this.hasAttribute('data-spark-membership-price');
        if (selector[0] === '.') return this.classList.contains(selector.slice(1));
        if (/^\[.+\]$/.test(selector)) return this.hasAttribute(selector.slice(1, -1));
        return false;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const matches = [];
        const walk = function(node) {
            for (const child of node.children) {
                if (child.matches(selector)) matches.push(child);
                walk(child);
            }
        };
        walk(this);
        return matches;
    }
}

function createSurface(basePrice, options = {}) {
    const surface = new FakeElement('div');
    surface.setAttribute('data-spark-membership-price', '');
    surface.setAttribute('data-base-price', basePrice);
    surface.setAttribute('data-currency', options.currency || 'USD');
    if (options.layout) surface.setAttribute('data-spark-membership-layout', options.layout);

    const publicPrice = new FakeElement('span');
    publicPrice.setAttribute('data-spark-public-price', '');
    publicPrice.textContent = String(basePrice);
    surface.appendChild(publicPrice);
    return surface;
}

function createEnvironment(options = {}) {
    let fetchCount = 0;
    let observerCallback = null;
    const body = new FakeElement('body');
    const documentElement = new FakeElement('html');
    const metadata = options.metadata || null;

    for (const surface of options.surfaces || []) {
        body.appendChild(surface);
    }

    class FakeMutationObserver {
        constructor(callback) {
            observerCallback = callback;
        }

        observe() {}
    }

    const document = {
        readyState: options.readyState || 'loading',
        cookie: '',
        body: body,
        documentElement: documentElement,
        createElement: function(tagName) {
            return new FakeElement(tagName);
        },
        querySelector: function(selector) {
            return body.querySelector(selector);
        },
        querySelectorAll: function(selector) {
            return body.querySelectorAll(selector);
        },
        addEventListener: function() {},
        dispatchEvent: function() {}
    };

    const MutationObserver = options.withObserver ? FakeMutationObserver : undefined;
    const context = {
        console: console,
        document: document,
        fetch: function() {
            fetchCount += 1;
            return Promise.resolve({
                json: function() {
                    return Promise.resolve({
                        data: {
                            me: metadata ? { id: 'customer-1', metadata: metadata } : null
                        }
                    });
                }
            });
        },
        CustomEvent: function CustomEvent(type, eventInit) {
            this.type = type;
            this.detail = eventInit ? eventInit.detail : undefined;
        },
        Intl: Intl,
        MutationObserver: MutationObserver,
        Promise: Promise,
        window: {
            MutationObserver: MutationObserver,
            SparkMembershipPricingConfig: {
                enabled: true,
                graphqlUrl: '/api/graphql/',
                discountPercent: '25',
                statusMetadataKey: 'uvbrite_member_status',
                activeStatusValue: 'active',
                label: 'Member price',
                detailText: 'Applied at checkout'
            }
        }
    };

    return {
        body: body,
        context: context,
        getFetchCount: function() {
            return fetchCount;
        },
        getObserverCallback: function() {
            return observerCallback;
        }
    };
}

function runModule(environment) {
    const code = fs.readFileSync(SCRIPT, 'utf8');
    vm.runInNewContext(code, environment.context, { filename: SCRIPT });
    return environment.context.window.SparkMembershipPricing;
}

function memberBlock(surface) {
    return surface.querySelector('.spark-member-price');
}

async function settle() {
    await new Promise(function(resolve) {
        setImmediate(resolve);
    });
}

async function testActiveMemberPricing() {
    const surface = createSurface('$1,299.00', { layout: 'pdp' });
    const env = createEnvironment({
        metadata: { uvbrite_member_status: 'active' },
        surfaces: [surface]
    });
    const api = runModule(env);

    await api.refresh();

    assert.equal(surface.getAttribute('data-membership-active'), 'true');
    assert.equal(memberBlock(surface).querySelector('.spark-member-price-value').textContent, '$974.25');
    assert.equal(memberBlock(surface).querySelector('.spark-member-price-detail').textContent, 'Applied at checkout');
}

async function testLocalizedAmountParsingAndArrayMetadata() {
    const surface = createSurface('EUR 1.299,00', { layout: 'card' });
    const env = createEnvironment({
        metadata: { uvbrite_member_status: ['inactive', 'active'] },
        surfaces: [surface]
    });
    const api = runModule(env);

    await api.refresh();

    assert.equal(surface.getAttribute('data-membership-active'), 'true');
    assert.equal(memberBlock(surface).querySelector('.spark-member-price-value').textContent, '$974.25');
}

async function testInactiveMemberDoesNotRenderPricing() {
    const surface = createSurface('1299.00', { layout: 'pdp' });
    const env = createEnvironment({
        metadata: { uvbrite_member_status: 'inactive' },
        surfaces: [surface]
    });
    const api = runModule(env);

    await api.refresh();

    assert.equal(surface.getAttribute('data-membership-active'), null);
    assert.equal(memberBlock(surface), null);
}

async function testDynamicSurfaceTriggersRefresh() {
    const env = createEnvironment({
        metadata: { uvbrite_member_status: 'active' },
        readyState: 'complete',
        withObserver: true
    });
    runModule(env);

    assert.equal(env.getFetchCount(), 0);

    const surface = createSurface('1.299,00', { layout: 'featured' });
    env.body.appendChild(surface);
    env.getObserverCallback()([{ addedNodes: [surface] }]);
    await settle();

    assert.equal(env.getFetchCount(), 1);
    assert.equal(surface.getAttribute('data-membership-active'), 'true');
    assert.equal(memberBlock(surface).querySelector('.spark-member-price-value').textContent, '$974.25');
}

(async function main() {
    await testActiveMemberPricing();
    await testLocalizedAmountParsingAndArrayMetadata();
    await testInactiveMemberDoesNotRenderPricing();
    await testDynamicSurfaceTriggersRefresh();
})();
