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
 * Keyboard: ArrowLeft/ArrowRight to navigate, Home/End for first/last.
 *
 * ASCII-only - no unicode, no template syntax in this file.
 */

(function() {
    'use strict';

    function SparkGallery(el) {
        this.el = el;
        this.main = el.querySelector('.spark-gallery-main');
        this.mainImg = el.querySelector('.spark-gallery-hero');
        this.thumbs = el.querySelectorAll('.spark-gallery-thumb');
        this.prevBtn = el.querySelector('.spark-gallery-prev');
        this.nextBtn = el.querySelector('.spark-gallery-next');
        this.counter = el.querySelector('.spark-gallery-counter');
        this.current = 0;
        this.total = this.thumbs.length;

        if (this.total < 2) {
            // Single image - hide nav controls
            if (this.prevBtn) this.prevBtn.style.display = 'none';
            if (this.nextBtn) this.nextBtn.style.display = 'none';
            if (this.counter) this.counter.style.display = 'none';
            return;
        }

        this._bindEvents();
        this._updateCounter();
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

        // Keyboard navigation when gallery is focused or hovered
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

    SparkGallery.prototype.goTo = function(index) {
        if (index < 0) index = this.total - 1;
        if (index >= this.total) index = 0;
        this.current = index;

        // Update main image
        var thumb = this.thumbs[index];
        if (this.mainImg && thumb) {
            this.mainImg.src = thumb.getAttribute('data-full');
            this.mainImg.alt = thumb.alt || '';
        }

        // Update active thumbnail
        this.thumbs.forEach(function(t, i) {
            if (i === index) {
                t.classList.add('spark-gallery-thumb-active');
                t.setAttribute('aria-current', 'true');
                // Scroll thumb into view if needed
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            } else {
                t.classList.remove('spark-gallery-thumb-active');
                t.removeAttribute('aria-current');
            }
        });

        this._updateCounter();
    };

    SparkGallery.prototype.prev = function() {
        this.goTo(this.current - 1);
    };

    SparkGallery.prototype.next = function() {
        this.goTo(this.current + 1);
    };

    SparkGallery.prototype._updateCounter = function() {
        if (this.counter) {
            this.counter.textContent = (this.current + 1) + ' / ' + this.total;
        }
    };

    // Auto-init all galleries on page
    function initGalleries() {
        document.querySelectorAll('.spark-gallery').forEach(function(el) {
            new SparkGallery(el);
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
