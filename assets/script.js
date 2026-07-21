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

  /* ---- Keep the dock above the browser UI ----
     position:fixed anchors to the LAYOUT viewport. Chrome Android holds that at
     its full URL-bar-hidden height, so whenever the URL bar slides back in (i.e.
     whenever you scroll up) the layout bottom is below the visible bottom and the
     dock disappears off-screen. Lift it by exactly the hidden amount.
     On iOS Safari the layout viewport is resized with the toolbars, so this
     difference is ~0 and the lift stays inactive - no double-shift. */
  var vv = window.visualViewport;
  if (vv) {
    var root = document.documentElement;
    var syncDock = function () {
      var hidden = root.clientHeight - (vv.height + vv.offsetTop);
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
    // Chrome slides the URL bar DURING a scroll and does not reliably fire
    // visualViewport.resize until it settles, so re-measure on scroll as well.
    window.addEventListener("scroll", onViewportChange, { passive: true });
    syncDock();
  }

  /* ---- Dock diagnostics: load the site with #dockdebug to enable ----
     Off for every normal visitor. Reports what the dock is ACTUALLY doing on a
     real device, so the bar can be debugged without a desktop DevTools cable. */
  if (window.location.hash.indexOf("dockdebug") > -1) {
    var dock = document.querySelector(".dock");
    var panel = document.createElement("pre");
    panel.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999;margin:0;" +
      "padding:8px 10px;font:11px/1.45 monospace;white-space:pre-wrap;" +
      "background:#000;color:#0f0;border-bottom:2px solid #0f0;max-height:56vh;overflow:auto";
    document.body.appendChild(panel);

    var mq = function (q) { return window.matchMedia(q).matches ? "YES" : "no"; };
    var report = function () {
      var d = document.documentElement;
      var r = dock ? dock.getBoundingClientRect() : null;
      var cs = dock ? getComputedStyle(dock) : null;
      var visH = vv ? vv.height : window.innerHeight;
      // Walk up from the dock: any ancestor with transform/filter/will-change/
      // contain/perspective steals the containing block from a fixed child and
      // is THE classic cause of a fixed bar scrolling away with the page.
      var culprits = [];
      for (var el = dock && dock.parentElement; el; el = el.parentElement) {
        var s = getComputedStyle(el);
        var bad = [];
        if (s.transform !== "none") bad.push("transform");
        if (s.filter !== "none") bad.push("filter");
        if (s.perspective !== "none") bad.push("perspective");
        if (s.contain && s.contain !== "none") bad.push("contain:" + s.contain);
        if (s.willChange && s.willChange !== "auto") bad.push("will-change:" + s.willChange);
        if (s.overflow !== "visible") bad.push("overflow:" + s.overflow);
        if (bad.length) culprits.push("  <" + el.tagName.toLowerCase() + "> " + bad.join(", "));
      }
      panel.textContent = [
        "scrollY        " + Math.round(window.scrollY),
        "innerHeight    " + window.innerHeight,
        "clientHeight   " + d.clientHeight,
        "vv.height      " + Math.round(visH) + "   offsetTop " + (vv ? Math.round(vv.offsetTop) : "-") +
          "   scale " + (vv ? vv.scale : "-"),
        "hidden below   " + Math.round(d.clientHeight - (visH + (vv ? vv.offsetTop : 0))) +
          "   <- URL bar height when >0",
        "--dock-lift    " + (d.style.getPropertyValue("--dock-lift") || "(unset)") +
          "   computed bottom " + (dock ? getComputedStyle(dock).bottom : "-"),
        "",
        "innerWidth     " + window.innerWidth + "   clientWidth " + d.clientWidth +
          "   dpr " + window.devicePixelRatio,
        "",
        "dock position  " + (cs ? cs.position : "NO DOCK FOUND"),
        "dock rect      left " + (r ? Math.round(r.left) : "-") + "  right " + (r ? Math.round(r.right) : "-") +
          "  width " + (r ? Math.round(r.width) : "-"),
        "dock fits      " + (r ? (r.left >= -1 && r.right <= d.clientWidth + 1 ? "YES" : "NO - OVERFLOWS") : "-"),
        "dock scrollW   " + (dock ? dock.scrollWidth : "-") + " (> width means CONTENT overflows)",
        "last item      " + (function () {
          var last = dock && dock.querySelector("#dockMenuBtn");
          if (!last) return "not found";
          var lr = last.getBoundingClientRect();
          return "right " + Math.round(lr.right) +
            (lr.right <= d.clientWidth + 1 ? "  (on screen)" : "  OFF SCREEN");
        })(),
        "dock rect      top " + (r ? Math.round(r.top) : "-") + "  bottom " + (r ? Math.round(r.bottom) : "-"),
        "dock visible   " + (r ? (r.bottom <= visH + 1 && r.top >= -1 ? "YES" : "NO - OFF SCREEN") : "-"),
        "dock opacity   " + (cs ? cs.opacity : "-") + "   display " + (cs ? cs.display : "-"),
        "dock bottom    " + (cs ? cs.bottom : "-"),
        "",
        "touch media    hover:none " + mq("(hover:none)") + "   pointer:coarse " + mq("(pointer:coarse)"),
        "width media    <=560 " + mq("(max-width:560px)") + "   561-900 " + mq("(min-width:561px) and (max-width:900px)"),
        "",
        "ancestors that break position:fixed:",
        culprits.length ? culprits.join("\n") : "  none"
      ].join("\n");
    };
    report();
    window.addEventListener("scroll", report, { passive: true });
    window.addEventListener("resize", report);
    if (vv) { vv.addEventListener("resize", report); vv.addEventListener("scroll", report); }
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
