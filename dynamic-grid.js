var AddSite = {

    /**
     * Registers a plugin
     *
     * Allows for calls like:
     *   $(...).myPlugin({ option: value })  // Initialize the plugin
     *   $(...).myPlugin('perform action', parameter, ...)  // perform an action on the linked plugin
     *
     * @param String name The name of the plugin
     * @param Function func The actual plugin function
     * @param Object defaults OPTIONAL; The default options
     */
    registerPlugin: function(name, func, defaults) {
        var prop = 'addscript' + name[0].toUpperCase() + name.substr(1);

        $.fn[name] = function jqWrapper() {
            var result = this,
                behavior,
                argv,
                argOptions,
                options;

            if (arguments.length > 0 && (typeof arguments[0] == 'string')) {
                behavior = arguments[0].replace(/\s([a-z])/g, function (m, p1) { return p1.toUpperCase(); });
                argv = Array.prototype.slice.call(arguments, 1);

                this.each(function () {
                    var obj = (prop in this) ? this[prop] : null,
                        res;

                    if (obj && (behavior in obj)) {
                        res = obj[behavior].apply(obj, argv);
                        if (typeof res != 'undefined') {
                            result = res;
                        }
                    } else {
                        console.error('No object or behavior \'' + behavior + '\' not set on object');
                    }
                });
            } else {
                argOptions = arguments.length > 0 ? arguments[0] : {};
                options = $.extend({}, defaults, argOptions);

                this.each(function () {
                    var myOptions;

                    if (!(prop in this)) {
                        myOptions = $.extend({}, options, $(this).data());
                        this[prop] = func(this, myOptions);
                    }
                });
            }

            return result;
        }
    }

};

(function (AddSite) {

    function Rect(cx, cy, hw, hh) {
        this.cx = cx;
        this.cy = cy;
        this.hw = hw;
        this.hh = hh;
        this.isPurged = false;
    }

        Rect.prototype.cutout = function(other) {
            if (Math.abs(this.cx - other.cx) >= this.hw + other.hw || Math.abs(this.cy - other.cy) >= this.hh + other.hh) {
                return;
            }

            var myTop = this.cy - this.hh,
                otherTop = other.cy - other.hh,
                myRight = this.cx + this.hw,
                otherRight = other.cx + other.hw,
                myBottom = this.cy + this.hh,
                otherBottom = other.cy + other.hh,
                myLeft = this.cx - this.hw,
                otherLeft = other.cx - other.hw,
                last = this,
                rect;

            if (otherTop > myTop) {
                rect = new Rect(this.cx, myTop + (otherTop - myTop) / 2, this.hw, (otherTop - myTop) / 2);
                last.append(rect);
                last = rect;
            }
            if (otherRight < myRight) {
                rect = new Rect(otherRight + (myRight - otherRight) / 2, this.cy, (myRight - otherRight) / 2, this.hh);
                last.append(rect);
                last = rect;
            }
            if (otherBottom < myBottom) {
                rect = new Rect(this.cx, otherBottom + (myBottom - otherBottom) / 2, this.hw, (myBottom - otherBottom) / 2);
                last.append(rect);
                last = rect;
            }
            if (otherLeft > myLeft) {
                rect = new Rect(myLeft + (otherLeft - myLeft) / 2, this.cy, (otherLeft - myLeft) / 2, this.hh);
                last.append(rect);
                last = rect;
            }

            if (last !== this) {
                this.cx = this.next.cx;
                this.cy = this.next.cy;
                this.hw = this.next.hw;
                this.hh = this.next.hh;
                this.next = this.next.next;
                if (this.next) this.next.prev = this;
            } else {
                this.isPurged = true;
            }
        };

        Rect.prototype.mergeSpecific = function(b, checkCkey, checkHkey, ckey, hkey) {
            var newC, newH, newBegin;

            if (this[checkCkey] == b[checkCkey] && this[checkHkey] == b[checkHkey] && Math.abs(this[ckey] - b[ckey]) <= this[hkey] + b[hkey]) {
                // Expand this rect
                newBegin = Math.min(this[ckey]-this[hkey], b[ckey]-b[hkey]);
                newH = (Math.max(this[ckey]+this[hkey], b[ckey]+b[hkey]) - newBegin) / 2;
                newC = newBegin + newH;
                this[ckey] = newC;
                this[hkey] = newH;

                // Remove B
                if (b.prev) {
                    b.prev.next = b.next;
                }
                if (b.next) {
                    b.next.prev = b.prev;
                }
                b.isPurged = true;

                return true;
            }
            return false;
        };

        Rect.prototype.merge = function(other) {
            if (!this.mergeSpecific(other, 'cx', 'hw', 'cy', 'hh')) {
                this.mergeSpecific(other, 'cy', 'hh', 'cx', 'hw');
            }
        };

        Rect.prototype.append = function(next) {
            if (this.next) {
                this.next.prev = next;
                next.next = this.next;
            }
            this.next = next;
            next.prev = this;
        };

        Rect.prototype.canContain = function(width, height) {
            return width <= this.hw * 2 && height <= this.hh * 2;
        };

        Rect.prototype.getLeft = function() {
            return this.cx - this.hw;
        };

        Rect.prototype.getTop = function() {
            return this.cy - this.hh;
        };

        Rect.prototype.toString = function() {
            return '{ x: ' + (this.cx - this.hw) + ', y: ' + (this.cy - this.hh) + ', width: ' + (this.hw * 2) + ', height: ' + (this.hh * 2) + ' }';
        };

    function RectArray(root) {
        this.root = root;
        this.width = root.cx + root.hw;
        this.height = root.cy + root.hh;
    }

        RectArray.prototype.each = function(callback, lateNext) {
            var rect, next;

            rect = this.root;
            while (rect) {
                next = rect.next;
                if (callback(rect) === false) break;
                rect = lateNext ? rect.next : next;
            }
        };

        RectArray.prototype.mergeAllWith = function(rect) {
            this.each(function(other) {
                if (other != rect && !other.isPurged) {
                    rect.merge(other);
                }
            });
        };

        RectArray.prototype.mergeAll = function() {
            this.each(this.mergeAllWith.bind(this), true);
        };

        RectArray.prototype.cutout = function(width, height) {
            var found;

            this.each(function(rect) {
                if (rect.canContain(width, height)) {
                    found = new Rect(rect.cx - rect.hw + (width / 2), rect.cy - rect.hh + (height / 2), width / 2, height / 2);
                    return false;
                }
            });

            if (found) {
                this.each(function(rect) {
                    rect.cutout(found);
                }, true);
                if (this.root.isPurged) {
                    while (this.root && this.root.isPurged) {
                        this.root = this.root.next;
                    }
                } else {
                    this.mergeAll();
                    this.sort();
                }
            } else {
                this.extend(this.width, 1000);
                found = this.cutout(width, height);
            }

            return found;
        };

        RectArray.prototype.sort = function() {
            var rects = [], last;

            this.each(function(rect) {
                rects.push(rect);
            });

            rects.sort(function(a, b) {
                return (12 * (a.cx - a.hw) + (a.cy - a.hh)) - (12 * (b.cx - b.hw) + (b.cy - b.hh));
            });

            for (let i = 0; i < rects.length; i++) {
                if (!last) {
                    this.root = rects[i];
                    rects[i].prev = null;
                } else {
                    rects[i].prev = last;
                    last.next = rects[i];
                }
                last = rects[i];
            }
            if (last) {
                last.next = null;
            }
        };

        RectArray.prototype.toArray = function() {
            var rects = [], last;

            this.each(function(rect) {
                rects.push(rect);
            });

            return rects;
        };

        RectArray.prototype.extend = function(width, height) {
            var bottom = this.height,
                last;

            this.each(function(rect){
                bottom = Math.max(bottom, rect.cy + rect.hh);
                last = rect;
            });

            var rect = new Rect(width / 2, bottom + (height / 2), width / 2, height / 2);
            if (last) {
                last.append(rect);
                this.each(function(other) {
                    if (other != rect && !other.isPurged) {
                        rect.merge(other);
                        if (!other.isPurged && other.cy + other.hh >= bottom) {
                            other.cy += height / 2;
                            other.hh += height / 2;
                        }
                    }
                });
                if (this.root.isPurged) {
                    this.root = rect;
                }
                this.sort();
            } else {
                this.root = rect;
            }

            this.height += height;
        };

    function DynamicGrid(container, options) {

        var public = {},
            blocks = container.querySelectorAll(options.blockSelector),
            i, dozinal,
            lastWidth = 0,
            isResized = false,
            currentFilter = '*';

        function isContainerVisible() {
            var el = container,
                style;

            while (el) {
                style = getComputedStyle(el);
                if (style.display == 'none') return false;
                el = el.parentElement;
            }

            return true;
        }

        function reflow(force) {
            var field,
                maxHeight = 0,
                isVisible = isContainerVisible();

            if (isVisible && (force || container.offsetWidth != lastWidth)) {

                field = new RectArray(new Rect(options.baseGrid/2, container.offsetWidth/2, options.baseGrid/2, container.offsetWidth/2));
                for (i = 0; i < blocks.length; i++) {
                    var rect = field.cutout(Math.round((blocks[i].offsetWidth / container.offsetWidth) * options.baseGrid), blocks[i].offsetHeight);
                    if (rect) {
                        blocks[i].style.position = 'absolute';
                        blocks[i].style.left = (100 * rect.getLeft() / options.baseGrid) + '%';
                        blocks[i].style.top = rect.getTop() + 'px';

                        maxHeight = Math.max(maxHeight, rect.getTop() + blocks[i].offsetHeight);
                    }
                }
                container.style.height = maxHeight + 'px';

                lastWidth = container.offsetWidth;
            }

        }

        function filter(selector) {
            if (selector == '*') {
                blocks = container.querySelectorAll(options.blockSelector);
                $(options.blockSelector).css({ opacity: 1, zIndex: 0 });
            } else {
                $(options.blockSelector).not(selector).css({ opacity: 0, top: 0, left: 0, zIndex: -10 });
                $(selector).css({ opacity: 1, zIndex: 0 });
                blocks = container.querySelectorAll(selector);
            }

            currentFilter = selector;

            reflow(true);
        }

        function refresh() {
            filter(currentFilter);
            //reflow();
        }

        function makeAnimated(animated) {
            if (typeof animated == 'undefined') {
                animated = true;
            }
            $(container).toggleClass('animated', animated);
        }

        reflow();

        if (options.animatedAtStart) {
            makeAnimated();
        }

        setInterval(function () {
            if (isResized) {
                reflow();
                isResized = false;
            }
        }, 500);

        window.addEventListener('resize', function () {
            isResized = true;
        });

        public.filter = filter;
        public.makeAnimated = makeAnimated;
        public.reflow = reflow;
        public.refresh = refresh;

        return public;

    }

    AddSite.registerPlugin('dynamicGrid', DynamicGrid, {
        blockSelector: '.block',
        baseGrid: 12,
        animatedAtStart: true
    });

})(AddSite);
