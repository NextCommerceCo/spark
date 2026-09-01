const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'assets', 'js', 'spark-variant-state.js');
const THEME_SCRIPT = path.join(ROOT, 'assets', 'js', 'theme.js');
const PARTIAL = fs.readFileSync(path.join(ROOT, 'partials', 'variant_picker.html'), 'utf8');
const PRODUCT = fs.readFileSync(path.join(ROOT, 'templates', 'catalogue', 'product.html'), 'utf8');
const THEME = fs.readFileSync(THEME_SCRIPT, 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'css', 'input.css'), 'utf8');
const SETTINGS_SCHEMA = fs.readFileSync(path.join(ROOT, 'configs', 'settings_schema.json'), 'utf8');

function loadModule() {
    const context = { window: {}, document: { getElementById: () => null } };
    vm.runInNewContext(fs.readFileSync(SCRIPT, 'utf8'), context, { filename: SCRIPT });
    return context.window.SparkVariantState;
}

function loadThemeModule() {
    const context = {
        console,
        URL,
        location: { href: 'https://shop.example/products/sheets' },
        document: {
            addEventListener: () => {},
            querySelectorAll: () => []
        }
    };
    context.window = context;
    vm.runInNewContext(THEME, context, { filename: THEME_SCRIPT });
    return context.theme;
}

function child(id, attributes, available) {
    return {
        id: id,
        variant_attribute_values: attributes,
        purchase_info: { availability: available ? 'instock' : 'outofstock' }
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

function stateFor(selection, product) {
    const SparkVariantState = loadModule();
    const state = new SparkVariantState({
        product: product || PRODUCT_DATA,
        root: { querySelectorAll: () => [] }
    });
    state.getSelection = () => selection;
    return { SparkVariantState, state };
}

function testMissingCombinationIsExplicitlyUnavailable() {
    const sparseProduct = {
        children: [
            child(201, [{ code: 'size', id: 1 }, { code: 'colour', id: 10 }], true),
            child(202, [{ code: 'size', id: 2 }, { code: 'colour', id: 10 }], true),
            child(203, [{ code: 'size', id: 1 }, { code: 'colour', id: 11 }], true)
        ]
    };
    const { state } = stateFor({ attr_colour: 11 }, sparseProduct);
    const availability = state.getOptionAvailability();

    assert.equal(availability.attr_size[1], true);
    assert.equal(availability.attr_size[2], false);
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

function testSizeGuideUrlSafety() {
    const theme = loadThemeModule();
    const normalize = theme.product.normalizeSizeGuideUrl;

    assert.equal(normalize('/pages/size-guide'), '/pages/size-guide');
    assert.equal(normalize('#size-guide'), '#size-guide');
    assert.equal(normalize('guides/size'), 'guides/size');
    assert.equal(normalize('https://example.com/size'), 'https://example.com/size');
    assert.equal(normalize('HTTP://example.com/size'), 'HTTP://example.com/size');
    assert.equal(normalize('javascript:alert(1)'), null);
    assert.equal(normalize('java\nscript:alert(1)'), null);
    assert.equal(normalize('data:text/html,unsafe'), null);
    assert.equal(normalize('//example.com/size'), null);
    assert.equal(normalize('\\\\example.com\\size'), null);
}

function testAccessibilityAndContrastContracts() {
    assert.match(PARTIAL, /aria-describedby="{{ field\.html_name }}-{{ choice\.0 }}-availability"/);
    assert.match(PARTIAL, /data-variant-option-status/);
    assert.match(THEME, /status\.textContent = theme\.product\.messages\.unavailable/);
    assert.doesNotMatch(PARTIAL + THEME, /aria-disabled/);

    assert.match(
        CSS,
        /\[data-light-primary\] \.variant-option input:checked \+ \.variant-option-label\s*{[^}]*color:\s*#1E293B;/s
    );
    assert.match(
        CSS,
        /data-variant-unavailable="true"\]\s+input:not\(:checked\) \+ \.variant-option-label/,
        'unavailable styling must not override selected-chip contrast'
    );
    assert.match(
        CSS,
        /\[data-light-primary\] \.variant-option input:checked \+ \.variant-option-label::after/,
        'the unavailable strike remains visible on light merchant colors'
    );
}

function testSizeGuideUrlIsInertUntilValidated() {
    assert.match(PARTIAL, /data-variant-size-guide-url="{{ settings\.variant_size_guide_url }}"/);
    assert.doesNotMatch(PARTIAL, /href="{{ settings\.variant_size_guide_url }}"/);
}

function testImageSwatchExpansionIsAbsent() {
    const focusedCore = [
        fs.readFileSync(SCRIPT, 'utf8'),
        THEME,
        PARTIAL,
        CSS,
        SETTINGS_SCHEMA
    ].join('\n');

    assert.doesNotMatch(
        focusedCore,
        /variant_swatch_options|getVariantForOption|data-variant-swatch|variant-option-label--swatch/
    );
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
    assert.match(
        PARTIAL,
        /settings\.variant_size_guide_option == option_code/,
        'size-guide scoping compares the exact bare attribute code'
    );
}

testAvailabilityDependsOnTheRestOfTheSelection();
testMissingCombinationIsExplicitlyUnavailable();
testAvailabilityIgnoresUnselectedGroups();
testAvailabilityIsEmptyWithoutProductData();
testSizeGuideUrlSafety();
testAccessibilityAndContrastContracts();
testSizeGuideUrlIsInertUntilValidated();
testImageSwatchExpansionIsAbsent();
testPickerContractIsPreserved();

console.log('variant option tests passed');
