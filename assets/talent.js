/* =========================================================
   Tahsin Tazwar — Talent Network forms
   Vanilla JS, no dependencies. Drives both the Experienced and the Fresher
   form from the same code: everything the validator needs is declared on the
   markup, so adding a field never means editing this file.
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.TALENT_CONFIG || {};
  var GENERIC_ERROR = "Something went wrong. Please try again.";
  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var ALLOWED_EXT = ["pdf", "doc", "docx"];
  /* A real person needs longer than this to read the form, let alone fill it.
     Anything faster is a script, and is dropped before it reaches the network. */
  var MIN_FILL_MS = 4000;

  var loadedAt = Date.now();
  /* Load any talent network page with #formdebug to see the real failure code
     next to the friendly message. Off for every normal visitor. */
  var DEBUG = window.location.hash.indexOf("formdebug") > -1;

  /* ---------------------------------------------------------
     Small helpers
     --------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function fieldOf(el) { return el.closest(".field") || el.closest(".fieldset"); }
  function ext(name) {
    var i = name.lastIndexOf(".");
    return i < 0 ? "" : name.slice(i + 1).toLowerCase();
  }
  function prettySize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  /* ---------------------------------------------------------
     Character counters
     --------------------------------------------------------- */
  $$("[data-counter]").forEach(function (el) {
    var out = $("#" + el.getAttribute("data-counter"));
    if (!out) return;
    var max = parseInt(el.getAttribute("maxlength"), 10);
    var sync = function () {
      var n = el.value.length;
      out.textContent = n + " / " + max;
      out.classList.toggle("over", n > max);
    };
    el.addEventListener("input", sync);
    sync();
  });

  /* ---------------------------------------------------------
     Multi select pills
     The checked state is mirrored onto the label as a class so engines without
     :has() still paint the selection.
     --------------------------------------------------------- */
  $$(".pill input[type='checkbox']").forEach(function (box) {
    var label = box.closest(".pill");
    var sync = function () { label.classList.toggle("is-on", box.checked); };
    box.addEventListener("change", function () {
      sync();
      var group = box.closest(".fieldset");
      if (group) clearError(group);
    });
    sync();
  });

  /* ---------------------------------------------------------
     Conditional blocks: a select whose value reveals another field
     --------------------------------------------------------- */
  $$("[data-reveal]").forEach(function (sel) {
    var target = $("#" + sel.getAttribute("data-reveal"));
    var when = sel.getAttribute("data-reveal-when");
    if (!target) return;
    var sync = function () {
      var on = sel.value === when;
      target.hidden = !on;
      /* A hidden control must not be required, or the browser blocks submit on
         a field nobody can see. The validator skips hidden fields too. */
      $$("input, select, textarea", target).forEach(function (c) {
        if (on) { if (c.getAttribute("data-required") === "true") c.required = true; }
        else { c.required = false; clearError(c); }
      });
    };
    sel.addEventListener("change", sync);
    sync();
  });

  /* ---------------------------------------------------------
     File input
     --------------------------------------------------------- */
  $$("input[type='file']").forEach(function (input) {
    var wrap = fieldOf(input);
    var nameOut = $(".file-name", wrap);
    var clearBtn = $(".file-clear", wrap);
    var empty = nameOut ? nameOut.textContent : "";

    var show = function () {
      var f = input.files && input.files[0];
      if (!nameOut) return;
      if (f) {
        nameOut.textContent = f.name + "  (" + prettySize(f.size) + ")";
        nameOut.classList.add("has-file");
        if (clearBtn) clearBtn.hidden = false;
      } else {
        nameOut.textContent = empty;
        nameOut.classList.remove("has-file");
        if (clearBtn) clearBtn.hidden = true;
      }
    };
    input.addEventListener("change", function () { clearError(input); show(); });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        clearError(input);
        show();
        input.focus();
      });
    }
    show();
  });

  /* ---------------------------------------------------------
     Errors
     --------------------------------------------------------- */
  function setError(el, msg) {
    var box = fieldOf(el);
    if (!box) return;
    box.classList.add("has-error");
    var out = $(".field-error", box);
    if (out) out.textContent = msg;
    if (el.setAttribute) el.setAttribute("aria-invalid", "true");
  }
  function clearError(el) {
    var box = el.classList && el.classList.contains("fieldset") ? el : fieldOf(el);
    if (!box) return;
    box.classList.remove("has-error");
    $$("[aria-invalid]", box).forEach(function (c) { c.removeAttribute("aria-invalid"); });
  }

  /* ---------------------------------------------------------
     Validation, driven entirely by markup attributes
     --------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  function labelFor(el) {
    return el.getAttribute("data-label") || el.name || "This field";
  }

  function validateControl(el) {
    /* Anything inside a hidden container is not on screen and is not judged. */
    if (el.closest("[hidden]")) return null;
    if (el.classList.contains("hp-input")) return null;

    var val = (el.value || "").trim();
    var label = labelFor(el);
    var required = el.hasAttribute("required");

    if (el.type === "file") {
      var f = el.files && el.files[0];
      if (!f) return required ? label + " is required." : null;
      if (ALLOWED_EXT.indexOf(ext(f.name)) < 0) return "Use a PDF, DOC or DOCX file.";
      if (f.size > MAX_FILE_BYTES) return "File is " + prettySize(f.size) + ". The limit is 5 MB.";
      return null;
    }

    if (!val) return required ? label + " is required." : null;

    var kind = el.getAttribute("data-check");
    if (kind === "email" && !EMAIL_RE.test(val)) return "Enter a valid email address.";
    if (kind === "tel") {
      var digits = val.replace(/[^0-9]/g, "");
      if (digits.length < 7 || digits.length > 18) return "Enter a valid WhatsApp number with country code.";
    }
    if (kind === "url" && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(val)) {
      return "Enter a full link starting with https://";
    }
    if (el.type === "number") {
      var n = Number(val);
      if (!isFinite(n)) return "Enter a number.";
      if (el.hasAttribute("min") && n < Number(el.min)) return label + " cannot be below " + el.min + ".";
      if (el.hasAttribute("max") && n > Number(el.max)) return label + " cannot be above " + el.max + ".";
    }
    var max = parseInt(el.getAttribute("maxlength"), 10);
    if (max && val.length > max) return "Keep this under " + max + " characters.";

    return null;
  }

  function validateForm(form) {
    var firstBad = null;

    $$(".field, .fieldset", form).forEach(clearError);

    $$("input, select, textarea", form).forEach(function (el) {
      if (!el.name || el.type === "checkbox" || el.type === "radio") return;
      var msg = validateControl(el);
      if (msg) {
        setError(el, msg);
        if (!firstBad) firstBad = el;
      }
    });

    /* Checkbox groups that need at least one choice. */
    $$("[data-min-checked]", form).forEach(function (group) {
      var need = parseInt(group.getAttribute("data-min-checked"), 10) || 1;
      var boxes = $$("input[type='checkbox']", group);
      var on = boxes.filter(function (b) { return b.checked; }).length;
      if (on < need) {
        var out = $(".field-error", group);
        group.classList.add("has-error");
        if (out) out.textContent = "Choose at least " + (need === 1 ? "one option." : need + " options.");
        if (!firstBad) firstBad = boxes[0];
      }
    });

    return firstBad;
  }

  /* Live cleanup: an error clears as soon as the visitor fixes it. */
  $$("form.tn-form").forEach(function (form) {
    form.addEventListener("input", function (e) {
      var el = e.target;
      if (el.name && fieldOf(el) && fieldOf(el).classList.contains("has-error")) {
        if (!validateControl(el)) clearError(el);
      }
    });
  });

  /* ---------------------------------------------------------
     Payload
     --------------------------------------------------------- */
  function collect(form) {
    var data = {};
    $$("input, select, textarea", form).forEach(function (el) {
      /* The honeypot travels at the top level of the payload, not inside the
         profile data, so it is left out here. */
      if (!el.name || el.type === "file" || el.classList.contains("hp-input")) return;
      if (el.type === "checkbox") {
        if (!el.checked) return;
        if (!Array.isArray(data[el.name])) data[el.name] = [];
        data[el.name].push(el.value);
        return;
      }
      if (el.type === "radio" && !el.checked) return;
      data[el.name] = (el.value || "").trim();
    });
    return data;
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        /* readAsDataURL gives "data:<mime>;base64,<payload>" — the backend
           wants only the payload. */
        var s = String(reader.result);
        var comma = s.indexOf(",");
        resolve(comma < 0 ? "" : s.slice(comma + 1));
      };
      reader.onerror = function () { reject(new Error("read failed")); };
      reader.readAsDataURL(file);
    });
  }

  /* XHR rather than fetch: it is the only way to get real upload progress, and
     a text/plain body keeps this a simple CORS request, so the browser never
     sends a preflight that an Apps Script Web App cannot answer. */
  function post(url, payload, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "text/plain;charset=utf-8");
      xhr.timeout = 180000;
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) onProgress(e.loaded / e.total);
        };
      }
      xhr.onload = function () {
        var body = null;
        try { body = JSON.parse(xhr.responseText); } catch (err) { body = null; }
        if (xhr.status >= 200 && xhr.status < 300 && body && body.ok) { resolve(body); return; }
        /* Three distinct failures that look identical to a visitor and must not
           look identical to whoever is debugging: the script answered and
           refused, the script answered with something that is not our JSON
           (a Google login page means the deployment is not open to anyone), or
           the transport failed. */
        if (body && body.error) {
          reject(new Error(body.error + (body.details ? ": " + body.details.join("; ") : "")));
        } else {
          reject(new Error("http " + xhr.status + ", response was not our JSON"));
        }
      };
      xhr.onerror = function () { reject(new Error("request blocked before any reply, CORS or network")); };
      xhr.ontimeout = function () { reject(new Error("timed out")); };
      xhr.send(JSON.stringify(payload));
    });
  }

  /* ---------------------------------------------------------
     Submission
     --------------------------------------------------------- */
  $$("form.tn-form").forEach(function (form) {
    var type = form.getAttribute("data-form-type");
    var btn = $("[data-submit]", form);
    var btnLabel = $("[data-submit-label]", form);
    var idleLabel = btnLabel ? btnLabel.textContent : "Submit Profile";
    var spinner = $("[data-spinner]", form);
    var alertBox = $("[data-alert]", form);
    var progress = $("[data-progress]", form);
    var progressBar = $("[data-progress-bar]", form);
    var progressLabel = $("[data-progress-label]", form);
    var panel = form.closest(".form-panel");
    var done = $("[data-done]", panel ? panel.parentNode : document);

    function busy(on, label) {
      btn.disabled = on;
      form.setAttribute("aria-busy", on ? "true" : "false");
      if (spinner) spinner.hidden = !on;
      if (btnLabel) btnLabel.textContent = on ? (label || "Submitting") : idleLabel;
    }
    function showAlert(msg) {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.hidden = false;
    }
    function hideAlert() { if (alertBox) alertBox.hidden = true; }
    function setProgress(frac, text) {
      if (!progress) return;
      progress.hidden = false;
      if (progressBar) progressBar.style.width = Math.round(frac * 100) + "%";
      if (progressLabel) progressLabel.textContent = text;
    }
    function hideProgress() {
      if (progress) progress.hidden = true;
      if (progressBar) progressBar.style.width = "0%";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideAlert();

      var bad = validateForm(form);
      if (bad) {
        var box = fieldOf(bad);
        if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
        if (bad.focus) bad.focus({ preventScroll: true });
        return;
      }

      if (!CFG.endpoint || CFG.endpoint.indexOf("http") !== 0) {
        showAlert(GENERIC_ERROR);
        return;
      }

      /* Bot checks that cost a genuine visitor nothing. */
      var hp = $(".hp-input", form);
      var elapsed = Date.now() - loadedAt;
      if ((hp && hp.value) || elapsed < MIN_FILL_MS) {
        /* Silently behave like a success so a script learns nothing, but send
           no data anywhere. */
        finish();
        return;
      }

      var fileInput = $("input[type='file']", form);
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;

      busy(true, "Submitting");
      if (file) setProgress(0.02, "Preparing " + file.name);

      Promise.resolve()
        .then(function () { return file ? readFileAsBase64(file) : null; })
        .then(function (b64) {
          var payload = {
            type: type,
            key: CFG.key || "",
            website: hp ? hp.value : "",
            elapsedMs: elapsed,
            data: collect(form)
          };
          if (file && b64) {
            payload.resume = {
              name: file.name,
              mime: file.type || "application/octet-stream",
              size: file.size,
              data: b64
            };
          }
          return post(CFG.endpoint, payload, function (frac) {
            /* Cap the bar below 100 until the server actually answers, so it
               never claims to be finished while the request is still open. */
            var shown = 0.05 + frac * 0.9;
            setProgress(shown, file ? "Uploading " + Math.round(shown * 100) + "%" : "Sending");
          });
        })
        .then(function () {
          setProgress(1, "Done");
          finish();
        })
        .catch(function (err) {
          busy(false);
          hideProgress();
          /* A visitor never sees a raw error. The real reason goes to the
             console always, and onto the page when the URL carries
             #formdebug — same convention as the dock diagnostics in
             assets/script.js. */
          var reason = (err && err.message) || "unknown";
          if (window.console && console.warn) console.warn("[talent] submit failed: " + reason);
          showAlert(DEBUG ? GENERIC_ERROR + "   [" + reason + "]" : GENERIC_ERROR);
        });
    });

    function finish() {
      busy(false);
      hideProgress();
      if (panel) panel.hidden = true;
      if (done) {
        done.hidden = false;
        done.setAttribute("tabindex", "-1");
        done.focus({ preventScroll: true });
        done.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  /* ---------------------------------------------------------
     Experienced path: reveal the form from the choice cards.
     The section carries `hidden` in the markup so it never flashes on screen
     during load; a noscript rule in the page unhides it when scripting is off.
     --------------------------------------------------------- */
  var opener = $("[data-open-form]");
  if (opener) {
    var target = $("#" + opener.getAttribute("data-open-form"));
    if (target) {
      var openIt = function (scroll) {
        target.hidden = false;
        opener.setAttribute("aria-expanded", "true");
        if (scroll) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          var first = $("input, select, textarea", target);
          if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 420);
        }
      };
      target.hidden = true;
      opener.setAttribute("aria-expanded", "false");
      opener.addEventListener("click", function () { openIt(true); });
      /* Deep link straight to the form, e.g. from an email or a profile bio. */
      if (window.location.hash === "#profile") openIt(false);
    }
  }

  /* ---------------------------------------------------------
     Shared chrome: footer year, dock menu, theme toggle.
     Same behaviour as the home page, kept here so the sub pages do not have to
     load the full home page script (globe, counters, scrollspy).
     --------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
    $$("a", dockMenu).forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("click", function (e) {
      if (!dockMenu.contains(e.target) && e.target !== menuBtn) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  var themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "light" ? "#fbfdf2" : "#0a0d05");
      try { localStorage.setItem("theme", next); } catch (err) {}
    });
  }

  /* Reveal on scroll — same contract as the home page. */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* Dock viewport glue. Identical maths to the home page: position:fixed
     anchors to the layout viewport, which on Chrome Android sits below the
     visible bottom whenever the URL bar is on screen. See assets/script.js for
     the full reasoning before changing anything here. */
  var vv = window.visualViewport;
  if (vv) {
    var root = document.documentElement;
    var dockEl = document.querySelector(".dock");
    var applyDock = function () {
      var lift = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      root.style.setProperty("--dock-lift", (lift < 2 ? 0 : Math.round(lift)) + "px");
      var x = Math.max(0, vv.offsetLeft);
      var s = 1;
      if (dockEl && dockEl.offsetWidth > 0) s = Math.min(1, vv.width / dockEl.offsetWidth);
      root.style.setProperty("--dock-x", (x < 1 ? 0 : Math.round(x)) + "px");
      root.style.setProperty("--dock-s", s > 0.999 ? "1" : s.toFixed(4));
    };
    var settle = null;
    var onViewportChange = function () {
      if (settle) clearTimeout(settle);
      settle = setTimeout(applyDock, 100);
    };
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    window.addEventListener("scroll", onViewportChange, { passive: true });
    applyDock();
  }
})();
