const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASE_TEMPLATE = path.join(ROOT, 'layouts', 'base.html');
const SOURCE_CSS = path.join(ROOT, 'css', 'input.css');
const COMPILED_CSS = path.join(ROOT, 'assets', 'main.css');

const template = fs.readFileSync(BASE_TEMPLATE, 'utf8');
const sourceCss = fs.readFileSync(SOURCE_CSS, 'utf8');
const compiledCss = fs.readFileSync(COMPILED_CSS, 'utf8');

function testSkipLinkIsFirstFocusableBodyContent() {
    const bodyStart = template.indexOf('<body');
    const bodyOpenEnd = template.indexOf('>', bodyStart) + 1;
    const layoutBlock = template.indexOf('{% block layout %}', bodyOpenEnd);
    const skipLinkPattern = /<a\b(?=[^>]*\bhref=["']#main-content["'])(?=[^>]*\bclass=["'][^"']*\bskip-to-content\b[^"']*["'])[^>]*>/i;
    const bodyContent = template.slice(bodyOpenEnd);
    const skipMatch = skipLinkPattern.exec(bodyContent);

    assert.notEqual(bodyStart, -1, 'base template should contain a body element');
    assert.ok(skipMatch, 'body should contain a skip-to-content anchor targeting #main-content');

    const skipLinkIndex = bodyOpenEnd + skipMatch.index;
    assert.ok(skipLinkIndex < layoutBlock, 'skip link should appear before the layout block');

    const contentBeforeSkipLink = template.slice(bodyOpenEnd, skipLinkIndex);
    const focusablePattern = /<(?:a\b[^>]*\bhref\s*=|button\b|input\b|select\b|textarea\b)|\btabindex\s*=\s*["'](?!-1["'])/i;
    assert.equal(
        focusablePattern.test(contentBeforeSkipLink),
        false,
        'skip link should be the first focusable element inside body'
    );
}

function testMainContentTarget() {
    const mainPattern = /<main\b(?=[^>]*\bid=["']main-content["'])(?=[^>]*\btabindex=["']-1["'])[^>]*>/i;
    assert.match(template, mainPattern, 'main should be the focusable #main-content target');
}

function testSkipLinkStylesAndCompiledDriftGuard() {
    assert.match(sourceCss, /\.skip-to-content\s*\{[^}]+\}/s, 'source CSS should style the skip link');
    assert.match(
        sourceCss,
        /\.skip-to-content:(?:focus|focus-visible)\s*\{[^}]+\}/s,
        'source CSS should reveal the skip link on focus'
    );
    assert.match(compiledCss, /\.skip-to-content\b/, 'compiled CSS should include the skip link component');
}

const tests = [
    ['skip link is first focusable body content', testSkipLinkIsFirstFocusableBodyContent],
    ['main content target is focusable', testMainContentTarget],
    ['skip link source and compiled styles stay in sync', testSkipLinkStylesAndCompiledDriftGuard]
];

for (const test of tests) {
    test[1]();
    console.log('ok - ' + test[0]);
}
console.log(tests.length + ' skip-to-content tests passed');
