/*
 * Mary Gold — per-page content renderers.
 * Each page declares its slug via <body data-page="home|about|programs|events|contact">.
 * Renderers rebuild list sections (hero, programs, team, faq, testimonials,
 * objectives, values) from JSON while preserving the exact class structure so
 * the CSS/design is unchanged. Simple text fields use [data-cms].
 */
(function () {
  "use strict";

  var M = window.MG;
  if (!M) return;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function get(p) { return M.get(p); }
  function esc(s) { return M.esc(s); }
  function md(s) { return /<[a-z][\s\S]*>/i.test(String(s || "").trim()) ? s : M.markdownToHtml(s || ""); }

  /* ------------------------------------------------------------ HOME ---- */
  function renderHeroSlides(slides) {
    var textWrap = document.querySelector(".hero-content");
    var bgWrap = document.querySelector(".slides-container");
    if (!textWrap || !bgWrap || !slides.length) return;

    // Background images: reuse existing slide backgrounds by index if available.
    var existingBgs = Array.prototype.map.call(bgWrap.querySelectorAll(".slide"), function (el) {
      var m = (el.getAttribute("style") || "").match(/url\(['"]?([^'")]+)['"]?\)/);
      return m ? m[1] : "";
    });

    bgWrap.innerHTML = slides.map(function (s, i) {
      var bg = s.image || existingBgs[i] || existingBgs[0] || "/images/img2.jpeg";
      return '<div class="slide' + (i === 0 ? " active" : "") +
        '" style="background-image: url(\'' + esc(bg) + '\');"></div>';
    }).join("");

    textWrap.innerHTML = slides.map(function (s, i) {
      return '<div class="slide-content' + (i === 0 ? " active" : "") + '">' +
        "<h1>" + esc(s.title) + "</h1>" +
        "<p>" + esc(s.text) + "</p>" +
        '<div class="hero-btns">' +
        '<a href="' + esc(s.button_link || "/contact") + '" class="btn btn-primary">' + esc(s.button_text) + "</a>" +
        '<a href="#about" class="btn btn-secondary">Learn More</a>' +
        "</div></div>";
    }).join("");
  }

  function renderProgramsGrid(programs) {
    M.each(".programs-grid", function (grid) {
      grid.innerHTML = programs.map(function (p) {
        return '<div class="program-card">' +
          '<div class="program-header">' +
          '<div class="program-icon"><i class="' + esc(p.icon || "fas fa-star") + '"></i></div>' +
          "<h3>" + esc(p.title) + "</h3>" +
          "</div>" +
          '<div class="program-content">' +
          "<p>" + esc(p.summary) + "</p>" +
          '<div class="program-features">' +
          (p.features || []).map(function (f) {
            return '<div class="program-feature"><i class="fas fa-check-circle"></i><span>' + esc(f) + "</span></div>";
          }).join("") +
          "</div>" +
          '<a href="' + esc(p.button_link || "/contact") + '" class="btn btn-outline">' + esc(p.button_text || "Learn More") + "</a>" +
          "</div></div>";
      }).join("");
    });
  }

  function renderTestimonials(items) {
    M.each(".testimonials-grid", function (grid) {
      grid.innerHTML = items.map(function (t) {
        return '<div class="testimonial">' +
          '<p class="testimonial-text">"' + esc(t.quote) + '"</p>' +
          '<p class="testimonial-author">- ' + esc(t.name) + ", " + esc(t.role) + "</p>" +
          "</div>";
      }).join("");
    });
  }

  /* ----------------------------------------------------------- ABOUT ---- */
  function renderObjectives(items) {
    M.each(".objectives-list", function (list) {
      list.innerHTML = items.map(function (o, i) {
        return '<div class="objective-item">' +
          '<div class="objective-number">' + (i + 1) + "</div>" +
          '<div class="objective-content"><h4>' + esc(o.title) + "</h4><p>" + esc(o.text) + "</p></div>" +
          "</div>";
      }).join("");
    });
  }

  function renderValues(items) {
    M.each(".values-grid", function (grid) {
      grid.innerHTML = items.map(function (v) {
        return '<div class="value-card"><h4>' + esc(v.title) + "</h4><p>" + esc(v.text) + "</p></div>";
      }).join("");
    });
  }

  function renderFounder(f) {
    if (!f) return;
    M.each("[data-cms-founder-image]", function (el) { if (f.image) el.src = f.image; });
    M.each("[data-cms-founder-bio]", function (el) {
      el.innerHTML =
        '<h3 class="director-name">' + esc(f.name) + "</h3>" +
        '<p class="director-title-only">' + esc(f.title) + "</p>" +
        (f.professional_title
          ? '<p class="director-title-only">' + esc(f.professional_title) + "</p>"
          : "") +
        '<div class="profile-content">' + md(f.bio) + "</div>";
    });
  }

  function renderTeam(members) {
    var teamData = {};
    members.forEach(function (m, i) {
      teamData["member-" + i] = {
        name: m.name, role: m.role, image: m.image, bio: '<div class="profile-content">' + md(m.bio) + "</div>"
      };
    });
    window.MARY_GOLD_TEAM = teamData;

    M.each(".team-grid", function (grid) {
      grid.innerHTML = members.map(function (m, i) {
        return '<div class="team-member">' +
          '<div class="member-image"><img src="' + esc(m.image || "/images/YMAI.png") + '" alt="' + esc(m.name) + '"></div>' +
          '<h3 class="member-name">' + esc(m.name) + "</h3>" +
          '<p class="member-role">' + esc(m.role) + "</p>" +
          '<button class="view-profile-btn" data-member="member-' + i + '">View Profile</button>' +
          "</div>";
      }).join("");
    });

    document.dispatchEvent(new CustomEvent("mg:team"));
  }

  /* -------------------------------------------------------- PROGRAMS ---- */
  function renderProgramCards(programs) {
    M.each(".programs-section .programs-grid, .programs-overview .programs-grid", function (grid) {
      grid.innerHTML = programs.map(function (p) {
        return '<div class="program-card" id="' + esc(p.slug) + '">' +
          '<div class="program-header">' +
          '<div class="program-icon"><i class="' + esc(p.icon || "fas fa-star") + '"></i></div>' +
          "<h3>" + esc(p.title) + "</h3>" +
          "</div>" +
          '<div class="program-content">' +
          "<p>" + esc(p.summary) + "</p>" +
          '<div class="program-features">' +
          (p.features || []).map(function (f) {
            return '<div class="program-feature"><i class="fas fa-check-circle"></i><span>' + esc(f) + "</span></div>";
          }).join("") +
          "</div>" +
          '<a href="' + esc(p.button_link || "/contact") + '" class="btn btn-outline">' + esc(p.button_text || "Learn More") + "</a>" +
          "</div></div>";
      }).join("");
    });
  }

  /* ---------------------------------------------------------- EVENTS ---- */
  function renderEventTypes(types) {
    M.each(".event-types", function (wrap) {
      wrap.innerHTML = types.map(function (t) {
        return '<div class="event-type-card">' +
          '<div class="event-type-icon"><i class="' + esc(t.icon || "fas fa-calendar") + '"></i></div>' +
          "<h3>" + esc(t.title) + "</h3><p>" + esc(t.text) + "</p></div>";
      }).join("");
    });
  }

  function renderEventList(selector, items) {
    M.each(selector, function (wrap) {
      var empty = wrap.parentNode ? wrap.parentNode.querySelector(".empty-state") : null;
      if (!items || !items.length) {
        wrap.innerHTML = "";
        if (empty) empty.style.display = "";
        return;
      }
      if (empty) empty.style.display = "none";
      wrap.innerHTML = items.map(function (e) {
        var d = e.date ? new Date(e.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";
        return '<div class="event-card">' +
          (e.image ? '<div class="event-image"><img src="' + esc(e.image) + '" alt="' + esc(e.title) + '"></div>' : "") +
          '<div class="event-body"><h3>' + esc(e.title) + "</h3>" +
          (d ? '<p class="event-date"><i class="fas fa-calendar"></i> ' + esc(d) + "</p>" : "") +
          (e.location ? '<p class="event-location"><i class="fas fa-map-marker-alt"></i> ' + esc(e.location) + "</p>" : "") +
          "<p>" + esc(e.description || "") + "</p></div></div>";
      }).join("");
    });
  }

  /* ------------------------------------------------------------- FAQ ---- */
  function renderFaq(faqs) {
    M.each(".faq-container", function (wrap) {
      wrap.innerHTML = faqs.map(function (f) {
        return '<div class="faq-item">' +
          '<div class="faq-question"><span>' + esc(f.question) + '</span><i class="fas fa-chevron-down"></i></div>' +
          '<div class="faq-answer"><p>' + esc(f.answer) + "</p></div>" +
          "</div>";
      }).join("");
    });
  }

  /* ------------------------------------------------------------- RUN ---- */
  ready(function () {
    var page = document.body.getAttribute("data-page");

    // Settings-driven fields common to all pages are handled by render-common.js.

    if (page === "home") {
      get("pages/home.json").then(function (c) {
        if (!c) return;
        renderHeroSlides(c.hero_slides || []);
        var map = {
          about_heading: c.about_heading, about_text_1: c.about_text_1, about_text_2: c.about_text_2,
          programs_heading: c.programs_heading, programs_subtitle: c.programs_subtitle,
          why_heading: c.why_heading, why_subtitle: c.why_subtitle,
          testimonials_heading: c.testimonials_heading, testimonials_subtitle: c.testimonials_subtitle,
          cta_heading: c.cta_heading, cta_text: c.cta_text
        };
        M.fillMap(document, map);
        M.each('[data-cms="about_button_text"]', function (el) { if (c.about_button_text) el.textContent = c.about_button_text; });
        M.each("[data-cms-about-button]", function (el) { if (c.about_button_link) el.href = c.about_button_link; });
      });
      get("programs.json").then(function (c) { if (c) renderProgramsGrid(c.programs || []); });
      get("testimonials.json").then(function (c) { if (c) renderTestimonials(c.testimonials || []); });
    }

    if (page === "about") {
      get("pages/about.json").then(function (c) {
        if (!c) return;
        M.fillMap(document, c);
      });
      get("pages/objectives.json").then(function (c) { if (c) renderObjectives(c.items || []); });
      get("pages/values.json").then(function (c) { if (c) renderValues(c.items || []); });
      get("founder.json").then(function (c) { renderFounder(c); });
      get("team.json").then(function (c) { if (c) renderTeam(c.members || []); });
    }

    if (page === "programs") {
      get("pages/programs.json").then(function (c) { if (c) M.fillMap(document, c); });
      get("programs.json").then(function (c) { if (c) renderProgramCards(c.programs || []); });
    }

    if (page === "events") {
      get("pages/events.json").then(function (c) { if (c) M.fillMap(document, c); });
      get("events.json").then(function (c) {
        if (!c) return;
        renderEventTypes(c.event_types || []);
        renderEventList(".upcoming-events-list", c.upcoming || []);
        renderEventList(".past-events-list", c.past || []);
      });
    }

    if (page === "contact") {
      get("pages/contact.json").then(function (c) { if (c) M.fillMap(document, c); });
      get("faq.json").then(function (c) { if (c) renderFaq(c.faqs || []); });
    }
  });
})();
