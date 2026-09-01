/** Spark catalogue filter drawer and supplemental mobile filter bar. */
(function(root) {
    'use strict';

    var FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function toArray(collection) {
        return Array.prototype.slice.call(collection || []);
    }

    function visibleFocusable(container) {
        if (!container) return [];
        return toArray(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(function(element) {
            return element.offsetWidth > 0 || element.offsetHeight > 0;
        });
    }

    function setBarVisibility(bar, visible) {
        if (!bar) return;
        bar.classList.toggle('catalogue-bar-visible', visible);
        bar.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (visible) {
            bar.removeAttribute('inert');
        } else {
            bar.setAttribute('inert', '');
        }
    }

    function shouldShowBar(rect, viewportHeight) {
        return !!rect && rect.top < 0 && rect.bottom > viewportHeight;
    }

    function initCatalogueBar(doc, win) {
        var bar = doc.getElementById('catalogue-bar');
        var grid = doc.getElementById('product-grid');
        if (!bar) return null;

        setBarVisibility(bar, false);
        if (!grid) return { check: function() { return false; } };

        function check() {
            var visible = shouldShowBar(grid.getBoundingClientRect(), win.innerHeight);
            setBarVisibility(bar, visible);
            return visible;
        }

        win.addEventListener('scroll', check, { passive: true });
        win.addEventListener('resize', check, { passive: true });
        check();
        return { check: check };
    }

    function initFilterDrawer(doc) {
        var drawer = doc.getElementById('filter-drawer');
        if (!drawer) return null;

        var panel = drawer.querySelector('.filter-drawer-panel');
        var closeButton = drawer.querySelector('.filter-drawer-close');
        var toggles = toArray(doc.querySelectorAll('[data-toggle="filter-drawer"]'));
        var previousOverflow = '';
        var lastFocused = null;
        var open = false;

        function setExpanded(value) {
            toggles.forEach(function(button) {
                button.setAttribute('aria-expanded', value);
            });
        }

        function openDrawer() {
            if (open) return;
            open = true;
            lastFocused = doc.activeElement;
            previousOverflow = doc.body.style.overflow;
            drawer.removeAttribute('inert');
            drawer.classList.add('filter-drawer-visible');
            drawer.setAttribute('aria-hidden', 'false');
            setExpanded('true');
            doc.body.style.overflow = 'hidden';
            if (closeButton) closeButton.focus();
        }

        function closeDrawer() {
            if (!open) return;
            open = false;
            drawer.classList.remove('filter-drawer-visible');
            drawer.setAttribute('aria-hidden', 'true');
            drawer.setAttribute('inert', '');
            setExpanded('false');
            doc.body.style.overflow = previousOverflow;
            if (lastFocused && lastFocused.focus) lastFocused.focus();
        }

        toggles.forEach(function(button) {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                if (open) closeDrawer(); else openDrawer();
            });
        });

        toArray(drawer.querySelectorAll('[data-close="filter-drawer"]')).forEach(function(element) {
            element.addEventListener('click', closeDrawer);
        });

        doc.addEventListener('keydown', function(event) {
            if (!open) return;
            if (event.key === 'Escape') {
                closeDrawer();
                return;
            }
            if (event.key !== 'Tab') return;

            var items = visibleFocusable(panel);
            if (!items.length) return;
            var first = items[0];
            var last = items[items.length - 1];

            if (event.shiftKey && doc.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && doc.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        return {
            close: closeDrawer,
            isOpen: function() { return open; }
        };
    }

    function updateFilterCount(doc) {
        var badges = toArray(doc.querySelectorAll('[data-filter-count]'));
        if (!badges.length) return 0;

        var form = doc.getElementById('drawerFilters') || doc.getElementById('productFilters');
        var count = 0;
        if (form) {
            count += form.querySelectorAll('input[type="checkbox"]:checked').length;
            toArray(form.querySelectorAll('input[type="number"]')).forEach(function(input) {
                if (input.value !== '') count += 1;
            });
        }

        badges.forEach(function(badge) {
            badge.textContent = count > 0 ? String(count) : '';
            badge.hidden = count === 0;
        });
        return count;
    }

    function init(doc, win) {
        return {
            drawer: initFilterDrawer(doc),
            bar: initCatalogueBar(doc, win),
            activeFilterCount: updateFilterCount(doc)
        };
    }

    var api = {
        init: init,
        initCatalogueBar: initCatalogueBar,
        initFilterDrawer: initFilterDrawer,
        setBarVisibility: setBarVisibility,
        shouldShowBar: shouldShowBar,
        updateFilterCount: updateFilterCount,
        visibleFocusable: visibleFocusable
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.SparkCatalogue = api;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                init(document, root);
            }, { once: true });
        } else {
            init(document, root);
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
