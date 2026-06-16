/**
 * Spark Membership Pricing
 *
 * Presents member pricing from logged-in customer metadata. This is display
 * logic only; checkout enforcement must come from platform pricing rules.
 */

(function() {
    'use strict';

    var config = window.SparkMembershipPricingConfig || {};
    if (!config.enabled) return;

    var QUERY_ME = 'query SparkMembershipPricingMe { me { id pk metadata } }';
    var CSRF_COOKIE = 'csrftoken';
    var state = {
        status: 'checking',
        active: false,
        user: null
    };

    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function normalize(value) {
        if (value === null || typeof value === 'undefined') return '';
        return String(value).trim().toLowerCase();
    }

    function numberFromConfig(value, fallback) {
        if (value === null || typeof value === 'undefined' || value === '') return fallback;
        var parsed = Number(value);
        return isFinite(parsed) ? parsed : fallback;
    }

    function parseAmount(value) {
        if (typeof value === 'number') return value;
        if (value === null || typeof value === 'undefined') return NaN;
        return Number(String(value).replace(/[^0-9.-]/g, ''));
    }

    function formatMoney(amount, currency) {
        currency = currency || 'USD';
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (e) {
            return currency + ' ' + Number(amount).toFixed(2);
        }
    }

    function requestMe() {
        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        var csrf = getCookie(CSRF_COOKIE);
        if (csrf) headers['X-CSRFToken'] = csrf;

        return fetch(config.graphqlUrl || '/api/graphql/', {
            method: 'POST',
            headers: headers,
            credentials: 'same-origin',
            body: JSON.stringify({ query: QUERY_ME, variables: {} })
        }).then(function(response) {
            return response.json();
        }).then(function(json) {
            if (json.errors && json.errors.length) {
                throw new Error(json.errors[0].message || 'GraphQL error');
            }
            return json.data || {};
        });
    }

    function metadataMatches(metadata) {
        metadata = metadata || {};
        var key = config.statusMetadataKey || 'uvbrite_member_status';
        var activeValue = normalize(config.activeStatusValue || 'active');
        var value = metadata[key];

        if (Array.isArray(value)) {
            return value.map(normalize).indexOf(activeValue) !== -1;
        }
        return normalize(value) === activeValue;
    }

    function setDocumentState(nextState) {
        document.documentElement.setAttribute('data-spark-membership-state', nextState.status);
        document.documentElement.classList.toggle('spark-member-active', !!nextState.active);
    }

    function dispatchState() {
        var detail = {
            status: state.status,
            active: state.active,
            user: state.user
        };
        if (window.SparkEvents) {
            SparkEvents.dispatch('spark:membership:updated', detail);
            return;
        }
        document.dispatchEvent(new CustomEvent('spark:membership:updated', {
            detail: detail,
            bubbles: true
        }));
    }

    function findMemberBlock(surface) {
        var children = surface.children || [];
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList && children[i].classList.contains('spark-member-price')) {
                return children[i];
            }
        }
        return null;
    }

    function ensureMemberBlock(surface) {
        var block = findMemberBlock(surface);
        if (block) return block;

        block = document.createElement('span');
        block.className = 'spark-member-price';

        var label = document.createElement('span');
        label.className = 'spark-member-price-label';
        block.appendChild(label);

        var value = document.createElement('span');
        value.className = 'spark-member-price-value';
        block.appendChild(value);

        var detail = document.createElement('span');
        detail.className = 'spark-member-price-detail';
        block.appendChild(detail);

        surface.appendChild(block);
        return block;
    }

    function removeMemberBlock(surface) {
        var block = findMemberBlock(surface);
        if (block) block.remove();
        surface.removeAttribute('data-membership-active');
    }

    function renderSurface(surface) {
        if (!state.active) {
            removeMemberBlock(surface);
            return;
        }

        var basePrice = parseAmount(surface.getAttribute('data-base-price'));
        if (!isFinite(basePrice)) {
            removeMemberBlock(surface);
            return;
        }

        var discountPercent = Math.min(100, Math.max(0, numberFromConfig(config.discountPercent, 25)));
        var memberPrice = basePrice * (1 - discountPercent / 100);
        var currency = surface.getAttribute('data-currency') || 'USD';
        var layout = surface.getAttribute('data-spark-membership-layout') || '';
        var block = ensureMemberBlock(surface);
        var label = block.querySelector('.spark-member-price-label');
        var value = block.querySelector('.spark-member-price-value');
        var detail = block.querySelector('.spark-member-price-detail');

        surface.setAttribute('data-membership-active', 'true');
        label.textContent = config.label || 'Member price';
        value.textContent = formatMoney(memberPrice, currency);

        if (detail) {
            if (layout === 'pdp' || layout === 'featured') {
                detail.textContent = config.detailText || '';
                detail.hidden = !detail.textContent;
            } else {
                detail.textContent = '';
                detail.hidden = true;
            }
        }
    }

    function renderAll() {
        var surfaces = document.querySelectorAll('[data-spark-membership-price]');
        for (var i = 0; i < surfaces.length; i++) {
            renderSurface(surfaces[i]);
        }
    }

    function readPriceObject(price) {
        if (!price) return null;
        return {
            amount: price.price || price.value,
            currency: price.currency,
            format: price.format
        };
    }

    function handleVariantChanged(event) {
        var variant = event && event.detail ? event.detail.variant : null;
        if (!variant || !variant.purchase_info) return;

        var price = readPriceObject(variant.purchase_info.price);
        if (!price || typeof price.amount === 'undefined') return;

        var surfaces = document.querySelectorAll('[data-spark-membership-variant-price]');
        for (var i = 0; i < surfaces.length; i++) {
            var surface = surfaces[i];
            surface.setAttribute('data-base-price', price.amount);
            if (price.currency) surface.setAttribute('data-currency', price.currency);

            var publicPrice = surface.querySelector('[data-spark-public-price]');
            if (publicPrice && price.format) {
                publicPrice.textContent = price.format;
            }
            renderSurface(surface);
        }
    }

    function refresh() {
        state = {
            status: 'checking',
            active: false,
            user: null
        };
        setDocumentState(state);

        return requestMe().then(function(data) {
            var user = data.me || null;
            state.user = user;
            state.active = !!(user && metadataMatches(user.metadata));
            state.status = user ? (state.active ? 'active' : 'inactive') : 'anonymous';
            setDocumentState(state);
            renderAll();
            dispatchState();
            return state;
        }).catch(function() {
            state = {
                status: 'error',
                active: false,
                user: null
            };
            setDocumentState(state);
            renderAll();
            dispatchState();
            return state;
        });
    }

    document.addEventListener('spark:variant:changed', handleVariantChanged);

    window.SparkMembershipPricing = {
        refresh: refresh,
        render: renderAll,
        isActive: function() {
            return !!state.active;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
    } else {
        refresh();
    }
})();
