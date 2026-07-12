const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASE_TEMPLATE = path.join(ROOT, 'layouts', 'base.html');
const ACCOUNT_ONLY_PARTIAL = path.join(ROOT, 'partials', 'account_only.html');
const SOURCE_CSS = path.join(ROOT, 'css', 'input.css');
const COMPILED_CSS = path.join(ROOT, 'assets', 'main.css');

const template = fs.readFileSync(BASE_TEMPLATE, 'utf8');
const accountOnlyPartial = fs.readFileSync(ACCOUNT_ONLY_PARTIAL, 'utf8');
const sourceCss = fs.readFileSync(SOURCE_CSS, 'utf8');
const compiledCss = fs.readFileSync(COMPILED_CSS, 'utf8');

function listHtmlFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return listHtmlFiles(entryPath);
        }

        return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    });
}

function getCompiledRule(selector) {
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;

    for (const match of compiledCss.matchAll(rulePattern)) {
        const selectors = match[1].split(',').map((candidate) => candidate.trim());

        if (selectors.includes(selector)) {
            return match[2];
        }
    }

    assert.fail('compiled CSS should include the ' + selector + ' rule');
}

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

function testEveryRenderedMainIsATarget() {
    const templateDirectories = ['templates', 'layouts'].map((directory) => path.join(ROOT, directory));
    const templateFiles = templateDirectories.flatMap(listHtmlFiles);
    const mainPattern = /<main\b[^>]*>/gi;
    const targetIdPattern = /\bid=["']main-content["']/i;
    const focusTargetPattern = /\btabindex=["']-1["']/i;

    for (const templateFile of templateFiles) {
        const contents = fs.readFileSync(templateFile, 'utf8');
        const mainElements = contents.match(mainPattern) || [];
        const relativePath = path.relative(ROOT, templateFile);

        for (const mainElement of mainElements) {
            assert.match(mainElement, targetIdPattern, relativePath + ' main should have id="main-content"');
            assert.match(mainElement, focusTargetPattern, relativePath + ' main should have tabindex="-1"');
        }
    }
}

function testAccountOnlyBranchHasOneFocusableTarget() {
    const targetIdPattern = /\bid=["']main-content["']/gi;
    const outerContainerPattern = /<div\b(?=[^>]*\bid=["']main-content["'])(?=[^>]*\btabindex=["']-1["'])[^>]*>/i;
    const targets = accountOnlyPartial.match(targetIdPattern) || [];

    assert.equal(targets.length, 1, 'account-only branch should contain exactly one #main-content target');
    assert.match(
        accountOnlyPartial,
        outerContainerPattern,
        'account-only outer container should be the focusable #main-content target'
    );
}

function testSkipLinkStylesAndCompiledDriftGuard() {
    assert.match(sourceCss, /\.skip-to-content\s*\{[^}]+\}/s, 'source CSS should style the skip link');
    assert.match(
        sourceCss,
        /\.skip-to-content:(?:focus|focus-visible)\s*\{[^}]+\}/s,
        'source CSS should reveal the skip link on focus'
    );
    const hiddenRule = getCompiledRule('.skip-to-content');
    const focusRule = getCompiledRule('.skip-to-content:focus');

    assert.match(hiddenRule, /(?:^|;)clip:rect\(0,\s*0,\s*0,\s*0\)(?:;|$)/, 'compiled skip link should be clipped');
    assert.match(hiddenRule, /(?:^|;)width:1px(?:;|$)/, 'compiled skip link should have a 1px width');
    assert.match(hiddenRule, /(?:^|;)height:1px(?:;|$)/, 'compiled skip link should have a 1px height');
    assert.match(hiddenRule, /(?:^|;)overflow:hidden(?:;|$)/, 'compiled skip link should hide overflow');
    assert.match(focusRule, /(?:^|;)clip:auto(?:;|$)/, 'compiled focused skip link should remove clipping');
    assert.match(focusRule, /(?:^|;)width:auto(?:;|$)/, 'compiled focused skip link should restore auto width');
    assert.match(focusRule, /(?:^|;)height:auto(?:;|$)/, 'compiled focused skip link should restore auto height');
    assert.match(focusRule, /(?:^|;)overflow:visible(?:;|$)/, 'compiled focused skip link should reveal overflow');
}

const tests = [
    ['skip link is first focusable body content', testSkipLinkIsFirstFocusableBodyContent],
    ['main content target is focusable', testMainContentTarget],
    ['every rendered main is a focusable target', testEveryRenderedMainIsATarget],
    ['account-only branch has one focusable target', testAccountOnlyBranchHasOneFocusableTarget],
    ['skip link source and compiled styles stay in sync', testSkipLinkStylesAndCompiledDriftGuard]
];

for (const test of tests) {
    test[1]();
    console.log('ok - ' + test[0]);
}
console.log(tests.length + ' skip-to-content tests passed');
