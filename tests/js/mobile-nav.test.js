const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const HEADER = fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8');
const DRAWER = fs.readFileSync(path.join(ROOT, 'partials', 'mobile_menu.html'), 'utf8');
const THEME_JS = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'theme.js'), 'utf8');

function testHeaderDelegatesToThePartial() {
    assert.match(
        HEADER,
        /{%\s*include\s+'partials\/mobile_menu\.html'\s*%}/,
        'header should include the mobile menu partial'
    );
    assert.equal(
        HEADER.includes('id="mobile-nav"'),
        false,
        'the drawer markup should live in partials/mobile_menu.html only'
    );
}

function testToggleContractIsPreserved() {
    assert.match(HEADER, /data-toggle="mobile-nav"/, 'header keeps the mobile-nav toggle hook');
    assert.match(HEADER, /aria-expanded="false"/, 'toggle exposes its expanded state');
    assert.match(HEADER, /aria-controls="mobile-nav"/, 'toggle points at the drawer it controls');

    assert.match(DRAWER, /id="mobile-nav"/, 'drawer keeps its id');
    assert.match(DRAWER, /class="hidden md:hidden fixed inset-0 z-50"/, 'drawer keeps its hidden/mobile-only shell');
    assert.match(DRAWER, /role="dialog"/, 'drawer is a dialog');
    assert.match(DRAWER, /aria-modal="true"/, 'drawer is modal');
    assert.match(DRAWER, /data-mobile-nav-panel/, 'drawer exposes the panel hook the focus trap needs');

    const closeHooks = DRAWER.match(/data-close="mobile-nav"/g) || [];
    assert.ok(closeHooks.length >= 2, 'drawer keeps both the scrim and the close-button hooks');
}

function testProductBlockDegradesWithoutConfiguration() {
    assert.match(
        DRAWER,
        /{%\s*if settings\.show_mobile_menu_products and settings\.mobile_menu_products\|length > 0\s*%}/,
        'product block renders only when it is enabled and has products'
    );
    assert.match(
        DRAWER,
        /{%\s*if settings\.show_mobile_menu_reassurance\s*%}/,
        'reassurance block renders only when it is enabled'
    );
}

function testDrawerBehaviourContract() {
    assert.match(THEME_JS, /e\.key === 'Escape'/, 'Escape closes the drawer');
    assert.match(THEME_JS, /e\.key === 'Tab'/, 'Tab is trapped inside the drawer');
    assert.match(THEME_JS, /toggleBtn\.setAttribute\('aria-expanded', 'true'\)/, 'opening updates aria-expanded');
    assert.match(THEME_JS, /toggleBtn\.setAttribute\('aria-expanded', 'false'\)/, 'closing updates aria-expanded');
    assert.match(THEME_JS, /toggleBtn\.focus\(\)/, 'closing returns focus to the toggle');
    assert.match(THEME_JS, /document\.body\.style\.overflow = 'hidden'/, 'opening locks body scroll');
}

function testJsAssetsStayAscii() {
    // The platform runs JS assets through DTL; non-ASCII bytes break the CDN.
    const offender = THEME_JS.split('').find((character) => character.charCodeAt(0) > 127);
    assert.equal(offender, undefined, 'theme.js must stay ASCII-only');
}

testHeaderDelegatesToThePartial();
testToggleContractIsPreserved();
testProductBlockDegradesWithoutConfiguration();
testDrawerBehaviourContract();
testJsAssetsStayAscii();

console.log('mobile-nav contract tests passed');
