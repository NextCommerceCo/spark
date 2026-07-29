'use strict';

const assert = require('node:assert/strict');
const preview = require('../../assets/js/spark-preview.js');

function fakeDocument(cookie) {
    const appended = [];
    return {
        cookie,
        appended,
        body: { appendChild(node) { appended.push(node); } },
        getElementById() { return null; },
        createElement(tagName) {
            return {
                tagName,
                children: [],
                attributes: {},
                appendChild(node) { this.children.push(node); },
                setAttribute(name, value) { this.attributes[name] = value; }
            };
        }
    };
}

assert.equal(preview.readPreviewTheme('session=x; preview_theme=42'), '42');
assert.equal(preview.readPreviewTheme('preview_theme=%3Cscript%3E'), null);
assert.equal(
    preview.buildExitPreviewUrl({
        pathname: '/products/widget/',
        search: '?preview_theme=theme_42&variant=blue',
        hash: '#reviews'
    }),
    '/products/widget/?variant=blue&deactivate-theme=true#reviews'
);

const ordinary = fakeDocument('session=abc');
assert.equal(preview.initPreviewIndicator(ordinary), null);
assert.equal(ordinary.appended.length, 0);

const active = fakeDocument('preview_theme=theme_42');
const indicator = preview.initPreviewIndicator(active, {
    pathname: '/products/widget/',
    search: '?preview_theme=theme_42&variant=blue',
    hash: '#reviews'
});
assert.equal(active.appended.length, 1);
assert.equal(indicator.attributes.role, 'status');
assert.equal(indicator.attributes['aria-live'], 'polite');
assert.equal(indicator.children[0].textContent, 'Previewing theme theme_42');
assert.equal(
    indicator.children[1].href,
    '/products/widget/?variant=blue&deactivate-theme=true#reviews'
);
assert.equal(indicator.children[1].textContent, 'Exit preview');

console.log('spark-preview tests passed');
