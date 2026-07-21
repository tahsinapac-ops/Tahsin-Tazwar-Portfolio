/* =========================================================
   Tahsin Tazwar — Portfolio interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Footer year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Nav: shadow on scroll ---- */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile menu toggle ---- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close menu after clicking a link
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Animated stat counters ---- */
  function formatNum(n) {
    if (n >= 1000) return Math.round(n).toLocaleString("en-US");
    return String(Math.round(n));
  }
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = formatNum(target) + suffix; return; }
    var start = null, dur = 1600;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = formatNum(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var stats = document.querySelectorAll(".stat-num[data-count]");
  if (stats.length) {
    if (!("IntersectionObserver" in window)) {
      stats.forEach(animateCount);
    } else {
      var statObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      stats.forEach(function (el) { statObs.observe(el); });
    }
  }

  /* ---- Active nav link on scroll (scrollspy) ---- */
  var sections = document.querySelectorAll("section[id]");
  var navMap = {};
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(function (a) {
    navMap[a.getAttribute("href").slice(1)] = a;
  });
  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = navMap[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove("active"); });
          link.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- Dock overflow menu ---- */
  var menuBtn = document.getElementById("dockMenuBtn");
  var dockMenu = document.getElementById("dockMenu");
  if (menuBtn && dockMenu) {
    var setMenu = function (open) {
      dockMenu.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    };
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(!dockMenu.classList.contains("open"));
    });
    // Close after choosing a destination (but not when toggling the theme)
    dockMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    // Close on outside click or Escape
    document.addEventListener("click", function (e) {
      if (!dockMenu.contains(e.target) && e.target !== menuBtn) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---- Keep the dock pinned to the visible viewport ----
     position:fixed is anchored to the layout viewport, which on mobile drifts
     away from what the user actually sees when the keyboard opens or they
     pinch-zoom. visualViewport reports the real visible box, so we lift the
     dock by the difference and it stays glued to the bottom in every view. */
  var vv = window.visualViewport;
  if (vv) {
    var root = document.documentElement;
    // How much of the layout viewport is currently NOT visible at the bottom.
    // This one measurement is correct on every engine, which is why it is applied
    // unconditionally rather than gated on a guessed threshold:
    //   Chrome Android - layout viewport is the FULL-height (URL-bar-hidden) box,
    //     so while the URL bar is on screen this is ~56-100px and the dock would
    //     otherwise sit below the visible area. We lift it back into view.
    //   iOS Safari - the layout viewport is resized with the toolbars, so
    //     clientHeight already equals vv.height and this evaluates to ~0. No
    //     double-shift; the lift simply stays inactive.
    //   Any platform, keyboard open - the visual viewport shrinks by the keyboard
    //     height and the same expression lifts the dock above it.
    var syncDock = function () {
      var hidden = root.clientHeight - (vv.height + vv.offsetTop);
      // Clamp: never push the bar more than half the screen up, and ignore
      // sub-pixel noise so we are not writing a style on every scroll frame.
      var lift = Math.min(Math.max(hidden, 0), vv.height * 0.5);
      root.style.setProperty("--dock-lift", (lift < 2 ? 0 : Math.round(lift)) + "px");
    };
    var queued = false;
    var onViewportChange = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; syncDock(); });
    };
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    syncDock();
  }

  /* ---- Light / dark theme toggle ---- */
  var themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      // Keep the mobile browser address-bar colour in sync with the theme
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "light" ? "#faf8ff" : "#0d0720");
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }
})();
