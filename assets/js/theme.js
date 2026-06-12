/**
 * Spark Theme — Core JavaScript
 * No jQuery, no frameworks. Self-contained vanilla JS.
 */

(function() {
    'use strict';

    /* ─── Mobile Navigation ─── */

    function initMobileNav() {
        const toggleBtn = document.querySelector('[data-toggle="mobile-nav"]');
        const mobileNav = document.getElementById('mobile-nav');
        const desktopNavQuery = window.matchMedia('(min-width: 48rem)');
        var mobileNavPreviousOverflow = '';
        var mobileNavLockedBody = false;
        if (!toggleBtn || !mobileNav) return;

        function isBodyLockedByOtherOverlay() {
            var searchOverlay = document.getElementById('search-overlay');
            return (
                document.body.classList.contains('sidecart-open') ||
                (searchOverlay && searchOverlay.classList.contains('search-overlay-visible'))
            );
        }

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
            if (mobileNavLockedBody && !isBodyLockedByOtherOverlay()) {
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

    /* ─── Search Overlay ─── */

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

    /* ─── Side Cart ─── */

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

    /* ─── Product Variant & Cart ─── */

    window.theme = window.theme || {};
    theme.product = {
        productObject: null,
        variantState: null,
        messages: {
            addToCart: 'Add to cart',
            unavailable: 'Unavailable'
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

    /* ─── Announcement Bar Dismiss ─── */

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

    /* ─── Reduced Motion ─── */

    function respectReducedMotion() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--default-transition-duration', '0ms');
        }
    }

    /* ─── Init ─── */

    document.addEventListener('DOMContentLoaded', function() {
        initMobileNav();
        initSearchOverlay();
        initSideCart();
        initVariantPicker();
        initAnnouncementBar();
        respectReducedMotion();
    });

})();
