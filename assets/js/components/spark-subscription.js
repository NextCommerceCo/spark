/**
 * <spark-subscription> Web Component
 *
 * Handles subscription options on product page:
 * - One-time purchase
 * - Subscribe with delivery frequency
 *
 * Features:
 * - Accepts intervals from backend via data-intervals
 * - Exposes .value and .intervalCount for spark-add-to-cart
 *
 * Attributes:
 *   data-intervals     JSON array of [value, text] pairs (required for subscribe)
 *   data-interval      Base interval type (e.g. "day", "month", "year")
 *
 * Public Properties:
 *   value              "one-time" or "subscribe"
 *   interval           "day" | "week" | "month" | "year"...
 *   intervalCount      Selected frequency number (e.g. 30, 60, 90)
 *
 * Events:
 *   change             Dispatched when user changes option or frequency
 *
 * Usage Example:
 *   <spark-subscription
 *       id="subscription-selector"
 *       data-interval="{{ product.get_interval }}"
 *       data-intervals='[
 *           ["30", "Every 30 days"],
 *           ["60", "Every 60 days"]
 *       ]'>
 *   </spark-subscription>
 */

(function() {
    'use strict';

    const TEMPLATE = document.createElement('template');
    TEMPLATE.innerHTML = `
        <style>
            :host { display: block; }
            .subscription-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .option {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 16px;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 150ms ease-out;
            }
            .option:hover {
                border-color: var(--primary-color, #1E293B);
                background: #F8FAFC;
            }
            .option input[type="radio"] {
                margin-top: 4px;
                accent-color: var(--primary-color, #1E293B);
            }
            .option-content { flex: 1; }
            .option-title { font-weight: 500; }
            .option-subtitle { font-size: 0.875rem; color: #64748B; margin-top: 2px; }
            .frequency {
                margin-top: 12px;
                padding: 10px 12px;
                border: 1px solid #E2E8F0;
                border-radius: 6px;
                width: 100%;
                font-size: 0.9rem;
            }
            .hidden { display: none; }
        </style>

        <div class="subscription-options">
            <label class="option">
                <input type="radio" name="subscription_option" value="one-time" checked>
                <div class="option-content">
                    <div class="option-title">One-time purchase</div>
                    <div class="option-subtitle">Buy once, no commitment</div>
                </div>
            </label>

            <label class="option">
                <input type="radio" name="subscription_option" value="subscribe">
                <div class="option-content">
                    <div class="option-title">Subscribe & Save</div>
                    <div class="option-subtitle text-emerald-600">Recurring delivery</div>
                    
                    <div id="frequency-wrapper" class="hidden mt-4">
                        <select id="interval-select" name="interval_count" class="frequency"></select>
                    </div>
                </div>
            </label>
        </div>
    `;

    class SparkSubscription extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
        }

        connectedCallback() {
            this._oneTime = this.shadowRoot.querySelector('input[value="one-time"]');
            this._subscribe = this.shadowRoot.querySelector('input[value="subscribe"]');
            this._wrapper = this.shadowRoot.getElementById('frequency-wrapper');
            this._select = this.shadowRoot.getElementById('interval-select');

            this._bindEvents();
            this._loadIntervals();
        }

        _bindEvents() {
            const update = () => this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

            this._subscribe.addEventListener('change', () => {
                this._wrapper.classList.remove('hidden');
                update();
            });

            this._oneTime.addEventListener('change', () => {
                this._wrapper.classList.add('hidden');
                update();
            });

            this._select.addEventListener('change', update);
        }

        _loadIntervals() {
            const data = this.getAttribute('data-intervals');
            const interval = this.getAttribute('data-interval');
            console.log({ interval })
            if (!data) return;

            try {
                const intervals = JSON.parse(data);
                this._select.innerHTML = '';
                intervals.forEach(([value, text]) => {
                    const opt = document.createElement('option');
                    opt.value = value;
                    opt.textContent = text;
                    this._select.appendChild(opt);
                });
            } catch (e) {
                console.error('Failed to parse intervals', e);
            }
        }

        get value() {
            const checked = this.shadowRoot.querySelector('input[name="subscription_option"]:checked');
            return checked ? checked.value : 'one-time';
        }

        get interval() {
            return this.getAttribute('data-interval') || 'day';
        }

        get intervalCount() {
            return this._select ? this._select.value : null;
        }
    }

    if (!customElements.get('spark-subscription')) {
        customElements.define('spark-subscription', SparkSubscription);
    }
})();