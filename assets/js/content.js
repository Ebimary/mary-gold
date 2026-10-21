/*
 * Mary Gold — content renderer.
 * Loads Git-managed JSON content (edited via /admin) and injects it into the
 * existing markup. The public design is never changed: elements are located by
 * data-cms / data-cms-list attributes and only their text/attributes are filled.
 */
(function () {
  "use strict";

  var base = "/content/";

  function get(path) {
    return fetch(base + path, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("Missing content: " + path);
      return r.json();
    }).catch(function (e) {
      console.warn("[cms]", e.message);
      return null;
    });
  }

  function setText(el, value) {
    if (el == null || value == null) return;
    el.textContent = value;
  }

  function setHTML(el, value) {
    if (el == null || value == null) return;
    var v = String(value).trim();
    // Rich text is authored as markdown; convert the common subset safely.
    el.innerHTML = /<[a-z][\s\S]*>/i.test(v) ? v : markdownToHtml(v);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Minimal markdown -> HTML (headings, bold, italic, links, lists, paragraphs).
  function markdownToHtml(md) {
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    var html = "", inList = false, para = [];

    function inline(t) {
      return esc(t)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/_([^_]+)_/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    }
    function flushPara() {
      if (para.length) { html += "<p>" + inline(para.join(" ")) + "</p>"; para = []; }
    }
    function closeList() { if (inList) { html += "</ul>"; inList = false; } }

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { flushPara(); closeList(); return; }
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flushPara(); closeList(); var n = h[1].length; html += "<h" + n + ">" + inline(h[2]) + "</h" + n + ">"; return; }
      var li = line.match(/^[-*+]\s+(.*)$/);
      if (li) { flushPara(); if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inline(li[1]) + "</li>"; return; }
      para.push(line);
    });
    flushPara(); closeList();
    return html;
  }

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  function applySettings(s) {
    if (!s) return;
    // Logo(s)
    each("[data-cms-logo]", function (el) { if (s.logo) el.src = s.logo; });
    // Generic text: data-cms="field"
    var map = {
      "site_name": s.site_name, "tagline": s.tagline,
      "phone": s.phone, "email": s.email, "address": s.address,
      "address_line1": s.address_line1, "address_line2": s.address_line2,
      "footer_about": s.footer_about,
      "office_hours_weekdays": s.office_hours_weekdays,
      "office_hours_weekdays_time": s.office_hours_weekdays_time,
      "office_hours_saturday": s.office_hours_saturday,
      "office_hours_saturday_time": s.office_hours_saturday_time,
      "office_hours_sunday": s.office_hours_sunday,
      "office_hours_sunday_time": s.office_hours_sunday_time,
      "copyright": s.copyright, "credit": s.credit
    };
    Object.keys(map).forEach(function (k) {
      each('[data-cms="' + k + '"]', function (el) { if (map[k] != null) el.textContent = map[k]; });
    });
    // Phone/email/address full replacements
    each('[data-cms="phone"]', function (el) { if (s.phone) el.textContent = s.phone; });
    each('[data-cms="email"]', function (el) { if (s.email) el.textContent = s.email; });
    // tel/mailto links
    each('a[href^="tel:"][data-cms-tel]', function (el) { if (s.phone) el.href = "tel:" + s.phone.replace(/\s+/g, ""); });
    each('a[href^="mailto:"][data-cms-mail]', function (el) { if (s.email) el.href = "mailto:" + s.email; });
    // Social links
    [["facebook", s.facebook], ["twitter", s.twitter], ["instagram", s.instagram], ["linkedin", s.linkedin]].forEach(function (pair) {
      each('[data-cms-social="' + pair[0] + '"]', function (el) { if (pair[1]) el.href = pair[1]; });
    });
    window.__MG_SITE__ = s;
  }

  function fillMap(root, map) {
    Object.keys(map).forEach(function (k) {
      var v = map[k];
      Array.prototype.forEach.call(root.querySelectorAll('[data-cms="' + k + '"]'), function (el) {
        if (v == null) return;
        if (el.hasAttribute("data-cms-html")) setHTML(el, v); else setText(el, v);
      });
    });
  }

  function renderList(container, items, tmplFn) {
    if (!container || !items) return;
    container.innerHTML = items.map(tmplFn).join("");
  }

  function src(p) { return p; }

  window.MG = {
    get: get, setText: setText, setHTML: setHTML, esc: esc,
    markdownToHtml: markdownToHtml, each: each, applySettings: applySettings,
    fillMap: fillMap, renderList: renderList, src: src
  };
})();
