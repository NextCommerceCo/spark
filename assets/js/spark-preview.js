/** Accessible preview-session indicator. Ordinary storefront visits are untouched. */
(function(root) {
    'use strict';

    function readPreviewTheme(cookie) {
        var match = String(cookie || '').match(/(?:^|;\s*)preview_theme=([^;]+)/);
        if (!match) return null;
        try {
            var value = decodeURIComponent(match[1]);
            return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
        } catch (error) {
            return null;
        }
    }

    function createPreviewIndicator(doc, themeId) {
        var existing = doc.getElementById('spark-preview-indicator');
        if (existing) return existing;

        var indicator = doc.createElement('aside');
        indicator.id = 'spark-preview-indicator';
        indicator.className = 'spark-preview-indicator';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');
        indicator.setAttribute('aria-label', 'Theme preview session');

        var message = doc.createElement('span');
        message.className = 'spark-preview-indicator__message';
        message.textContent = 'Previewing theme ' + themeId;

        var exitLink = doc.createElement('a');
        exitLink.className = 'spark-preview-indicator__exit';
        exitLink.href = '/?deactivate-theme=true';
        exitLink.textContent = 'Exit preview';

        indicator.appendChild(message);
        indicator.appendChild(exitLink);
        doc.body.appendChild(indicator);
        return indicator;
    }

    function initPreviewIndicator(doc) {
        if (!doc || !doc.body) return null;
        var themeId = readPreviewTheme(doc.cookie);
        return themeId ? createPreviewIndicator(doc, themeId) : null;
    }

    var api = {
        readPreviewTheme: readPreviewTheme,
        createPreviewIndicator: createPreviewIndicator,
        initPreviewIndicator: initPreviewIndicator
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.SparkPreview = api;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                initPreviewIndicator(document);
            }, { once: true });
        } else {
            initPreviewIndicator(document);
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
