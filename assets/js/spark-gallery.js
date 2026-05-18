/**
 * Spark Gallery - Product image gallery with thumbnails
 *
 * Progressive enhancement: without JS, all images display stacked.
 * With JS, shows one main image + clickable thumbnail strip.
 *
 * Layouts (set via data-layout on .spark-gallery):
 *   "bottom"  - thumbnails below main image (default)
 *   "left"    - thumbnails to the left of main image (desktop)
 *
 * Variant linking: listens for variant picker changes and advances
 * the gallery to the matching variant image (by child index).
 *
 * Keyboard: ArrowLeft/ArrowRight to navigate, Home/End for first/last.
 *
 * ASCII-only - no unicode, no template syntax in this file.
 */

(function() {
    'use strict';

    var FADE_MS = 180;

    function SparkGallery(el) {
        this.el = el;
        this.main = el.querySelector('.spark-gallery-main');
        this.mainImg = el.querySelector('.spark-gallery-hero');
        this.thumbs = el.querySelectorAll('.spark-gallery-thumb');
        this.prevBtn = el.querySelector('.spark-gallery-prev');
        this.nextBtn = el.querySelector('.spark-gallery-next');
        this.current = 0;
        this.total = this.thumbs.length;
        this._fading = false;

        if (this.total < 2) {
            // Single image - hide nav controls
            if (this.prevBtn) this.prevBtn.style.display = 'none';
            if (this.nextBtn) this.nextBtn.style.display = 'none';
            return;
        }

        this._bindEvents();
        this._bindVariantPicker();
    }

    SparkGallery.prototype._bindEvents = function() {
        var self = this;

        // Thumbnail clicks
        this.thumbs.forEach(function(thumb, i) {
            thumb.addEventListener('click', function() {
                self.goTo(i);
            });
        });

        // Prev/Next buttons
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', function() {
                self.prev();
            });
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', function() {
                self.next();
            });
        }

        // Keyboard navigation when gallery is focused
        this.el.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                self.prev();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                self.next();
            } else if (e.key === 'Home') {
                e.preventDefault();
                self.goTo(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                self.goTo(self.total - 1);
            }
        });

        // Swipe support for touch devices
        var touchStartX = 0;
        var touchStartY = 0;
        this.main.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.main.addEventListener('touchend', function(e) {
            var dx = e.changedTouches[0].clientX - touchStartX;
            var dy = e.changedTouches[0].clientY - touchStartY;
            // Only swipe if horizontal movement > vertical and > 50px
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                if (dx < 0) {
                    self.next();
                } else {
                    self.prev();
                }
            }
        }, { passive: true });
    };

    /**
     * Variant picker integration: when a variant radio changes,
     * find the selected child's primary image and advance the gallery to it.
     *
     * Previously this called goTo(childIndex), which assumed the gallery's
     * thumbnails were 1:1 with prod.children -- almost never true (the
     * gallery shows the parent's image set; children carry their own
     * primary_image). Now we look up the variant's actual image URL,
     * match it to a thumbnail by data-full, and goTo that thumb's index.
     * If no thumb matches (e.g. the variant has a unique image not in the
     * parent set), we swap the hero src directly as a fallback.
     */
    SparkGallery.prototype._bindVariantPicker = function() {
        var self = this;
        var inputs = document.querySelectorAll('input[name^="attr_"]');
        if (!inputs.length) return;

        function pickVariantImageUrl(variant) {
            if (!variant) return null;
            if (variant.primary_image && variant.primary_image.original) return variant.primary_image.original;
            if (variant.images && variant.images.length && variant.images[0].original) return variant.images[0].original;
            return null;
        }

        function basename(url) {
            // Strip query string + fragment first -- thumbnail data-full and
            // variant.primary_image.original can carry different CDN cache
            // keys (?v=...) or sizing params (?w=400) even when they point
            // at the same underlying file. Comparing pre-strip would miss
            // the match silently.
            var path = (url || '').split('?')[0].split('#')[0];
            return path.split('/').pop();
        }

        inputs.forEach(function(input) {
            input.addEventListener('change', function() {
                var dataEl = document.getElementById('product-data');
                if (!dataEl) return;
                try {
                    var prod = JSON.parse(dataEl.textContent);
                    if (!prod.children || !prod.children.length) return;

                    // Gather all selected attribute values
                    var selected = {};
                    document.querySelectorAll('input[name^="attr_"]:checked').forEach(function(inp) {
                        selected[inp.name] = parseInt(inp.value);
                    });

                    // Find the matching child variant
                    var matched = null;
                    for (var i = 0; i < prod.children.length; i++) {
                        var child = prod.children[i];
                        if (!child.variant_attribute_values) continue;
                        var ok = child.variant_attribute_values.every(function(attr) {
                            return selected['attr_' + attr.code] === attr.id;
                        });
                        if (ok) { matched = child; break; }
                    }
                    if (!matched) return;

                    var url = pickVariantImageUrl(matched);
                    if (!url) return;

                    // Prefer advancing the gallery to the matching thumb so the
                    // existing fade animation + active-thumb state apply.
                    var targetIdx = -1;
                    for (var j = 0; j < self.thumbs.length; j++) {
                        var full = self.thumbs[j].getAttribute('data-full') || '';
                        if (full === url || basename(full) === basename(url)) { targetIdx = j; break; }
                    }
                    if (targetIdx !== -1) {
                        self.goTo(targetIdx);
                    } else if (self.mainImg) {
                        // No matching thumb -- swap the hero src directly.
                        self.mainImg.src = url;
                    }
                } catch(e) {}
            });
        });
    };

    SparkGallery.prototype.goTo = function(index) {
        if (this._fading) return;
        if (index < 0) index = this.total - 1;
        if (index >= this.total) index = 0;
        if (index === this.current) return;

        var self = this;
        var thumb = this.thumbs[index];
        if (!this.mainImg || !thumb) return;

        // Fade out, swap, fade in
        this._fading = true;
        this.mainImg.classList.add('spark-gallery-fading');

        setTimeout(function() {
            self.mainImg.src = thumb.getAttribute('data-full');
            self.current = index;

            // Update active thumbnail
            self.thumbs.forEach(function(t, i) {
                if (i === index) {
                    t.classList.add('spark-gallery-thumb-active');
                    t.setAttribute('aria-current', 'true');
                    t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                } else {
                    t.classList.remove('spark-gallery-thumb-active');
                    t.removeAttribute('aria-current');
                }
            });

            // Fade in once the new image loads (or immediately if cached)
            if (self.mainImg.complete) {
                self.mainImg.classList.remove('spark-gallery-fading');
                self._fading = false;
            } else {
                self.mainImg.onload = function() {
                    self.mainImg.classList.remove('spark-gallery-fading');
                    self._fading = false;
                    self.mainImg.onload = null;
                };
                // Safety timeout in case onload never fires
                setTimeout(function() {
                    self.mainImg.classList.remove('spark-gallery-fading');
                    self._fading = false;
                }, 500);
            }
        }, FADE_MS);
    };

    SparkGallery.prototype.prev = function() {
        this.goTo(this.current - 1);
    };

    SparkGallery.prototype.next = function() {
        this.goTo(this.current + 1);
    };

    // Auto-init all galleries on page
    function initGalleries() {
        document.querySelectorAll('.spark-gallery').forEach(function(el) {
            var gallery = new SparkGallery(el);
            el._sparkGallery = gallery;
        });
    }

    // Export for external use
    window.SparkGallery = SparkGallery;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGalleries);
    } else {
        initGalleries();
    }

})();
