/*
 * Mary Gold — shared header/footer/settings renderer + WhatsApp button.
 * Runs on every public page after content.js.
 */
(function () {
  "use strict";

  var M = window.MG;
  if (!M) return;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    M.get("site/settings.json").then(function (s) {
      if (!s) return;
      M.applySettings(s);
      applyContactFragments(s);
      addWhatsAppButton(s);
      updateFooterContact(s);
      window.dispatchEvent(new CustomEvent("mg:settings", { detail: s }));
    });
  });

  function applyContactFragments(s) {
    M.each('[data-cms="address_line1"]', function (el) { if (s.address_line1) el.textContent = s.address_line1; });
    M.each('[data-cms="address_line2"]', function (el) { if (s.address_line2) el.textContent = s.address_line2; });
  }

  function updateFooterContact(s) {
    M.each("[data-cms-footer-contact]", function (el) {
      el.innerHTML =
        '<li><i class="fas fa-map-marker-alt"></i> ' + M.esc(s.address || "") + '</li>' +
        '<li><i class="fas fa-phone"></i> ' + M.esc(s.phone || "") + '</li>' +
        '<li><i class="fas fa-envelope"></i> ' + M.esc(s.email || "") + '</li>';
    });
    M.each("[data-cms-footer-copyright]", function (el) {
      el.innerHTML = '<p>&copy; ' + M.esc(s.copyright || "") + '</p><p>' + M.esc(s.credit || "") + '</p>';
    });
    M.each('[data-cms="footer_about"]', function (el) { if (s.footer_about) el.textContent = s.footer_about; });
  }

  function addWhatsAppButton(s) {
    if (document.querySelector(".mg-whatsapp")) return;
    var num = (s.whatsapp || s.phone || "").replace(/\D/g, "");
    if (!num) return;
    var msg = encodeURIComponent(s.whatsapp_message || "Hello, I would like to know more.");
    var a = document.createElement("a");
    a.className = "mg-whatsapp";
    a.href = "https://wa.me/" + num + "?text=" + msg;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Chat on WhatsApp");
    a.innerHTML = '<i class="fab fa-whatsapp"></i>';
    document.body.appendChild(a);
  }
})();
