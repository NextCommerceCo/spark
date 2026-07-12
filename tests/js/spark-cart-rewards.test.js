const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-cart-rewards.js');

function loadModule() {
    const context = { window: {}, Promise: Promise };
    vm.runInNewContext(fs.readFileSync(SCRIPT, 'utf8'), context, { filename: SCRIPT });
    return context.window.SparkCartRewards;
}

function keys(value) {
    return Object.keys(value).sort();
}

function upsell(slot, productId, fallbackSlots) {
    const attributes = {
        'data-upsell-slot': slot,
        'data-product-id': productId,
        'data-fallback-slots': fallbackSlots
    };
    return {
        style: { display: 'unset' },
        getAttribute: function(name) {
            return attributes[name] || null;
        }
    };
}

async function testMetadataAndSlots() {
    const rewards = loadModule();
    const object = { cart_upsell_slots: '1' };
    assert.equal(rewards.parseMetadata(object), object);
    assert.deepEqual(keys(rewards.parseMetadata('{"cart_upsell_slots":"1, 2"}')), ['cart_upsell_slots']);
    assert.deepEqual(keys(rewards.parseMetadata('{bad json')), []);
    assert.deepEqual(keys(rewards.splitSlots(' 1, 2, ,3 ')), ['1', '2', '3']);
}

async function testCartProductIdsAndActiveSlots() {
    const rewards = loadModule();
    const cart = { lines: [
        { product: { pk: 10, metadata: '{"cart_upsell_slots":"1, 3"}', parent: { pk: 100 } } },
        { product: { pk: 20, metadata: null, parent: { pk: 200, metadata: { cart_upsell_slots: '2' } } } },
        { product: null }
    ] };
    assert.deepEqual(keys(rewards.productIdsInCart(cart)), ['10', '100', '20', '200']);
    assert.deepEqual(keys(rewards.activeUpsellSlots(cart)), ['1', '2', '3']);
}

async function testGiftLookupAndStateTransitions() {
    const rewards = loadModule();
    const absent = { id: 'cart-1', lines: [
        { pk: 'normal-gift', isUpsell: false, product: { pk: 99 } },
        { pk: 'other-upsell', isUpsell: true, product: { pk: 100 } }
    ] };
    assert.equal(rewards.findGiftLine(absent, '99'), null);
    assert.equal(rewards.giftState(absent, 99).containsGift, false);

    const present = { id: 'cart-1', lines: absent.lines.concat([
        { pk: 'gift-line', isUpsell: true, product: { pk: 99 } }
    ]) };
    assert.equal(rewards.findGiftLine(present, '99').pk, 'gift-line');
    assert.equal(rewards.giftState(present, 99).lineId, 'gift-line');

    const removed = { id: 'cart-1', lines: absent.lines };
    assert.equal(rewards.giftState(removed, 99).containsGift, false);
}

async function testToggleGiftPathsAndNoOps() {
    const rewards = loadModule();
    const calls = [];
    const client = {
        addToCart: function() {
            calls.push(['add'].concat(Array.from(arguments)));
            return Promise.resolve('added');
        },
        removeCartLines: function() {
            calls.push(['remove'].concat(Array.from(arguments)));
            return Promise.resolve('removed');
        }
    };
    const cart = { id: 'cart-1', lines: [] };

    assert.equal(await rewards.toggleGift(client, cart, true, '99', null), 'added');
    assert.equal(await rewards.toggleGift(client, cart, false, '99', 'gift-line'), 'removed');
    assert.equal(await rewards.toggleGift(client, cart, false, '99', null), null);
    assert.equal(await rewards.toggleGift(null, cart, true, '99', null), null);
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
        ['add', 99, 1, true],
        ['remove', 'cart-1', ['gift-line']]
    ]);
}

async function testUpsellVisibilityAndFallbackSlots() {
    const rewards = loadModule();
    const slotOne = upsell('1', '501', '1,2');
    const slotTwo = upsell('2', '502', '1,2');
    const slotThree = upsell('3', '503', '1,2');
    const alreadyInCart = upsell('1', '10', '1,2');
    const root = {
        querySelectorAll: function() {
            return [slotOne, slotTwo, slotThree, alreadyInCart];
        }
    };

    rewards.updateUpsellVisibility(root, { lines: [{
        product: { pk: 10, metadata: { cart_upsell_slots: '2' } }
    }] });
    assert.deepEqual([slotOne.style.display, slotTwo.style.display, slotThree.style.display, alreadyInCart.style.display],
        ['none', '', 'none', 'none']);

    rewards.updateUpsellVisibility(root, { lines: [{ product: { pk: 11, metadata: {} } }] });
    assert.deepEqual([slotOne.style.display, slotTwo.style.display, slotThree.style.display], ['', '', 'none']);
}

const tests = [
    ['metadata and slots', testMetadataAndSlots],
    ['cart product ids and active slots', testCartProductIdsAndActiveSlots],
    ['gift lookup and state transitions', testGiftLookupAndStateTransitions],
    ['toggle gift paths and no-ops', testToggleGiftPathsAndNoOps],
    ['upsell visibility and fallback slots', testUpsellVisibilityAndFallbackSlots]
];

(async function main() {
    for (const test of tests) {
        await test[1]();
        console.log('ok - ' + test[0]);
    }
    console.log(tests.length + ' spark cart rewards tests passed');
})().catch(function(error) {
    console.error('not ok - ' + error.stack);
    process.exitCode = 1;
});
