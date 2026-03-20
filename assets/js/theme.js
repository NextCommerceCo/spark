/**
 * Spark Theme — Core JavaScript
 * No jQuery, no frameworks. Self-contained vanilla JS.
 */

(function() {
    'use strict';

    /* ─── Mobile Navigation ─── */

    function initMobileNav() {
        var toggleBtn = document.querySelector('[data-toggle="mobile-nav"]');
        var mobileNav = document.getElementById('mobile-nav');
        if (!toggleBtn || !mobileNav) return;

        toggleBtn.addEventListener('click', function() {
            mobileNav.classList.toggle('hidden');
            document.body.style.overflow = mobileNav.classList.contains('hidden') ? '' : 'hidden';
        });

        // Close buttons and backdrop
        mobileNav.querySelectorAll('[data-close="mobile-nav"]').forEach(function(el) {
            el.addEventListener('click', function() {
                mobileNav.classList.add('hidden');
                document.body.style.overflow = '';
            });
        });
    }

    /* ─── Search Overlay ─── */

    function initSearchOverlay() {
        var toggleBtn = document.querySelector('[data-toggle="search-overlay"]');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', function() {
            // Placeholder: open search overlay or redirect to search page
            window.location.href = '/search/';
        });
    }

    /* ─── Side Cart ─── */

    function initSideCart() {
        var cartModal = document.getElementById('cart-modal');
        if (!cartModal) return;

        document.querySelectorAll('[data-toggle="side-cart"]').forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                cartModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            });
        });

        cartModal.querySelectorAll('[data-close="side-cart"]').forEach(function(el) {
            el.addEventListener('click', function() {
                cartModal.classList.add('hidden');
                document.body.style.overflow = '';
            });
        });
    }

    /* ─── Product Variant & Cart ─── */

    window.theme = window.theme || {};
    theme.product = {
        productObject: null,
        init: function(options) {
            options = options || {};
            var dataEl = document.getElementById('product-data');
            if (!dataEl) return;
            try {
                theme.product.productObject = JSON.parse(dataEl.textContent);
            } catch(e) { return; }

            var prod = theme.product.productObject;

            // If parent with children, auto-select first child and update form
            if (prod.structure === 'parent' && prod.children && prod.children.length) {
                var firstChild = prod.children[0];
                theme.product.updateForm(firstChild);
            }

            // Listen for variant attribute changes
            var variantInputs = document.querySelectorAll('input[name^="attr_"]');
            variantInputs.forEach(function(input) {
                input.addEventListener('change', function() {
                    var variant = theme.product.getVariantFromSelection();
                    if (variant) {
                        theme.product.updateForm(variant);
                        theme.product.updatePrice(variant);
                    }
                });
            });
        },
        getVariantFromSelection: function() {
            var prod = theme.product.productObject;
            if (!prod || !prod.children) return null;
            var selected = {};
            document.querySelectorAll('input[name^="attr_"]:checked').forEach(function(input) {
                selected[input.name] = parseInt(input.value);
            });
            return prod.children.find(function(child) {
                if (!child.variant_attribute_values || !child.variant_attribute_values.length) return true;
                return child.variant_attribute_values.every(function(attr) {
                    return selected['attr_' + attr.code] === attr.id;
                });
            }) || null;
        },
        updateForm: function(variant) {
            var form = document.getElementById('add-to-cart');
            if (!form || !variant) return;
            var action = form.getAttribute('action');
            var newAction = action.replace(/(cart\/add\/)\d+/, '$1' + variant.id);
            form.setAttribute('action', newAction);

            var btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            if (!variant.purchase_info || variant.purchase_info.availability === 'outofstock' || variant.purchase_info.availability === 'unavailable') {
                btn.disabled = true;
                btn.textContent = btn.getAttribute('data-disabled-text') || 'Unavailable';
            } else {
                btn.disabled = false;
                btn.textContent = btn.getAttribute('data-loading-text') ? 'Add to cart' : btn.textContent;
            }
        },
        updatePrice: function(variant) {
            if (!variant || !variant.purchase_info) return;
            var priceEl = document.querySelector('[data-price]');
            var retailEl = document.querySelector('[data-price-retail]');
            if (priceEl && variant.purchase_info.price) {
                priceEl.textContent = variant.purchase_info.price.format;
            }
            if (retailEl && variant.purchase_info.price_retail && variant.purchase_info.price_retail.price) {
                retailEl.textContent = variant.purchase_info.price_retail.format;
            }
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

