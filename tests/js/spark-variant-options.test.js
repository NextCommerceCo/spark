const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-variant-state.js');
const PARTIAL = fs.readFileSync(path.join(ROOT, 'partials', 'variant_picker.html'), 'utf8');
const PRODUCT = fs.readFileSync(path.join(ROOT, 'templates', 'catalogue', 'product.html'), 'utf8');

function loadModule() {
    const context = { window: {}, document: { getElementById: () => null } };
    vm.runInNewContext(fs.readFileSync(SCRIPT, 'utf8'), context, { filename: SCRIPT });
    return context.window.SparkVariantState;
}

function child(id, attributes, available) {
    return {
        id: id,
        variant_attribute_values: attributes,
        purchase_info: { availability: available ? 'instock' : 'outofstock' },
        primary_image: { original: 'https://cdn.example/' + id + '.jpg' }
    };
}

// size 1|2 x colour 10|11; size 2 + colour 11 is the only sold-out combination.
const PRODUCT_DATA = {
    children: [
        child(101, [{ code: 'size', id: 1 }, { code: 'colour', id: 10 }], true),
        child(102, [{ code: 'size', id: 1 }, { code: 'colour', id: 11 }], true),
        child(103, [{ code: 'size', id: 2 }, { code: 'colour', id: 10 }], true),
        child(104, [{ code: 'size', id: 2 }, { code: 'colour', id: 11 }], false)
    ]
};

function stateFor(selection) {
    const SparkVariantState = loadModule();
    const state = new SparkVariantState({ product: PRODUCT_DATA, root: { querySelectorAll: () => [] } });
    state.getSelection = () => selection;
    return { SparkVariantState, state };
}

function testAvailabilityDependsOnTheRestOfTheSelection() {
    // Colour 10 selected: both sizes are reachable.
    let { state } = stateFor({ attr_colour: 10 });
    let availability = state.getOptionAvailability();
    assert.equal(availability.attr_size[1], true);
    assert.equal(availability.attr_size[2], true);

    // Colour 11 selected: size 2 has no purchasable child.
    ({ state } = stateFor({ attr_colour: 11 }));
    availability = state.getOptionAvailability();
    assert.equal(availability.attr_size[1], true);
    assert.equal(availability.attr_size[2], false);

    // Size 2 selected: colour 11 has no purchasable child.
    ({ state } = stateFor({ attr_size: 2 }));
    availability = state.getOptionAvailability();
    assert.equal(availability.attr_colour[10], true);
    assert.equal(availability.attr_colour[11], false);
}

function testAvailabilityIgnoresUnselectedGroups() {
    const { state } = stateFor({});
    const availability = state.getOptionAvailability();
    // With nothing pinned, every value is reachable through some child.
    assert.equal(availability.attr_size[2], true);
    assert.equal(availability.attr_colour[11], true);
}

function testAvailabilityIsEmptyWithoutProductData() {
    const SparkVariantState = loadModule();
    const state = new SparkVariantState({ product: null, root: { querySelectorAll: () => [] } });
    state.getSelection = () => ({});
    assert.deepEqual(Object.keys(state.getOptionAvailability()), []);
}

function testOptionImageLookup() {
    const { SparkVariantState, state } = stateFor({});
    const variant = state.getVariantForOption('attr_colour', 11);
    assert.equal(variant.id, 102);
    assert.equal(SparkVariantState.getVariantImageUrl(variant), 'https://cdn.example/102.jpg');
    assert.equal(state.getVariantForOption('attr_colour', 99), null);
    // The attr_ prefix is optional.
    assert.equal(state.getVariantForOption('size', 2).id, 103);
}

function testPickerContractIsPreserved() {
    assert.match(
        PRODUCT,
        /{%\s*include\s+'partials\/variant_picker\.html'\s*%}/,
        'product template should include the picker partial'
    );

    // All three styles must still emit real attr_<code> controls.
    const controlNames = PARTIAL.match(/\sname="{{ field\.html_name }}"/g) || [];
    assert.equal(controlNames.length, 3, 'select, radio and chips each emit a named control');

    const values = PARTIAL.match(/\svalue="{{ choice\.0 }}"/g) || [];
    assert.equal(values.length, 3, 'every style uses the choice value, not the label');

    assert.match(PARTIAL, /settings\.variant_picker == 'chips'/);
    assert.match(PARTIAL, /settings\.variant_picker == 'radio'/);
    // Anything that is not chips or radio falls through to the select.
    assert.match(PARTIAL, /{% else %}\s*<select name="{{ field\.html_name }}"/);
}

testAvailabilityDependsOnTheRestOfTheSelection();
testAvailabilityIgnoresUnselectedGroups();
testAvailabilityIsEmptyWithoutProductData();
testOptionImageLookup();
testPickerContractIsPreserved();

console.log('variant option tests passed');
