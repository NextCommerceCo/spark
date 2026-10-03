const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const PLATFORM_JS = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'spark-platform.js'), 'utf8');
const CART = fs.readFileSync(path.join(ROOT, 'templates', 'cart.html'), 'utf8');

class FakeElement {
    constructor(props) {
        Object.assign(this, props || {});
        this.listeners = {};
    }

    addEventListener(name, callback) {
        if (!this.listeners[name]) this.listeners[name] = [];
        this.listeners[name].push(callback);
    }

    dispatch(type, target) {
        const event = {
            type: type,
            target: target,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
        };
        for (const callback of (this.listeners[type] || []).slice()) callback(event);
        return event;
    }
}

function makeForm() {
    const form = new FakeElement({ submitCount: 0 });
    form.submit = function() { form.submitCount += 1; };
    return form;
}

function loadPlatform(form) {
    const document = new FakeElement({
        cookie: '',
        getElementById(id) { return id === 'cart_formset' ? form : null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
    });
    const context = {
        document: document,
        window: {},
        fetch() { return Promise.reject(new Error('offline')); },
        setTimeout: setTimeout,
        confirm() { return true; },
    };
    vm.runInNewContext(PLATFORM_JS, context);
    return document;
}

function removeLink(box) {
    const link = new FakeElement({
        querySelector(selector) {
            return selector === 'input[type="checkbox"]' ? box : null;
        },
    });
    link.closest = function(selector) {
        return selector === '.remove-from-cart' ? link : null;
    };
    return link;
}

// The cart template must render the hooks the handler resolves.
assert.match(CART, /id="cart_formset"/);
assert.match(CART, /class="remove-from-cart[ "]/);
assert.match(CART, /form\.DELETE/);

// A quantity change submits the formset.
{
    const form = makeForm();
    loadPlatform(form);
    form.dispatch('change', { name: 'form-0-quantity' });
    assert.equal(form.submitCount, 1);
}

// A subscription frequency change submits the formset.
{
    const form = makeForm();
    loadPlatform(form);
    form.dispatch('change', { name: 'form-2-subscription_range' });
    assert.equal(form.submitCount, 1);
}

// Other fields in the form do not submit it.
{
    const form = makeForm();
    loadPlatform(form);
    form.dispatch('change', { name: 'form-0-DELETE' });
    form.dispatch('change', { name: 'csrfmiddlewaretoken' });
    form.dispatch('change', {});
    assert.equal(form.submitCount, 0);
}

// The remove link ticks its row's DELETE checkbox and submits.
{
    const form = makeForm();
    loadPlatform(form);
    const box = { checked: false };
    const event = form.dispatch('click', removeLink(box));
    assert.equal(box.checked, true);
    assert.equal(event.defaultPrevented, true);
    assert.equal(form.submitCount, 1);
}

// A click elsewhere in the form is left alone.
{
    const form = makeForm();
    loadPlatform(form);
    const event = form.dispatch('click', { closest() { return null; } });
    assert.equal(event.defaultPrevented, false);
    assert.equal(form.submitCount, 0);
}

// A remove link without a DELETE checkbox does not submit an unchanged form.
{
    const form = makeForm();
    loadPlatform(form);
    form.dispatch('click', removeLink(null));
    assert.equal(form.submitCount, 0);
}

// Pages without the cart formset load the platform layer without error.
loadPlatform(null);

console.log('spark-cart-formset tests passed');
