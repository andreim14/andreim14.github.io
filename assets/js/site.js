/* andreim14.github.io · no framework, no dependencies. Content works without this file. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var track = function (name, params) { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); };

  /* ---- toast + copy ---- */
  var toastEl = $(".toast"), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 1800);
  }
  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast("Copied " + text); }, function () {});
  }
  $$("[data-copy]").forEach(function (el) {
    el.addEventListener("click", function () { copy(el.getAttribute("data-copy")); track("email_click"); });
  });
  $$('a[href$="cv.pdf"]').forEach(function (a) { a.addEventListener("click", function () { track("cv_open"); }); });

  /* ---- theme ---- */
  function currentTheme() {
    return doc.dataset.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    doc.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    requestAnimationFrame(drawLines);
  }
  $$("[data-theme-toggle]").forEach(function (b) { b.addEventListener("click", toggleTheme); });

  /* ---- top bar ---- */
  var bar = $(".topbar");
  function onScrollBar() { if (bar) bar.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScrollBar, { passive: true }); onScrollBar();

  /* ---- sense cards: hover or tap a word to see which sense is meant ---- */
  var card = document.createElement("div");
  card.className = "sense-card"; card.setAttribute("role", "tooltip"); card.id = "sense-card";
  document.body.appendChild(card);
  var openSense = null;
  function showSense(el) {
    var parts = (el.getAttribute("data-sense") || "").split("|");
    card.innerHTML = "<b></b><i></i><span></span>";
    card.children[0].textContent = parts[0] || ""; card.children[1].textContent = parts[1] || ""; card.children[2].textContent = parts[2] || "";
    var r = el.getBoundingClientRect(), w = Math.min(290, window.innerWidth - 24);
    card.style.maxWidth = w + "px";
    card.classList.add("on");
    var ch = card.offsetHeight;
    var left = Math.max(12, Math.min(window.scrollX + r.left + r.width / 2 - w / 2, window.scrollX + window.innerWidth - w - 12));
    var top = window.scrollY + r.top - ch - 12;
    if (r.top - ch - 12 < 70) top = window.scrollY + r.bottom + 12;
    card.style.left = left + "px"; card.style.top = top + "px";
    el.setAttribute("aria-describedby", "sense-card"); openSense = el;
    track("sense_card", { word: parts[0] });
  }
  function hideSense() { card.classList.remove("on"); if (openSense) openSense.removeAttribute("aria-describedby"); openSense = null; }
  $$(".sense").forEach(function (el) {
    el.addEventListener("mouseenter", function () { showSense(el); });
    el.addEventListener("mouseleave", hideSense);
    el.addEventListener("focus", function () { showSense(el); });
    el.addEventListener("blur", hideSense);
    el.addEventListener("click", function (e) { e.preventDefault(); openSense === el ? hideSense() : showSense(el); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideSense(); });
  window.addEventListener("scroll", function () { if (openSense && !openSense.matches(":hover")) hideSense(); }, { passive: true });

  /* ---- hero: the bio grounds itself ---- */
  var hero = $(".hero"), svg = $(".ground-lines"), NS = "http://www.w3.org/2000/svg";
  var linesOn = false;
  function drawLines() {
    if (!hero || !svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (window.innerWidth <= 900) return;
    var hb = hero.getBoundingClientRect();
    $$(".cite", hero).forEach(function (c) {
      var n = c.getAttribute("data-cite"), src = $('.sources [data-src="' + n + '"] .n', hero);
      if (!src) return;
      var a = c.getBoundingClientRect(), b = src.getBoundingClientRect();
      var x1 = a.right - hb.left + 2, y1 = a.top + a.height / 2 - hb.top;
      var x2 = b.left - hb.left - 6, y2 = b.top + b.height / 2 - hb.top;
      var dx = Math.max(60, (x2 - x1) * 0.55);
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", "M" + x1 + "," + y1 + " C" + (x1 + dx) + "," + y1 + " " + (x2 - dx) + "," + y2 + " " + x2 + "," + y2);
      p.setAttribute("data-line", n);
      p.style.transition = "none";
      svg.appendChild(p);
      var len = p.getTotalLength(); p.style.setProperty("--len", len);
      p.getBoundingClientRect(); p.style.transition = "";
      var dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", x2); dot.setAttribute("cy", y2); dot.setAttribute("r", 3.5); dot.setAttribute("data-line", n);
      svg.appendChild(dot);
      if (linesOn || c.classList.contains("on") || !hero.classList.contains("animate")) { p.classList.add("drawn"); dot.classList.add("drawn"); }
      var li = $('.sources [data-src="' + n + '"]', hero);
      if (linesOn || (li && li.classList.contains("stamped"))) { p.classList.add("gone"); dot.classList.add("gone"); }
    });
  }
  function setHot(n, on) {
    $$('[data-line="' + n + '"]', svg || document).forEach(function (el) { el.classList.toggle("hot", on); });
    var s = hero && $('.sources [data-src="' + n + '"]', hero); if (s) s.classList.toggle("hot", on);
    var c = hero && $('.cite[data-cite="' + n + '"]', hero); if (c) c.classList.toggle("hot", on);
    var cl = hero && $('.claim[data-claim="' + n + '"]', hero); if (cl) cl.classList.toggle("hot", on);
  }
  if (hero) {
    $$(".cite, .claim, .sources [data-src]", hero).forEach(function (el) {
      var n = el.getAttribute("data-cite") || el.getAttribute("data-claim") || el.getAttribute("data-src");
      el.addEventListener("mouseenter", function () { setHot(n, true); });
      el.addEventListener("mouseleave", function () { setHot(n, false); });
      el.addEventListener("focusin", function () { setHot(n, true); });
      el.addEventListener("focusout", function () { setHot(n, false); });
    });
    // touch screens have no hover: a tap on a claim shows its evidence
    $$(".claim", hero).forEach(function (cl) {
      cl.addEventListener("click", function (e) {
        if (e.target.closest(".sense")) return;
        var n = cl.getAttribute("data-claim"), was = cl.classList.contains("hot");
        $$(".claim.hot", hero).forEach(function (o) { setHot(o.getAttribute("data-claim"), false); });
        if (!was) setHot(n, true);
      });
    });
    $$(".cite", hero).forEach(function (c) {
      c.addEventListener("click", function (e) {
        var n = c.getAttribute("data-cite"), s = $('.sources [data-src="' + n + '"]', hero);
        if (window.innerWidth > 900 && s) { e.preventDefault(); setHot(n, true); setTimeout(function () { setHot(n, false); }, 1200); }
      });
    });

    var text = $(".answer-text", hero);
    var claims = $$(".claim", hero), cites = $$(".cite", hero), srcs = $$(".sources li", hero);
    var verdictBox = $(".verdict", hero), verdict = $("[data-verdict]", hero);

    if (reduce) {
      doc.classList.add("ready"); hero.classList.add("loaded"); linesOn = true;
      $$(".sources li", hero).forEach(function (li) { li.classList.add("stamped"); });
    } else {
      // Split words so the answer can stream in like a model response.
      var words = [];
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
          if (ch.nodeType === 3) {
            var frag = document.createDocumentFragment();
            ch.textContent.split(/(\s+)/).forEach(function (t) {
              if (!t) return;
              if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
              var s = document.createElement("span"); s.className = "w"; s.textContent = t; frag.appendChild(s); words.push(s);
            });
            ch.parentNode.replaceChild(frag, ch);
          } else if (ch.nodeType === 1 && !ch.classList.contains("cite")) {
            split(ch);
          }
        });
      })(text);

      hero.classList.add("animate");
      if (verdictBox) { verdictBox.classList.add("pending"); verdict.textContent = "generating answer…"; }
      requestAnimationFrame(function () { hero.classList.add("loaded"); });

      var t0 = 450, per = Math.min(32, 1500 / Math.max(words.length, 1));
      words.forEach(function (w, i) { setTimeout(function () { w.classList.add("in"); }, t0 + i * per); });
      var tVerify = t0 + words.length * per + 300, STEP = 1250;
      var ticks = $$(".ticks i", hero);
      setTimeout(function () { if (verdict) verdict.textContent = "fact-checking against sources…"; }, tVerify - 200);
      claims.forEach(function (cl, i) {
        var n = i + 1, at = tVerify + i * STEP, li = srcs[i];
        setTimeout(function () {
          if (ticks[i]) ticks[i].classList.add("active");
          if (verdict) verdict.textContent = "checking claim " + n + " of " + claims.length + "…";
          cl.classList.add("scan");
          if (cites[i]) cites[i].classList.add("on");
        }, at);
        setTimeout(function () {
          $$('[data-line="' + n + '"]', svg || document).forEach(function (el) { el.classList.add("drawn"); });
          if (li) li.classList.add("on", "checking");
        }, at + 300);
        setTimeout(function () {
          if (li) li.classList.add("stamped");
          if (ticks[i]) { ticks[i].classList.remove("active"); ticks[i].classList.add("on"); }
          if (verdict) verdict.textContent = "claim " + n + " supported";
          cl.classList.remove("scan");
        }, at + 850);
        setTimeout(function () {
          if (li) li.classList.remove("checking");
          $$('[data-line="' + n + '"]', svg || document).forEach(function (el) { el.classList.add("gone"); });
        }, at + STEP + 150);
      });
      setTimeout(function () {
        linesOn = true;
        if (verdictBox) verdictBox.classList.remove("pending");
        if (verdict) verdict.textContent = claims.length + " of " + claims.length + " claims supported · hover one to see why";
      }, tVerify + claims.length * STEP + 200);
    }
    drawLines();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLines);
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(drawLines, 120); });
    window.addEventListener("load", drawLines);
  }

  /* ---- reveal on scroll ---- */
  var revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, sibs = el.parentNode ? $$(":scope > .reveal", el.parentNode) : [];
        var i = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(i * 70, 350) + "ms";
        el.classList.add("in"); io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- metric count-up ---- */
  $$("[data-count-to]").forEach(function (el) {
    var from = +el.getAttribute("data-count-from"), to = +el.getAttribute("data-count-to");
    if (reduce || !("IntersectionObserver" in window)) return;
    el.textContent = from;
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var start = null, dur = 1400;
      (function step(ts) {
        if (!start) start = ts;
        var k = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      })(performance.now());
    }, { threshold: 0.6 });
    o.observe(el);
  });

  /* ---- agent run log loops while visible ---- */
  $$("[data-run]").forEach(function (log) {
    var items = $$("li", log), i = 0, timer = null;
    if (reduce) { items.forEach(function (li) { li.classList.add("on"); }); return; }
    function tick() {
      if (i === 0) items.forEach(function (li) { li.classList.remove("on"); });
      items[i].classList.add("on");
      i = (i + 1) % items.length;
      timer = setTimeout(tick, i === 0 ? 2600 : 650);
    }
    var o = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { if (!timer) tick(); }
      else { clearTimeout(timer); timer = null; }
    }, { threshold: 0.3 });
    o.observe(log);
  });

  /* ---- trace line and reading progress follow the scroll ---- */
  var trace = $("[data-trace]"), prog = $(".read-progress"), post = $(".post .doc-body");
  function onScrollProgress() {
    var vh = window.innerHeight;
    if (trace) {
      var r = trace.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      trace.style.setProperty("--p", p.toFixed(3));
    }
    if (prog && post) {
      var pr = post.getBoundingClientRect();
      var q = Math.min(1, Math.max(0, -pr.top / Math.max(1, pr.height - vh)));
      prog.style.setProperty("--p", q.toFixed(3));
    }
  }
  window.addEventListener("scroll", onScrollProgress, { passive: true }); onScrollProgress();

  /* ---- command menu ---- */
  var dlg = $("[data-cmdk]"), dataEl = $("#cmdk-data");
  if (dlg && dataEl && typeof dlg.showModal === "function") {
    var items = []; try { items = JSON.parse(dataEl.textContent); } catch (e) {}
    var input = $(".cmdk-input", dlg), list = $(".cmdk-list", dlg), shown = [], sel = 0;
    function render() {
      var q = input.value.trim().toLowerCase();
      shown = items.filter(function (it) {
        if (!q) return true;
        var hay = (it.t + " " + it.k).toLowerCase(), j = 0;
        for (var c = 0; c < hay.length && j < q.length; c++) if (hay[c] === q[j]) j++;
        return j === q.length;
      }).slice(0, 12);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.innerHTML = "";
      shown.forEach(function (it, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "option"); li.setAttribute("aria-selected", i === sel ? "true" : "false");
        li.textContent = it.t;
        var k = document.createElement("span"); k.textContent = it.k; li.appendChild(k);
        li.addEventListener("click", function () { run(it); });
        li.addEventListener("mousemove", function () { if (sel !== i) { sel = i; render(); } });
        list.appendChild(li);
      });
    }
    function run(it) {
      dlg.close(); track("cmdk_select", { item: it.t });
      if (it.a === "theme") return toggleTheme();
      if (it.a === "copy-email") return copy("stefan.bejgu@gmail.com");
      if (it.u) {
        if (/^https?:/.test(it.u)) window.open(it.u, "_blank", "noopener");
        else window.location.href = it.u;
      }
    }
    function open() { input.value = ""; sel = 0; render(); dlg.showModal(); input.focus(); track("cmdk_open"); }
    $$("[data-cmdk-open]").forEach(function (b) { b.addEventListener("click", open); });
    document.addEventListener("keydown", function (e) {
      var typing = /input|textarea/i.test((e.target || {}).tagName || "");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing && !dlg.open)) { e.preventDefault(); dlg.open ? dlg.close() : open(); }
    });
    input.addEventListener("input", function () { sel = 0; render(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
      else if (e.key === "Enter" && shown[sel]) { e.preventDefault(); run(shown[sel]); }
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }
})();
