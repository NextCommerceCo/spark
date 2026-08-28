/**
 * Spark Theme - Core JavaScript
 * No jQuery, no frameworks. Self-contained vanilla JS.
 */

(function() {
    'use strict';

    /* Mobile Navigation */

    const DESKTOP_NAV_MEDIA_QUERY = '(min-width: 48rem)';

    function initMobileNav() {
        const toggleBtn = document.querySelector('[data-toggle="mobile-nav"]');
        const mobileNav = document.getElementById('mobile-nav');
        const desktopNavQuery = window.matchMedia(DESKTOP_NAV_MEDIA_QUERY);
        var mobileNavPreviousOverflow = '';
        var mobileNavLockedBody = false;
        if (!toggleBtn || !mobileNav) return;

        function openMobileNav() {
            mobileNav.classList.remove('hidden');
            if (!mobileNavLockedBody) {
                mobileNavPreviousOverflow = document.body.style.overflow;
                mobileNavLockedBody = true;
            }
            document.body.style.overflow = 'hidden';
        }

        function closeMobileNav() {
            mobileNav.classList.add('hidden');
            // Restore the inline overflow value that existed before mobile nav opened.
            if (mobileNavLockedBody) {
                document.body.style.overflow = mobileNavPreviousOverflow;
            }
            mobileNavLockedBody = false;
        }

        toggleBtn.addEventListener('click', function() {
            if (mobileNav.classList.contains('hidden')) {
                openMobileNav();
            } else {
                closeMobileNav();
            }
        });

        // Close buttons and backdrop
        mobileNav.querySelectorAll('[data-close="mobile-nav"]').forEach(function(el) {
            el.addEventListener('click', closeMobileNav);
        });

        function handleDesktopNavChange(e) {
            if (e.matches) {
                closeMobileNav();
            }
        }

        if (desktopNavQuery.addEventListener) {
            desktopNavQuery.addEventListener('change', handleDesktopNavChange);
        } else {
            desktopNavQuery.addListener(handleDesktopNavChange);
        }
    }

    /* Search Overlay */

    function initSearchOverlay() {
        var overlay = document.getElementById('search-overlay');
        var input = document.getElementById('search-input');
        if (!overlay) return;

        function openSearch() {
            overlay.classList.add('search-overlay-visible');
            document.body.style.overflow = 'hidden';
            if (input) {
                setTimeout(function() { input.focus(); }, 150);
            }
        }

        function closeSearch() {
            overlay.classList.remove('search-overlay-visible');
            document.body.style.overflow = '';
        }

        // Open button
        document.querySelectorAll('[data-toggle="search-overlay"]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                openSearch();
            });
        });

        // Close buttons and backdrop
        overlay.querySelectorAll('[data-close="search-overlay"]').forEach(function(el) {
            el.addEventListener('click', function() {
                closeSearch();
            });
        });

        // Escape key closes search
        overlay.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeSearch();
            }
        });
    }

    /* Side Cart */

    function initSideCart() {
        // Cart icon click dispatches toggle event (handled in side_cart.html)
        document.querySelectorAll('[data-toggle="side-cart"]').forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.SparkEvents) {
                    SparkEvents.cartToggle();
                } else {
                    document.dispatchEvent(new CustomEvent('spark:cart:toggle'));
                }
            });
        });
    }

    /* Product Variant & Cart */

    window.theme = window.theme || {};
    theme.product = {
        productObject: null,
        variantState: null,
        messages: {
            addToCart: window.SparkI18n && window.SparkI18n.addToCart ? window.SparkI18n.addToCart : 'Add to cart',
            unavailable: window.SparkI18n && window.SparkI18n.unavailable ? window.SparkI18n.unavailable : 'Unavailable'
        },
        init: function(options) {
            options = options || {};
            theme.product.messages.addToCart = options.add_to_cart_msg || theme.product.messages.addToCart;
            theme.product.messages.unavailable = options.unavailable_msg || theme.product.messages.unavailable;
            if (typeof SparkVariantState === 'undefined') return;

            var state = SparkVariantState.fromPage();
            if (!state) return;
            theme.product.variantState = state;
            theme.product.productObject = state.product;

            var initialVariant = state.getSelectedVariant() || state.getDefaultVariant();
            if (initialVariant) {
                theme.product.updateForm(initialVariant);
                theme.product.updatePrice(initialVariant);
                state.emitChange(initialVariant);
            }

            state.onChange(function(variant) {
                theme.product.updateForm(variant);
                theme.product.updatePrice(variant);
            });
        },
        getVariantFromSelection: function() {
            return theme.product.variantState ? theme.product.variantState.getSelectedVariant() : null;
        },
        updateForm: function(variant) {
            var form = document.getElementById('add-to-cart');
            if (!form || !variant) return;
            SparkVariantState.updateFormAction(form, variant);

            var btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            if (!SparkVariantState.isPurchasable(variant)) {
                btn.disabled = true;
                btn.textContent = btn.getAttribute('data-disabled-text') || theme.product.messages.unavailable;
            } else {
                btn.disabled = false;
                btn.textContent = theme.product.messages.addToCart;
            }
        },
        updatePrice: function(variant) {
            if (typeof SparkVariantState === 'undefined') return;
            SparkVariantState.updatePrice(document, variant);
        }
    };

    function initVariantPicker() {
        // Visual styling for variant labels
        document.querySelectorAll('input[name^="attr_"]').forEach(function(input) {
            input.addEventListener('change', function() {
                var name = input.name;
                document.querySelectorAll('input[name="' + name + '"]').forEach(function(sibling) {
                    var label = sibling.closest('label');
                    if (label) {
                        label.classList.remove('border-slate-800');
                        label.classList.add('border-slate-200');
                    }
                });
                var selectedLabel = input.closest('label');
                if (selectedLabel) {
                    selectedLabel.classList.remove('border-slate-200');
                    selectedLabel.classList.add('border-slate-800');
                }
            });
        });
    }

    /* Announcement Bar Dismiss */

    function initAnnouncementBar() {
        var dismissBtn = document.querySelector('[data-dismiss="announcement-bar"]');
        if (!dismissBtn) return;

        dismissBtn.addEventListener('click', function() {
            var bar = document.getElementById('announcement-bar');
            if (bar) {
                bar.style.display = 'none';
                try {
                    sessionStorage.setItem('spark_ab_dismissed', '1');
                } catch(e) {}
            }
        });

        // Restore dismissed state
        try {
            if (sessionStorage.getItem('spark_ab_dismissed') === '1') {
                var bar = document.getElementById('announcement-bar');
                if (bar) bar.style.display = 'none';
            }
        } catch(e) {}
    }

    /* Catalogue Filters And Sort */

    var FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function visibleFocusable(root) {
        return Array.prototype.filter.call(
            root.querySelectorAll(FOCUSABLE_SELECTOR),
            function(el) {
                return el.offsetWidth > 0 || el.offsetHeight > 0;
            }
        );
    }

    /* Filter drawer. Same data-toggle/data-close convention as the mobile nav
       and search overlay, plus a focus trap because the drawer is modal. */
    function initFilterDrawer() {
        var drawer = document.getElementById('filter-drawer');
        if (!drawer) return null;

        var panel = drawer.querySelector('.filter-drawer-panel');
        var closeBtn = drawer.querySelector('.filter-drawer-close');
        var toggles = document.querySelectorAll('[data-toggle="filter-drawer"]');
        var previousOverflow = '';
        var lastFocused = null;
        var isOpen = false;

        function setExpanded(value) {
            Array.prototype.forEach.call(toggles, function(btn) {
                btn.setAttribute('aria-expanded', value);
            });
        }

        function openDrawer() {
            if (isOpen) return;
            isOpen = true;
            lastFocused = document.activeElement;
            previousOverflow = document.body.style.overflow;
            drawer.classList.add('filter-drawer-visible');
            drawer.setAttribute('aria-hidden', 'false');
            setExpanded('true');
            document.body.style.overflow = 'hidden';
            if (closeBtn) {
                setTimeout(function() { closeBtn.focus(); }, 50);
            }
        }

        function closeDrawer() {
            if (!isOpen) return;
            isOpen = false;
            drawer.classList.remove('filter-drawer-visible');
            drawer.setAttribute('aria-hidden', 'true');
            setExpanded('false');
            document.body.style.overflow = previousOverflow;
            if (lastFocused && lastFocused.focus) {
                lastFocused.focus();
            }
        }

        Array.prototype.forEach.call(toggles, function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                if (isOpen) {
                    closeDrawer();
                } else {
                    openDrawer();
                }
            });
        });

        drawer.querySelectorAll('[data-close="filter-drawer"]').forEach(function(el) {
            el.addEventListener('click', closeDrawer);
        });

        document.addEventListener('keydown', function(e) {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                closeDrawer();
                return;
            }
            if (e.key !== 'Tab' || !panel) return;

            var items = visibleFocusable(panel);
            if (!items.length) return;
            var first = items[0];
            var last = items[items.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        return { close: closeDrawer };
    }

    /* Active filter count on the sticky bar. Read from the rendered form,
       which the view has already marked up with the applied filters. */
    function updateFilterCount() {
        var badges = document.querySelectorAll('[data-filter-count]');
        if (!badges.length) return;

        var form = document.getElementById('drawerFilters')
            || document.getElementById('productFilters');
        var count = 0;

        if (form) {
            count += form.querySelectorAll('input[type="checkbox"]:checked').length;
            Array.prototype.forEach.call(
                form.querySelectorAll('input[type="number"]'),
                function(input) {
                    if (input.value !== '') count += 1;
                }
            );
        }

        Array.prototype.forEach.call(badges, function(badge) {
            badge.textContent = count > 0 ? String(count) : '';
            badge.hidden = count === 0;
        });
    }

    /* Sticky bar. Same show/hide mechanics as the PDP sticky add-to-cart bar:
       slide in once the grid has scrolled under the header, and slide back out
       before the end of the grid so the bar never covers pagination or the
       footer. */
    function initCatalogueBar() {
        var bar = document.getElementById('catalogue-bar');
        var grid = document.getElementById('product-grid');
        if (!bar || !grid) return;

        var showing = false;

        function checkScroll() {
            var rect = grid.getBoundingClientRect();
            var shouldShow = rect.top < 0 && rect.bottom > window.innerHeight;
            if (shouldShow === showing) return;
            showing = shouldShow;
            bar.classList.toggle('catalogue-bar-visible', shouldShow);
            bar.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        }

        window.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll, { passive: true });
        checkScroll();
    }

    /* Catalogue sort.

       The platform catalogue view takes no ordering parameter, so `sort_by` is
       a theme-level contract: the select submits it into the URL and this
       reorders the rendered cards. It can only order the products the view put
       on the current page. Off by default (Theme Settings > Catalogue).
       See docs/catalogue-filters-and-sort.md. */
    function cardSortKeys(card, index) {
        var priceEl = card.querySelector('[data-base-price]');
        var raw = priceEl ? parseFloat(priceEl.getAttribute('data-base-price')) : NaN;
        return {
            card: card,
            index: index,
            price: isNaN(raw) ? null : raw,
            title: (card.getAttribute('data-sort-title') || '').trim().toLowerCase()
        };
    }

    function comparePrice(direction) {
        return function(a, b) {
            // Cards without a price keep their original position at the end.
            if (a.price === null && b.price === null) return a.index - b.index;
            if (a.price === null) return 1;
            if (b.price === null) return -1;
            if (a.price === b.price) return a.index - b.index;
            return direction * (a.price - b.price);
        };
    }

    function compareTitle(a, b) {
        var result = a.title.localeCompare(b.title);
        return result === 0 ? a.index - b.index : result;
    }

    function currentSort() {
        if (typeof URLSearchParams === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('sort_by');
    }

    /* The server renders the selected option, but catalogue pages are
       full-page cached, so re-assert it from the URL the browser actually
       has. */
    function syncCatalogueSortControls() {
        var sort = currentSort() || '';
        document.querySelectorAll('[data-catalogue-sort]').forEach(function(select) {
            if (select.value !== sort) select.value = sort;
        });
    }

    function applyCatalogueSort() {
        var grid = document.getElementById('product-grid');
        if (!grid) return;

        var sort = currentSort();
        var comparators = {
            'price-asc': comparePrice(1),
            'price-desc': comparePrice(-1),
            'title-asc': compareTitle
        };
        var comparator = comparators[sort];
        if (!comparator) return;

        var entries = Array.prototype.map.call(grid.children, cardSortKeys);
        entries.sort(comparator);

        var fragment = document.createDocumentFragment();
        entries.forEach(function(entry) { fragment.appendChild(entry.card); });
        grid.appendChild(fragment);
    }

    function initCatalogueSortForms() {
        document.querySelectorAll('[data-catalogue-sort]').forEach(function(select) {
            select.addEventListener('change', function() {
                if (select.form) select.form.submit();
            });
        });
    }

    function initCatalogue() {
        initFilterDrawer();
        updateFilterCount();
        initCatalogueBar();
        initCatalogueSortForms();
        syncCatalogueSortControls();
        applyCatalogueSort();
    }

    /* Reduced Motion */

    function respectReducedMotion() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--default-transition-duration', '0ms');
        }
    }

    /* Init */

    document.addEventListener('DOMContentLoaded', function() {
        initMobileNav();
        initSearchOverlay();
        initSideCart();
        initVariantPicker();
        initAnnouncementBar();
        initCatalogue();
        respectReducedMotion();
    });

})();
