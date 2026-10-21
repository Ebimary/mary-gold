/*
 * Mary Gold — shared site interactions
 * Handles: mobile menu, dropdown menus, smooth scrolling,
 * hero slider, testimonials slider, FAQ accordion, team modals,
 * contact/newsletter forms and the header scroll effect.
 */
(function () {
    'use strict';

    /* ------------------------------------------------------------------
     * Logo fallback: if the logo image is missing, show a text wordmark
     * ------------------------------------------------------------------ */
    function initLogoFallback() {
        document.querySelectorAll('.logo img').forEach(function (img) {
            img.addEventListener('error', function () {
                var logo = img.closest('.logo');
                if (!logo || logo.querySelector('.logo-fallback')) return;
                img.style.display = 'none';
                var span = document.createElement('span');
                span.className = 'logo-fallback';
                span.innerHTML = 'Mary <span>Gold</span>';
                logo.appendChild(span);
            });
        });
    }

    /* ------------------------------------------------------------------
     * Header & mobile navigation
     * ------------------------------------------------------------------ */
    function initNavigation() {
        var toggle = document.getElementById('hamburger');
        var navMenu = document.getElementById('nav-menu');
        if (!toggle || !navMenu) return;

        /* Wire the control exactly once. If this script is ever evaluated
           twice, a second set of listeners would toggle the same class and the
           menu would open and close again inside a single tap. */
        if (toggle.getAttribute('data-nav-ready') === '1') return;
        toggle.setAttribute('data-nav-ready', '1');

        var header = document.querySelector('header');
        var mobileQuery = window.matchMedia('(max-width: 768px)');

        function isMobile() {
            return mobileQuery.matches;
        }

        /* The panel is glued to the bottom edge of the header. The header is
           as tall as the logo, so its height is measured rather than
           hard-coded - otherwise the panel overlaps the button. */
        function syncHeaderHeight() {
            if (!header) return;
            document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
        }

        function setMenuState(open) {
            navMenu.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
            document.body.classList.toggle('nav-open', open);
        }

        function focusQuietly(el) {
            if (!el) return;
            try {
                el.focus({ preventScroll: true });
            } catch (err) {
                el.focus();
            }
        }

        function openMenu() {
            setMenuState(true);
            focusQuietly(navMenu.querySelector('a'));
        }

        function closeMenu(refocus) {
            var wasOpen = navMenu.classList.contains('active');
            setMenuState(false);
            document.querySelectorAll('.nav-item.open').forEach(function (item) {
                item.classList.remove('open');
                var link = item.querySelector('.nav-link');
                if (link) link.setAttribute('aria-expanded', 'false');
            });
            if (wasOpen && refocus) focusQuietly(toggle);
        }

        /* Highlight the nav item matching the current clean URL */
        (function markActive() {
            var path = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
            if (path.length > 1) path = path.replace(/\/$/, '');
            navMenu.querySelectorAll('.nav-link').forEach(function (link) {
                var href = link.getAttribute('href') || '';
                href = href.split('#')[0].replace(/\/$/, '');
                if (href === '' || href === '/') href = '';
                if (href === path) link.classList.add('active');
            });
        })();

        /* A single click listener is all this control needs: browsers synthesise
           click from a tap, so no touchstart/touchend/pointer handlers are
           attached and nothing can fire twice for one tap.

           The icon is swapped with CSS through aria-expanded. The button's
           markup is deliberately NOT rewritten here - replacing innerHTML
           detaches the very element that was tapped, and the "tap outside"
           handler below would then see the tap as an outside click and close
           the menu again in the same event. */
        toggle.addEventListener('click', function () {
            if (navMenu.classList.contains('active')) {
                closeMenu(true);
            } else {
                openMenu();
            }
        });

        /* Toggle dropdowns on tap/click (works on mobile and desktop) */
        document.querySelectorAll('.nav-item').forEach(function (item) {
            var link = item.querySelector('.nav-link');
            var dropdown = item.querySelector('.dropdown');
            if (!dropdown || !link) return;

            link.setAttribute('aria-expanded', 'false');

            link.addEventListener('click', function (e) {
                if (!isMobile()) return;
                // On mobile, tapping a parent opens its dropdown instead of navigating
                e.preventDefault();
                var isOpen = item.classList.contains('open');
                document.querySelectorAll('.nav-item.open').forEach(function (other) {
                    if (other === item) return;
                    other.classList.remove('open');
                    var otherLink = other.querySelector('.nav-link');
                    if (otherLink) otherLink.setAttribute('aria-expanded', 'false');
                });
                item.classList.toggle('open', !isOpen);
                link.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            });
        });

        /* Close the menu after choosing any link (not dropdown parents) */
        navMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                var item = link.closest('.nav-item');
                var isParentToggle = isMobile() && item && item.querySelector('.dropdown') &&
                    link.classList.contains('nav-link');
                if (isParentToggle) return;
                closeMenu(false);
            });
        });

        /* Close when tapping outside the menu. composedPath() is used so the
           check still works even if the tap target is not the deepest element
           (and never depends on the button's markup staying the same). */
        document.addEventListener('click', function (e) {
            if (!navMenu.classList.contains('active')) return;
            var path = e.composedPath ? e.composedPath() : [];
            var insideMenu = navMenu.contains(e.target) || path.indexOf(navMenu) !== -1;
            var insideToggle = toggle.contains(e.target) || path.indexOf(toggle) !== -1;
            if (insideMenu || insideToggle) return;
            closeMenu(false);
        });

        /* Escape closes the menu */
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' && e.key !== 'Esc') return;
            if (!navMenu.classList.contains('active')) return;
            closeMenu(true);
        });

        /* Reset menu state when the layout switches back to desktop */
        function handleBreakpointChange() {
            if (!isMobile()) {
                closeMenu(false);
            }
            syncHeaderHeight();
        }
        if (mobileQuery.addEventListener) {
            mobileQuery.addEventListener('change', handleBreakpointChange);
        } else if (mobileQuery.addListener) {
            mobileQuery.addListener(handleBreakpointChange);
        }
        window.addEventListener('resize', syncHeaderHeight);
        if (window.ResizeObserver && header) {
            new window.ResizeObserver(syncHeaderHeight).observe(header);
        }
        syncHeaderHeight();
    }

    /* ------------------------------------------------------------------
     * Smooth scrolling for in-page anchor links
     * ------------------------------------------------------------------ */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                var hash = link.getAttribute('href');
                if (!hash || hash === '#' || hash.length < 2) return;
                var target = document.getElementById(hash.substring(1));
                if (!target) return;

                e.preventDefault();
                var header = document.querySelector('header');
                var offset = header ? header.offsetHeight + 10 : 90;
                var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: top, behavior: 'smooth' });

                if (history.pushState) {
                    history.pushState(null, '', hash);
                }
            });
        });

        /* Smoothly scroll to a hash present on page load (e.g. about.html#team) */
        if (window.location.hash && window.location.hash.length > 1) {
            var el = document.getElementById(window.location.hash.substring(1));
            if (el) {
                var header = document.querySelector('header');
                var offset = header ? header.offsetHeight + 10 : 90;
                setTimeout(function () {
                    window.scrollTo({
                        top: el.getBoundingClientRect().top + window.pageYOffset - offset,
                        behavior: 'smooth'
                    });
                }, 120);
            }
        }
    }

    /* ------------------------------------------------------------------
     * Hero slider
     * ------------------------------------------------------------------ */
    function initHeroSlider() {
        var slides = document.querySelectorAll('.hero .slide');
        var contents = document.querySelectorAll('.hero .slide-content');
        var dots = document.querySelectorAll('.slider-dot');
        var prevArrow = document.querySelector('.prev-arrow');
        var nextArrow = document.querySelector('.next-arrow');
        if (!slides.length) return;

        var current = 0;
        var interval = null;
        var DURATION = 5500;

        function show(index) {
            if (index < 0) index = slides.length - 1;
            if (index >= slides.length) index = 0;
            slides.forEach(function (s) { s.classList.remove('active'); });
            contents.forEach(function (c) { c.classList.remove('active'); });
            dots.forEach(function (d) { d.classList.remove('active'); });
            slides[index].classList.add('active');
            if (contents[index]) contents[index].classList.add('active');
            if (dots[index]) dots[index].classList.add('active');
            current = index;
        }

        function next() { show(current + 1); }
        function prev() { show(current - 1); }
        function restart() {
            clearInterval(interval);
            interval = setInterval(next, DURATION);
        }

        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function () { show(i); restart(); });
        });
        if (nextArrow) nextArrow.addEventListener('click', function () { next(); restart(); });
        if (prevArrow) prevArrow.addEventListener('click', function () { prev(); restart(); });

        /* Pause on hover for usability */
        var hero = document.querySelector('.hero');
        if (hero) {
            hero.addEventListener('mouseenter', function () { clearInterval(interval); });
            hero.addEventListener('mouseleave', restart);
        }

        /* Touch swipe support */
        var startX = 0;
        if (hero) {
            hero.addEventListener('touchstart', function (e) {
                startX = e.changedTouches[0].clientX;
            }, { passive: true });
            hero.addEventListener('touchend', function (e) {
                var dx = e.changedTouches[0].clientX - startX;
                if (Math.abs(dx) > 50) {
                    dx < 0 ? next() : prev();
                    restart();
                }
            }, { passive: true });
        }

        restart();
    }

    /* ------------------------------------------------------------------
     * Testimonials slider
     * ------------------------------------------------------------------ */
    function initTestimonials() {
        var container = document.getElementById('testimonials-container');
        var dots = document.querySelectorAll('.testimonial-slider-dot');
        if (!container || !dots.length) return;

        var current = 0;
        var timer;

        function show(index) {
            if (index < 0) index = dots.length - 1;
            if (index >= dots.length) index = 0;
            container.style.transform = 'translateX(-' + (index * 100) + '%)';
            dots.forEach(function (d) { d.classList.remove('active'); });
            dots[index].classList.add('active');
            current = index;
        }

        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function () {
                show(i);
                clearInterval(timer);
                timer = setInterval(function () { show(current + 1); }, 6000);
            });
        });

        timer = setInterval(function () { show(current + 1); }, 6000);
    }

    /* ------------------------------------------------------------------
     * FAQ accordion
     * ------------------------------------------------------------------ */
    function initFaq() {
        var items = document.querySelectorAll('.faq-item');
        if (!items.length) return;
        items.forEach(function (item) {
            var question = item.querySelector('.faq-question');
            if (!question) return;
            question.setAttribute('tabindex', '0');
            function toggle() {
                items.forEach(function (other) {
                    if (other !== item) other.classList.remove('active');
                });
                item.classList.toggle('active');
            }
            question.addEventListener('click', toggle);
            question.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        });
    }

    /* ------------------------------------------------------------------
     * Team member modals
     * ------------------------------------------------------------------ */
    function initTeamModal(data) {
        var overlay = document.getElementById('modalOverlay');
        var content = document.getElementById('modalContent');
        var closeBtn = document.getElementById('modalClose');
        var modal = document.querySelector('.team-modal');
        if (!overlay || !content || !closeBtn) return;
        if (overlay.dataset.mgInit) return;
        overlay.dataset.mgInit = '1';

        function getData() { return window.MARY_GOLD_TEAM || data || {}; }

        function show(member) {
            content.innerHTML =
                '<div class="modal-image"><img src="' + member.image + '" alt="' + member.name + '"></div>' +
                '<div class="modal-details"><h2>' + member.name + '</h2>' +
                '<span class="modal-role">' + member.role + '</span>' +
                '<p class="modal-bio">' + member.bio + '</p></div>';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Event delegation: works even after the team grid is re-rendered.
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.view-profile-btn');
            if (!btn) return;
            e.stopPropagation();
            var member = getData()[btn.getAttribute('data-member')];
            if (member) show(member);
        });

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
        if (modal) {
            modal.addEventListener('click', function (e) { e.stopPropagation(); });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('active')) close();
        });
    }

    /* ------------------------------------------------------------------
     * Forms (front-end only, delivered via mailto)
     * ------------------------------------------------------------------ */
    var CONTACT_EMAIL = (window.__MG_SITE__ && window.__MG_SITE__.email) || 'onweebi12@gmail.com';

    function showFormMessage(el, text, isError) {
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
        el.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
        el.style.color = isError ? '#721c24' : '#155724';
        el.style.border = '1px solid ' + (isError ? '#f5c6cb' : '#c3e6cb');
        setTimeout(function () { el.style.display = 'none'; }, 6000);
    }

    /* Submit a form to Netlify Forms (URL-encoded, with form-name). Resolves
     * true on success, false if unavailable (caller falls back to mailto).
     * `endpoint` must be the form's own action path: Netlify registers a form
     * against the file that contains it, so posting to the current URL would
     * break on clean URLs like /contact (which is rewritten to /contact.html). */
    function postForm(formName, fields, endpoint) {
        var body = new URLSearchParams();
        body.set('form-name', formName);
        Object.keys(fields || {}).forEach(function (k) { body.set(k, fields[k]); });
        return fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        }).then(function (res) {
            return res.ok;
        }).catch(function () {
            return false;
        });
    }

    function mailtoFallback(subject, body) {
        window.location.href = 'mailto:' + CONTACT_EMAIL +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(body);
    }

    function initContactForm() {
        var form = document.getElementById('contactForm');
        var message = document.getElementById('formMessage');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            var btn = form.querySelector('button[type="submit"]');
            var original = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            var data = new FormData(form);
            var payload = {
                name: data.get('name') || '',
                email: data.get('email') || '',
                phone: data.get('phone') || '',
                subject: data.get('subject') || 'Website Enquiry',
                message: data.get('message') || ''
            };

            postForm('contact', payload, form.getAttribute('action')).then(function (ok) {
                if (ok) {
                    showFormMessage(message,
                        "Thank you, " + payload.name + "! Your message has been sent. We'll get back to you within 24-48 hours.",
                        false);
                } else {
                    // No backend available -> open the visitor's mail client
                    mailtoFallback(
                        'Mary Gold Website: ' + payload.subject,
                        'Name: ' + payload.name + '\n' +
                        'Email: ' + payload.email + '\n' +
                        'Phone: ' + payload.phone + '\n' +
                        'Subject: ' + payload.subject + '\n\n' +
                        'Message:\n' + payload.message
                    );
                    showFormMessage(message,
                        "Thank you, " + payload.name + "! Your email app should now open so you can send your message to us.",
                        false);
                }
                form.reset();
            }).finally(function () {
                btn.textContent = original;
                btn.disabled = false;
            });
        });
    }

    function initNewsletterForm() {
        var form = document.getElementById('newsletterForm');
        var message = document.getElementById('newsletterMessage');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            var btn = form.querySelector('button[type="submit"]');
            var original = btn.textContent;
            btn.textContent = 'Subscribing...';
            btn.disabled = true;

            var email = (new FormData(form)).get('email') || '';

            postForm('newsletter', {
                name: 'Newsletter Subscriber',
                email: email,
                subject: 'Newsletter Subscription',
                message: 'Please add this address to the Mary Gold events newsletter: ' + email
            }, form.getAttribute('action')).then(function (ok) {
                if (!ok) {
                    mailtoFallback(
                        'Newsletter Subscription',
                        'Please add this address to the Mary Gold events newsletter: ' + email
                    );
                }
                showFormMessage(message,
                    "Thank you for subscribing! We'll notify you about upcoming events.", false);
                form.reset();
            }).finally(function () {
                btn.textContent = original;
                btn.disabled = false;
            });
        });
    }

    /* ------------------------------------------------------------------
     * Get Directions button (contact page)
     * ------------------------------------------------------------------ */
    function initDirections() {
        var btn = document.getElementById('getDirections');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var address = 'House+23+Mosaic+Garden+Estate+Gaduwa+District+Abuja';
            window.open('https://www.google.com/maps/dir/?api=1&destination=' + address, '_blank');
        });
    }

    /* ------------------------------------------------------------------
     * Header scroll effect
     * ------------------------------------------------------------------ */
    function initHeaderScroll() {
        var header = document.querySelector('header');
        if (!header) return;
        window.addEventListener('scroll', function () {
            if (window.scrollY > 100) {
                header.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
            } else {
                header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }
        }, { passive: true });
    }

    /* ------------------------------------------------------------------
     * Boot
     * ------------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', function () {
        initLogoFallback();
        initNavigation();
        initSmoothScroll();
        initHeroSlider();
        initTestimonials();
        initFaq();
        initContactForm();
        initNewsletterForm();
        initDirections();
        initHeaderScroll();
        if (document.getElementById('modalOverlay')) {
            initTeamModal(window.MARY_GOLD_TEAM || {});
        }
        // Re-init modal wiring if the team grid is rendered from CMS content.
        document.addEventListener('mg:team', function () {
            initTeamModal(window.MARY_GOLD_TEAM || {});
        });
    });
})();
