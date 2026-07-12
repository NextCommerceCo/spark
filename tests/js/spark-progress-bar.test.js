const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const EVENTS_SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-events.js');
const PROGRESS_SCRIPT = path.join(ROOT, 'assets', 'js', 'components', 'spark-progress-bar.js');

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
}

class FakeElement {
    constructor() {
        this.attributes = {};
        this.classList = new FakeClassList();
        this.children = [];
        this.queries = {};
        this.style = {
            values: {},
            setProperty: function(name, value) {
                this.values[name] = value;
            }
        };
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
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

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    attachShadow() {
        const fill = new FakeElement();
        const root = new FakeElement();
        root.queries['.spark-progress-fill'] = fill;
        this.shadowRoot = root;
        return root;
    }
}

function threshold(value, giftId) {
    const element = new FakeElement();
    element.setAttribute('data-value', value);
    if (giftId) element.setAttribute('data-gift-id', giftId);
    return element;
}

function createEnvironment() {
    const events = [];
    const registry = {};
    const document = {
        head: new FakeElement(),
        createElement: function(tagName) {
            const element = new FakeElement();
            if (tagName === 'template') {
                element.content = { cloneNode: function() { return new FakeElement(); } };
            }
            return element;
        },
        dispatchEvent: function(event) {
            events.push(event);
            return true;
        }
    };
    const context = {
        console: console,
        document: document,
        HTMLElement: FakeElement,
        customElements: {
            define: function(name, constructor) { registry[name] = constructor; },
            get: function(name) { return registry[name]; }
        },
        CustomEvent: function CustomEvent(type, init) {
            this.type = type;
            this.detail = init && init.detail;
        },
        requestAnimationFrame: function(callback) { callback(); }
    };
    context.window = context;
    vm.runInNewContext(fs.readFileSync(EVENTS_SCRIPT, 'utf8'), context, { filename: EVENTS_SCRIPT });
    vm.runInNewContext(fs.readFileSync(PROGRESS_SCRIPT, 'utf8'), context, { filename: PROGRESS_SCRIPT });
    return { ProgressBar: registry['spark-progress-bar'], events: events };
}

function createProgressBar(env) {
    const progress = new env.ProgressBar();
    const shipping = threshold(50);
    const gift = threshold(100, 'gift-99');
    const finalGoal = new FakeElement();
    const shippingStep = threshold(50);
    const giftStep = threshold(100);
    progress.setAttribute('data-value', '0');
    progress.setAttribute('data-min', '0');
    progress.setAttribute('data-max', '100');
    progress.queries['[data-shipping]'] = shipping;
    progress.queries['[data-gift]'] = gift;
    progress.queries['[data-final-goal]'] = finalGoal;
    progress.queries['[data-step]'] = [shippingStep, giftStep];
    progress.connectedCallback();
    env.events.length = 0;
    return { progress: progress, shippingStep: shippingStep, giftStep: giftStep };
}

async function testShippingThresholdTransitionsOnce() {
    const env = createEnvironment();
    const fixture = createProgressBar(env);
    fixture.progress._update(50);
    fixture.progress._update(75);
    fixture.progress._update(10);
    fixture.progress._update(20);

    assert.deepEqual(env.events.map(function(event) { return event.type; }), [
        'spark:progress:shipping-reached',
        'spark:progress:shipping-unreached'
    ]);
}

async function testGiftThresholdTransitionsAndDetail() {
    const env = createEnvironment();
    const fixture = createProgressBar(env);
    fixture.progress._update(100);
    fixture.progress._update(100);
    fixture.progress._update(75);
    fixture.progress._update(75);

    const giftEvents = env.events.filter(function(event) {
        return event.type.indexOf('spark:progress:gift-') === 0;
    });
    assert.deepEqual(giftEvents.map(function(event) { return event.type; }), [
        'spark:progress:gift-reached',
        'spark:progress:gift-unreached'
    ]);
    assert.equal(giftEvents[0].detail.giftId, 'gift-99');
    assert.equal(giftEvents[1].detail.giftId, 'gift-99');
}

async function testStepAriaCheckedUpdates() {
    const env = createEnvironment();
    const fixture = createProgressBar(env);
    fixture.progress._update(50);
    assert.equal(fixture.shippingStep.getAttribute('aria-checked'), 'true');
    assert.equal(fixture.giftStep.getAttribute('aria-checked'), 'false');

    fixture.progress._update(100);
    assert.equal(fixture.giftStep.getAttribute('aria-checked'), 'true');

    fixture.progress._update(0);
    assert.equal(fixture.shippingStep.getAttribute('aria-checked'), 'false');
    assert.equal(fixture.giftStep.getAttribute('aria-checked'), 'false');
}

const tests = [
    ['shipping threshold transitions once', testShippingThresholdTransitionsOnce],
    ['gift threshold transitions and detail', testGiftThresholdTransitionsAndDetail],
    ['step aria-checked updates', testStepAriaCheckedUpdates]
];

(async function main() {
    for (const test of tests) {
        await test[1]();
        console.log('ok - ' + test[0]);
    }
    console.log(tests.length + ' spark progress bar tests passed');
})().catch(function(error) {
    console.error('not ok - ' + error.stack);
    process.exitCode = 1;
});
