/* =============================================================================
   Design Annotations — standalone, drop-in plugin
   -----------------------------------------------------------------------------
   A self-contained design-handoff layer for ANY web app. It gives you:

     1. A right-side DRAWER listing the design tasks for the current page.
     2. Visual HIGHLIGHTING of the page area each task refers to (hover a task).
     3. A "Show all" toggle that highlights every annotated element at once.
     4. A global TASK CENTER (modal) aggregating every task across every page,
        with search + per-page filtering.
     5. CROSS-PAGE navigation: click a task on another page and you are taken
        there, the relevant UI is revealed, and the element is highlighted.

   It is intentionally:
     • zero-dependency (vanilla JS, no build step, works via a <script> tag)
     • framework-agnostic (no React/Vue/router assumptions)
     • SINGLE SOURCE OF TRUTH (you pass ONE `annotations` array; the drawer and
       the task center are both derived from it — nothing to keep "in sync")
     • decoupled from the host (mount point, offsets, trigger, navigation and
       deep-link "reveal" behaviour are all configurable; sensible defaults).

   -----------------------------------------------------------------------------
   QUICK START
   -----------------------------------------------------------------------------
     <script src="design-annotations.js"></script>
     <script>
       DesignAnnotations.init({
         pages: [
           { id: 'customers', label: 'Customers', route: 'customers.html' },
           { id: 'invoices',  label: 'Invoices',  route: 'invoices.html'  },
         ],
         annotations: [
           {
             id: 'task-001',
             page: 'customers',
             kind: 'required',                 // 'required' | 'suggestion'
             title: 'Add status filter',
             description: 'Dropdown to filter customers by status',
             target: '#customer-status-filter',// CSS selector OR Element OR () => Element
             priority: 'medium',
             sub: ['Options come from real data', 'Updates the table on change'],
           },
         ],
         mount: '#app-content',                // element pushed aside when drawer opens (optional)
         topOffset: 56,                         // px from top of viewport for the drawer
         trigger: 'contextmenu',                // 'contextmenu' (right-click) | 'manual'
         taskCenter: { anchor: '.toolbar', position: 'after' }, // where to inject the button
       });
     </script>

   Right-click toggles the drawer. Press Esc to close. See the companion file
   APPLY-DESIGN-ANNOTATIONS.md for the full integration guide.
   ============================================================================= */

(function () {
  'use strict';

  /* ── configuration defaults ──────────────────────────────────────────── */
  var DEFAULTS = {
    pages: null,
    annotations: [],
    mount: null,            // selector/Element whose margin-right shifts when the drawer opens
    topOffset: 52,          // px
    drawerWidth: 320,       // px
    trigger: 'contextmenu', // 'contextmenu' | 'button' | 'manual' | array of these
    hotkey: 'mod+shift+a',  // keyboard shortcut to toggle the drawer ('' to disable)
    taskCenter: true,       // true | false | { anchor, position } | { mount }
    currentPageId: null,    // string | () => string | null (auto-infer from route)
    navigate: null,         // (pageId, page, intent) => void  (default: multipage)
    reveal: {},             // { revealKey: () => void }  deep-link hooks (open modal, switch tab…)
    accent: '#f59e0b',      // highlight + drawer accent colour
    tag: null,              // optional footer pill text in the drawer
    storageKey: 'da_pending', // sessionStorage key for cross-page intent
  };

  /* ── state ───────────────────────────────────────────────────────────── */
  var S = {
    cfg: null,
    pages: [],
    annotations: [],
    currentPageId: null,
    contextOverride: null,  // set by setContext() (e.g. when a host modal opens)
    // drawer
    drawer: null,
    drawerOpen: false,
    allOn: false,
    tooltipEl: null,
    allHandlers: [],
    mouseX: 0, mouseY: 0,
    // task center
    tcBackdrop: null,
    tcModal: null,
    tcOpen: false,
    tcFilter: 'all',
    tcSearch: '',
    tcBtn: null,
    fab: null,
    started: false,
  };

  /* ── tiny utilities ──────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function routeKey(route) {
    if (!route) return '';
    return String(route).split('?')[0].split('#')[0].split('/').pop() || 'index.html';
  }
  function currentRouteKey() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }
  function byId(id) {
    for (var i = 0; i < S.pages.length; i++) if (S.pages[i].id === id) return S.pages[i];
    return null;
  }
  function isEl(x) { return x && typeof x === 'object' && x.nodeType === 1; }

  /* ── normalisation: accept loose author input, emit a canonical shape ──── */
  function normalizeAnnotations(list) {
    return (list || []).map(function (a, i) {
      // Resolve the target, in order of explicitness. `match` is the live
      // text-match fallback used when no stable selector is known.
      var target = a.target || a.selector || null;
      if (!target && a.targetElementId) target = { elementId: a.targetElementId };
      if (!target && a.match) target = { text: a.match };
      return {
        id:          a.id || ('da-' + i),
        pageId:      a.page || a.pageId || null,
        title:       a.title || a.text || '(untitled)',
        description: a.description || '',
        kind:        a.kind === 'suggestion' ? 'suggestion' : 'required',
        target:      target,
        group:       a.group || a.epic || null,  // optional change-set / epic label
        sub:         Array.isArray(a.sub) ? a.sub : (Array.isArray(a.subItems) ? a.subItems : null),
        priority:    a.priority || null,
        reveal:      a.reveal || null,   // string key into cfg.reveal, OR a function
        status:      a.status || 'open',
      };
    });
  }

  function derivePages(annotations, declared) {
    if (declared && declared.length) {
      return declared.map(function (p) {
        return { id: p.id, label: p.label || p.id, route: p.route || p.href || null, reveal: p.reveal || null };
      });
    }
    // No pages declared → derive from annotation pageIds, in first-seen order.
    var seen = {}, out = [];
    annotations.forEach(function (a) {
      var pid = a.pageId || '_';
      if (!seen[pid]) { seen[pid] = true; out.push({ id: pid, label: pid, route: null, reveal: null }); }
    });
    return out;
  }

  function resolveCurrentPageId() {
    if (S.contextOverride) return S.contextOverride;
    var c = S.cfg.currentPageId;
    if (typeof c === 'function') return c();
    if (typeof c === 'string') return c;
    // Auto-infer: match a page route against the current URL.
    var key = currentRouteKey();
    for (var i = 0; i < S.pages.length; i++) {
      if (S.pages[i].route && routeKey(S.pages[i].route) === key) return S.pages[i].id;
    }
    // Fallback: if there is exactly one page, assume it.
    if (S.pages.length === 1) return S.pages[0].id;
    return null;
  }

  function annotationsForPage(pageId) {
    return S.annotations.filter(function (a) { return a.pageId === pageId; });
  }
  function findAnnotation(id) {
    for (var i = 0; i < S.annotations.length; i++) if (S.annotations[i].id === id) return S.annotations[i];
    return null;
  }

  /* =========================================================================
     HIGHLIGHT SERVICE  (one implementation, shared by drawer + task center)
     A target can be:
       • a CSS selector string            'th.amount'
       • a DOM Element
       • a () => Element | NodeList
       • a text descriptor                { text: 'Payments', within: 'th' }
            → finds the element whose visible text matches, no selector needed.
              Lets a task say "the column called Payments" in plain language.
       • a selector object                { selector: '...' } / { elementId: '...' }
     ========================================================================= */
  var TEXT_SCOPE_DEFAULT = 'th,[role="columnheader"],label,button,a,h1,h2,h3,h4,h5,legend,summary,caption';

  function findByText(needle, within) {
    var q = String(needle).trim().toLowerCase();
    if (!q) return [];
    var scope = within || TEXT_SCOPE_DEFAULT;
    var nodes;
    try { nodes = Array.prototype.slice.call(document.querySelectorAll(scope)); }
    catch (e) { return []; }
    var exact = [], partial = [];
    nodes.forEach(function (n) {
      var t = (n.textContent || '').trim().toLowerCase();
      if (!t) return;
      if (t === q) exact.push(n);
      else if (t.indexOf(q) !== -1) partial.push(n);
    });
    if (exact.length) return [exact[0]];
    // shortest partial match = most specific (e.g. the <th>, not its container)
    partial.sort(function (a, b) { return (a.textContent || '').length - (b.textContent || '').length; });
    return partial.length ? [partial[0]] : [];
  }

  function resolveTarget(target) {
    if (!target) return [];
    if (isEl(target)) return [target];
    if (typeof target === 'function') {
      try { var r = target(); return r ? (r.length != null ? Array.prototype.slice.call(r) : [r]) : []; }
      catch (e) { return []; }
    }
    if (typeof target === 'object') {
      if (target.text) return findByText(target.text, target.within);
      if (target.elementId) { var byid = document.getElementById(target.elementId); return byid ? [byid] : []; }
      if (target.selector) { try { return Array.prototype.slice.call(document.querySelectorAll(target.selector)); } catch (e) { return []; } }
      return [];
    }
    try { return Array.prototype.slice.call(document.querySelectorAll(target)); }
    catch (e) { return []; }
  }

  function clearHighlights() {
    document.querySelectorAll('.da-highlight').forEach(function (el) {
      el.classList.remove('da-highlight');
    });
  }

  function highlight(target, opts) {
    opts = opts || {};
    clearHighlights();
    var els = resolveTarget(target);
    if (!els.length) return false;
    els.forEach(function (el) { el.classList.add('da-highlight'); });
    if (opts.scroll) els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (opts.autoClearMs) {
      setTimeout(function () {
        els.forEach(function (el) { el.classList.remove('da-highlight'); });
      }, opts.autoClearMs);
    }
    return true;
  }

  /* ── "Show all" multi-highlight with hover tooltips ───────────────────── */
  function positionTooltip() {
    if (!S.tooltipEl) return;
    var tx = S.mouseX + 14, ty = S.mouseY + 14;
    if (tx + 280 > window.innerWidth)  tx = S.mouseX - 280;
    if (ty + 80  > window.innerHeight) ty = S.mouseY - 54;
    S.tooltipEl.style.left = tx + 'px';
    S.tooltipEl.style.top  = ty + 'px';
  }
  function showTooltip(text) {
    if (!S.tooltipEl) {
      S.tooltipEl = document.createElement('div');
      S.tooltipEl.className = 'da-el-tooltip';
      document.body.appendChild(S.tooltipEl);
    }
    S.tooltipEl.textContent = text;
    positionTooltip();
    S.tooltipEl.style.display = 'block';
  }
  function hideTooltip() { if (S.tooltipEl) S.tooltipEl.style.display = 'none'; }

  function showAllHighlights() {
    clearAllHighlights();
    annotationsForPage(S.currentPageId).forEach(function (a) {
      if (!a.target) return;
      resolveTarget(a.target).forEach(function (el) {
        el.classList.add('da-highlight');
        var enter = function () { showTooltip(a.title); };
        var leave = function () { hideTooltip(); };
        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', leave);
        S.allHandlers.push({ el: el, enter: enter, leave: leave });
      });
    });
  }
  function clearAllHighlights() {
    S.allHandlers.forEach(function (h) {
      h.el.classList.remove('da-highlight');
      h.el.removeEventListener('mouseenter', h.enter);
      h.el.removeEventListener('mouseleave', h.leave);
    });
    S.allHandlers = [];
    hideTooltip();
  }

  /* =========================================================================
     REVEAL  (replaces hardcoded modal openers / tab switches)
     An annotation may carry `reveal`: a key into cfg.reveal, OR a function.
     We run it, wait a beat for the DOM to settle, then highlight.
     ========================================================================= */
  function runReveal(reveal) {
    var fn = null;
    if (typeof reveal === 'function') fn = reveal;
    else if (typeof reveal === 'string' && S.cfg.reveal && S.cfg.reveal[reveal]) fn = S.cfg.reveal[reveal];
    if (!fn) return false;
    try { fn(); return true; } catch (e) { return false; }
  }

  /* =========================================================================
     NAVIGATION  (default: multipage — stash intent + set location.href)
     Host can override with cfg.navigate for SPAs.
     ========================================================================= */
  function defaultNavigate(pageId, page, intent) {
    if (intent) {
      try { sessionStorage.setItem(S.cfg.storageKey, JSON.stringify(intent)); } catch (e) {}
    }
    if (page && page.route) window.location.href = page.route;
  }

  function goToAnnotation(annotationId) {
    var a = findAnnotation(annotationId);
    if (!a) return;
    closeTaskCenter();
    if (a.pageId === S.currentPageId) {
      // Same page: reveal (if any) then highlight.
      if (a.reveal) { runReveal(a.reveal); setTimeout(function () { highlight(a.target, { scroll: true, autoClearMs: 3500 }); }, 400); }
      else setTimeout(function () { highlight(a.target, { scroll: true, autoClearMs: 3500 }); }, 180);
    } else {
      // Cross page: navigate; destination will consume the intent on load.
      var page = byId(a.pageId);
      var nav = S.cfg.navigate || defaultNavigate;
      nav(a.pageId, page, { annotationId: a.id });
    }
  }

  function consumePendingIntent() {
    var raw;
    try { raw = sessionStorage.getItem(S.cfg.storageKey); } catch (e) { return; }
    if (!raw) return;
    try { sessionStorage.removeItem(S.cfg.storageKey); } catch (e) {}
    var intent;
    try { intent = JSON.parse(raw); } catch (e) { return; }
    var a = findAnnotation(intent.annotationId);
    if (!a) return;
    var delay = a.reveal ? 700 : 600;
    setTimeout(function () {
      if (a.reveal) {
        runReveal(a.reveal);
        setTimeout(function () { highlight(a.target, { scroll: true, autoClearMs: 3500 }); }, 500);
      } else {
        highlight(a.target, { scroll: true, autoClearMs: 3500 });
      }
    }, delay);
  }

  /* =========================================================================
     CSS
     ========================================================================= */
  function injectCSS() {
    if (document.getElementById('da-css')) return;
    var accent = S.cfg.accent || DEFAULTS.accent;
    var css = CSS_TEMPLATE.replace(/__ACCENT__/g, accent);
    var s = document.createElement('style');
    s.id = 'da-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  var CSS_TEMPLATE = [
    /* shared highlight */
    '.da-highlight {',
    '  background-color: rgba(254,243,199,.85) !important;',
    '  box-shadow: 0 0 0 2px __ACCENT__, 0 0 12px rgba(245,158,11,.25) !important;',
    '  border-radius: 4px; position: relative; z-index: 5;',
    '}',
    /* floating drawer toggle (robust alternative to right-click) */
    '.da-fab {',
    '  position: fixed; bottom: 20px; left: 20px; z-index: 1150;',
    '  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;',
    '  padding: 9px 14px; border: none; border-radius: 99px; background: #111827; color: #fff;',
    '  font-family: Roboto, system-ui, sans-serif; font-size: 12px; font-weight: 600;',
    '  box-shadow: 0 4px 14px rgba(0,0,0,.22); transition: background 120ms, transform 120ms;',
    '}',
    '.da-fab:hover { background: #000; transform: translateY(-1px); }',
    '.da-fab .material-symbols-rounded { font-size: 16px !important; }',
    '.da-el-tooltip {',
    '  position: fixed; z-index: 99999; background: #111827; color: #fff;',
    '  font-family: Roboto, system-ui, sans-serif; font-size: 11px; line-height: 1.45;',
    '  padding: 5px 9px; border-radius: 5px; max-width: 260px; word-break: break-word;',
    '  pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,.22); display: none;',
    '}',

    /* ── DRAWER ───────────────────────────────────────────────── */
    '.da-panel {',
    '  position: fixed; top: var(--da-top,52px); right: 0; bottom: 0; width: var(--da-w,320px);',
    '  background: #fff; border-left: 1px solid #e5e7eb; box-shadow: -6px 0 24px rgba(0,0,0,.09);',
    '  z-index: 1100; display: flex; flex-direction: column; transform: translateX(105%);',
    '  transition: transform 240ms cubic-bezier(.4,0,.2,1);',
    '  font-family: Roboto, system-ui, sans-serif; overflow: hidden;',
    '}',
    '.da-panel.is-open { transform: translateX(0); }',
    '.da-hd { display: flex; align-items: center; gap: 10px; padding: 14px 14px 12px; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }',
    '.da-hd-icon { width: 30px; height: 30px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }',
    '.da-hd-icon .material-symbols-rounded { font-size: 17px; color: #0168DD; }',
    '.da-hd-meta { flex: 1; min-width: 0; }',
    '.da-hd-title { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3; }',
    '.da-hd-sub { font-size: 11px; color: #6b7280; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.da-close { border: none; background: transparent; cursor: pointer; padding: 4px; color: #9ca3af; border-radius: 5px; display: flex; align-items: center; transition: background 100ms, color 100ms; }',
    '.da-close:hover { background: #f3f4f6; color: #374151; }',
    '.da-close .material-symbols-rounded { font-size: 18px; }',
    '.da-body { padding: 14px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; }',
    '.da-section-hd { display: flex; align-items: center; gap: 6px; margin-bottom: 9px; }',
    '.da-section-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }',
    '.da-section--req .da-section-label { color: #92400e; }',
    '.da-section--sug .da-section-label { color: #5b21b6; }',
    '.da-badge { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 99px; line-height: 1.5; }',
    '.da-section--req .da-badge { background: #fef3c7; color: #92400e; }',
    '.da-section--sug .da-badge { background: #ede9fe; color: #6d28d9; }',
    '.da-items { display: flex; flex-direction: column; gap: 5px; }',
    '.da-item { display: flex; gap: 8px; font-size: 14px; color: #374151; line-height: 1.5; border-radius: 5px; margin: 0 -5px; padding: 2px 5px; }',
    '.da-item--targetable { cursor: crosshair; }',
    '.da-item--targetable:hover { background: rgba(245,158,11,.10); }',
    '.da-item--targetable:hover .da-dot { background: __ACCENT__ !important; transform: scale(1.4); }',
    '.da-dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; transition: transform 100ms ease; }',
    '.da-section--req .da-dot { background: __ACCENT__; }',
    '.da-section--sug .da-dot { background: #8b5cf6; }',
    '.da-sub { margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }',
    '.da-sub-item { display: flex; gap: 6px; font-size: 12px; color: #6b7280; line-height: 1.45; padding-left: 2px; }',
    '.da-sub-dash { flex-shrink: 0; color: #d1d5db; margin-top: 1px; }',
    '.da-none { font-size: 12px; color: #9ca3af; font-style: italic; }',
    '.da-divider { height: 1px; background: #f3f4f6; }',
    '.da-ft { padding: 9px 14px; border-top: 1px solid #f3f4f6; display: flex; align-items: center; gap: 5px; font-size: 11px; color: #9ca3af; flex-shrink: 0; }',
    '.da-ft .material-symbols-rounded { font-size: 13px; }',
    '.da-ft-pill { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: .04em; padding: 2px 7px; border-radius: 99px; background: #f0fdf4; color: #15803d; }',
    '.da-toggle-bar { display: flex; align-items: center; gap: 10px; padding: 8px 14px 7px; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }',
    '.da-toggle-lbl { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; font-size: 12px; font-weight: 500; color: #374151; }',
    '.da-toggle-chk { display: none; }',
    '.da-toggle-track { width: 30px; height: 17px; border-radius: 99px; background: #e5e7eb; position: relative; flex-shrink: 0; transition: background 160ms ease; }',
    '.da-toggle-chk:checked + .da-toggle-track { background: __ACCENT__; }',
    '.da-toggle-thumb { position: absolute; left: 2px; top: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.22); transition: transform 160ms ease; }',
    '.da-toggle-chk:checked + .da-toggle-track .da-toggle-thumb { transform: translateX(13px); }',
    '.da-toggle-hint { font-size: 11px; color: #d1d5db; }',

    /* ── TASK CENTER ──────────────────────────────────────────── */
    '.da-tc-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px 5px 8px; border: none; cursor: pointer; background: #f3f4f6; border-radius: 6px; margin-left: 10px; font-family: Roboto, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: #6b7280; transition: background 120ms, color 120ms; white-space: nowrap; vertical-align: middle; line-height: 1; }',
    '.da-tc-btn:hover { background: #e5e7eb; color: #374151; }',
    '.da-tc-btn .material-symbols-rounded { font-size: 15px !important; }',
    '.da-tc-btn--float { position: fixed; bottom: 20px; right: 20px; z-index: 1150; box-shadow: 0 4px 14px rgba(0,0,0,.18); padding: 9px 14px; }',
    '.da-tc-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 99px; background: __ACCENT__; color: #fff; font-size: 10px; font-weight: 700; }',
    '.da-tc-backdrop { position: fixed; inset: 0; background: rgba(17,24,39,.45); z-index: 1200; opacity: 0; transition: opacity 200ms ease; pointer-events: none; }',
    '.da-tc-backdrop.is-open { opacity: 1; pointer-events: auto; }',
    '.da-tc-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-52%) scale(0.97); width: 760px; max-width: calc(100vw - 48px); max-height: 82vh; background: #fff; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.18); z-index: 1201; display: flex; flex-direction: column; opacity: 0; transition: opacity 200ms ease, transform 200ms ease; pointer-events: none; font-family: Roboto, system-ui, sans-serif; overflow: hidden; }',
    '.da-tc-modal.is-open { opacity: 1; transform: translate(-50%,-50%) scale(1); pointer-events: auto; }',
    '.da-tc-hd { display: flex; align-items: center; gap: 10px; padding: 16px 20px 14px; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }',
    '.da-tc-hd-icon { width: 32px; height: 32px; background: #fffbeb; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }',
    '.da-tc-hd-icon .material-symbols-rounded { font-size: 18px !important; color: #d97706; }',
    '.da-tc-title { font-size: 15px; font-weight: 600; color: #111827; }',
    '.da-tc-count { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: #fef3c7; color: #92400e; margin-left: 4px; }',
    '.da-tc-close { margin-left: auto; border: none; background: transparent; cursor: pointer; color: #9ca3af; padding: 4px; border-radius: 5px; display: flex; align-items: center; transition: background 100ms, color 100ms; }',
    '.da-tc-close:hover { background: #f3f4f6; color: #374151; }',
    '.da-tc-close .material-symbols-rounded { font-size: 18px !important; }',
    '.da-tc-pills { display: flex; gap: 6px; padding: 12px 20px; border-bottom: 1px solid #f3f4f6; flex-wrap: wrap; flex-shrink: 0; }',
    '.da-tc-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border: 1px solid #e5e7eb; border-radius: 99px; font-size: 12px; font-weight: 500; color: #6b7280; background: #fff; cursor: pointer; transition: all 120ms ease; white-space: nowrap; user-select: none; }',
    '.da-tc-pill:hover { border-color: #d1d5db; color: #374151; background: #f9fafb; }',
    '.da-tc-pill.is-active { background: #111827; color: #fff; border-color: #111827; }',
    '.da-tc-pill-count { font-size: 10px; font-weight: 700; opacity: .6; }',
    '.da-tc-search-wrap { display: flex; align-items: center; gap: 8px; padding: 8px 20px 7px; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }',
    '.da-tc-search-icon { font-size: 16px !important; color: #9ca3af; flex-shrink: 0; }',
    '.da-tc-search-input { flex: 1; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13px; color: #374151; padding: 0; }',
    '.da-tc-search-input::placeholder { color: #d1d5db; }',
    '.da-tc-search-clear { border: none; background: transparent; cursor: pointer; padding: 2px; color: #9ca3af; display: flex; align-items: center; border-radius: 4px; }',
    '.da-tc-search-clear:hover { color: #374151; background: #f3f4f6; }',
    '.da-tc-search-clear .material-symbols-rounded { font-size: 15px !important; }',
    '.da-tc-empty { padding: 36px 20px; text-align: center; font-size: 13px; color: #9ca3af; }',
    '.da-tc-content { flex: 1; overflow-y: auto; padding: 16px 20px 20px; }',
    '.da-tc-section { border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }',
    '.da-tc-page-hd { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f9fafb; cursor: pointer; user-select: none; transition: background 120ms; }',
    '.da-tc-page-hd:hover { background: #f3f4f6; }',
    '.da-tc-chevron { font-size: 17px !important; color: #9ca3af; flex-shrink: 0; transition: transform 220ms ease; }',
    '.da-tc-section.is-collapsed .da-tc-chevron { transform: rotate(-90deg); }',
    '.da-tc-page-label { font-size: 12px; font-weight: 600; color: #374151; flex: 1; }',
    '.da-tc-page-badge { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 99px; background: #fef3c7; color: #92400e; }',
    '.da-tc-go { font-size: 11px; color: #9ca3af; background: transparent; border: none; padding: 2px 7px; border-radius: 4px; cursor: pointer; font-family: inherit; transition: color 100ms, background 100ms; }',
    '.da-tc-go:hover { color: #0168dd; background: #eff6ff; }',
    '.da-tc-page-body { max-height: 1200px; overflow: hidden; transition: max-height 220ms ease; }',
    '.da-tc-section.is-collapsed .da-tc-page-body { max-height: 0 !important; }',
    '.da-tc-tasks { padding: 8px 14px 10px; display: flex; flex-direction: column; gap: 1px; }',
    '.da-tc-task { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: background 100ms; margin: 0 -10px; }',
    '.da-tc-task:hover { background: #fffbeb; }',
    '.da-tc-task:hover .da-tc-dot { transform: scale(1.35); }',
    '.da-tc-dot { width: 5px; height: 5px; border-radius: 50%; background: __ACCENT__; flex-shrink: 0; margin-top: 7px; transition: transform 100ms; }',
    '.da-tc-task-body { flex: 1; min-width: 0; }',
    '.da-tc-task-text { font-size: 13px; color: #374151; line-height: 1.5; }',
    '.da-tc-task-arrow { font-size: 14px !important; color: #d1d5db; flex-shrink: 0; margin-top: 4px; transition: color 100ms, transform 100ms; }',
    '.da-tc-task:hover .da-tc-task-arrow { color: __ACCENT__; transform: translateX(2px); }',
    '.da-tc-detail-item { display: flex; gap: 6px; font-size: 12px; color: #6b7280; line-height: 1.5; padding: 1px 0 0 2px; }',
    '.da-tc-detail-dash { color: #d1d5db; flex-shrink: 0; }',
    '.da-tc-details { max-height: 0; overflow: hidden; transition: max-height 200ms ease; }',
    '.da-tc-task.is-expanded .da-tc-details { max-height: 600px; }',
    '.da-tc-expand { border: none; background: transparent; cursor: pointer; padding: 3px; color: #d1d5db; border-radius: 4px; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; transition: color 100ms, background 100ms; }',
    '.da-tc-expand:hover { color: #6b7280 !important; background: #f3f4f6; }',
    '.da-tc-expand .material-symbols-rounded { font-size: 16px !important; transition: transform 200ms ease; }',
    '.da-tc-task.is-expanded .da-tc-expand .material-symbols-rounded { transform: rotate(180deg); }',
  ].join('\n');

  function icon(name) { return '<span class="material-symbols-rounded">' + name + '</span>'; }
  function prettyHotkey(combo) {
    var isMac = /mac/i.test(navigator.platform);
    return String(combo).split('+').map(function (p) {
      p = p.toLowerCase();
      if (p === 'mod') return isMac ? '⌘' : 'Ctrl';
      if (p === 'cmd' || p === 'meta') return '⌘';
      if (p === 'ctrl') return 'Ctrl';
      if (p === 'shift') return isMac ? '⇧' : 'Shift';
      if (p === 'alt') return isMac ? '⌥' : 'Alt';
      return p.toUpperCase();
    }).join(isMac ? '' : '+');
  }
  function hasIconFont() {
    // Best-effort: assume Material Symbols may be absent; we still render text labels.
    return true;
  }

  /* =========================================================================
     DRAWER
     ========================================================================= */
  function itemsHTML(list) {
    if (!list || !list.length) return '<span class="da-none">None for this page.</span>';
    return list.map(function (a) {
      var subHtml = a.sub && a.sub.length
        ? '<div class="da-sub">' + a.sub.map(function (s) {
            return '<div class="da-sub-item"><span class="da-sub-dash">&ndash;</span><span>' + escHtml(s) + '</span></div>';
          }).join('') + '</div>'
        : '';
      var targetable = a.target ? ' da-item--targetable' : '';
      return '<div class="da-item' + targetable + '" data-anno="' + escHtml(a.id) + '">' +
               '<span class="da-dot"></span>' +
               '<span>' + escHtml(a.title) + subHtml + '</span>' +
             '</div>';
    }).join('');
  }

  function drawerBodyHTML() {
    var list = annotationsForPage(S.currentPageId);
    var req = list.filter(function (a) { return a.kind === 'required'; });
    var sug = list.filter(function (a) { return a.kind === 'suggestion'; });
    var html = '<div class="da-body" id="da-body">' +
      '<div class="da-section da-section--req">' +
        '<div class="da-section-hd"><span class="da-section-label">Required changes</span>' +
          (req.length ? '<span class="da-badge">' + req.length + '</span>' : '') + '</div>' +
        '<div class="da-items">' + itemsHTML(req) + '</div>' +
      '</div>';
    if (sug.length) {
      html += '<div class="da-divider"></div>' +
        '<div class="da-section da-section--sug">' +
          '<div class="da-section-hd"><span class="da-section-label">Suggestions</span>' +
            '<span class="da-badge">' + sug.length + '</span></div>' +
          '<div class="da-items">' + itemsHTML(sug) + '</div>' +
        '</div>';
    }
    return html + '</div>';
  }

  function pageLabel(pageId) { var p = byId(pageId); return p ? p.label : (pageId || ''); }

  function buildDrawer() {
    injectCSS();
    var el = document.createElement('div');
    el.className = 'da-panel';
    el.style.setProperty('--da-top', (S.cfg.topOffset || 52) + 'px');
    el.style.setProperty('--da-w', (S.cfg.drawerWidth || 320) + 'px');
    el.setAttribute('role', 'complementary');
    el.setAttribute('aria-label', 'Design annotations');

    var triggers = Array.isArray(S.cfg.trigger) ? S.cfg.trigger : [S.cfg.trigger];
    var hintParts = [];
    if (triggers.indexOf('contextmenu') !== -1) hintParts.push('Right-click to toggle');
    if (S.cfg.hotkey) hintParts.push(prettyHotkey(S.cfg.hotkey));
    var footerText = hintParts.length ? hintParts.join(' · ') : 'Design annotations';
    var footer = '<div class="da-ft">' + icon('mouse') + footerText +
      (S.cfg.tag ? '<span class="da-ft-pill">' + escHtml(S.cfg.tag) + '</span>' : '') + '</div>';

    el.innerHTML =
      '<div class="da-hd">' +
        '<div class="da-hd-icon">' + icon('edit_note') + '</div>' +
        '<div class="da-hd-meta">' +
          '<div class="da-hd-title">Design Annotations</div>' +
          '<div class="da-hd-sub" id="da-sub">' + escHtml(pageLabel(S.currentPageId)) + '</div>' +
        '</div>' +
        '<button class="da-close" aria-label="Close annotations panel">' + icon('close') + '</button>' +
      '</div>' +
      '<div class="da-toggle-bar">' +
        '<label class="da-toggle-lbl" for="da-toggle-chk">' +
          '<input type="checkbox" id="da-toggle-chk" class="da-toggle-chk">' +
          '<span class="da-toggle-track"><span class="da-toggle-thumb"></span></span>Show all</label>' +
        '<span class="da-toggle-hint" id="da-toggle-hint">Highlights all annotated elements</span>' +
      '</div>' +
      drawerBodyHTML() + footer;

    document.body.appendChild(el);
    S.drawer = el;

    el.querySelector('.da-close').addEventListener('click', closeDrawer);
    el.addEventListener('contextmenu', function (e) { e.stopPropagation(); });
    wireDrawerHovers();

    el.querySelector('#da-toggle-chk').addEventListener('change', function () {
      S.allOn = this.checked;
      var hint = el.querySelector('#da-toggle-hint');
      if (S.allOn) { showAllHighlights(); if (hint) hint.textContent = 'Hover an element to see its annotation'; }
      else { clearAllHighlights(); if (hint) hint.textContent = 'Highlights all annotated elements'; }
    });
  }

  function wireDrawerHovers() {
    if (!S.drawer) return;
    S.drawer.querySelectorAll('.da-item--targetable').forEach(function (item) {
      var a = findAnnotation(item.getAttribute('data-anno'));
      item.addEventListener('mouseenter', function () { if (a) highlight(a.target); });
      item.addEventListener('mouseleave', function () { if (!S.allOn) clearHighlights(); });
    });
  }

  function updateDrawer() {
    if (!S.drawer) return;
    S.drawer.querySelector('#da-sub').textContent = pageLabel(S.currentPageId);
    var oldBody = S.drawer.querySelector('#da-body');
    var tmp = document.createElement('div');
    tmp.innerHTML = drawerBodyHTML();
    oldBody.parentNode.replaceChild(tmp.firstElementChild, oldBody);
    wireDrawerHovers();
  }

  function pushContent(on) {
    if (!S.cfg.mount) return;
    var el = isEl(S.cfg.mount) ? S.cfg.mount : document.querySelector(S.cfg.mount);
    if (el) {
      el.style.transition = 'margin-right 240ms cubic-bezier(.4,0,.2,1)';
      el.style.marginRight = on ? (S.cfg.drawerWidth || 320) + 'px' : '';
    }
  }

  function openDrawer(pageId) {
    if (pageId) S.currentPageId = pageId;
    if (!S.drawer) buildDrawer(); else updateDrawer();
    var chk = S.drawer.querySelector('#da-toggle-chk');
    var hint = S.drawer.querySelector('#da-toggle-hint');
    if (chk) chk.checked = S.allOn;
    if (S.allOn) { showAllHighlights(); if (hint) hint.textContent = 'Hover an element to see its annotation'; }
    requestAnimationFrame(function () {
      S.drawer.classList.add('is-open');
      pushContent(true);
      S.drawerOpen = true;
    });
  }
  function closeDrawer() {
    clearHighlights();
    if (S.allOn) clearAllHighlights();
    if (S.drawer) S.drawer.classList.remove('is-open');
    pushContent(false);
    S.drawerOpen = false;
  }
  function toggleDrawer() { if (S.drawerOpen) closeDrawer(); else openDrawer(); }

  /* =========================================================================
     TASK CENTER
     ========================================================================= */
  function tcMatch(a, q) {
    q = q.toLowerCase();
    if (a.title.toLowerCase().indexOf(q) !== -1) return true;
    if (a.sub) for (var i = 0; i < a.sub.length; i++) if (a.sub[i].toLowerCase().indexOf(q) !== -1) return true;
    return false;
  }

  function tcTaskHTML(a) {
    var hasSub = a.sub && a.sub.length > 0;
    var details = hasSub
      ? '<div class="da-tc-details">' + a.sub.map(function (s) {
          return '<div class="da-tc-detail-item"><span class="da-tc-detail-dash">&ndash;</span><span>' + escHtml(s) + '</span></div>';
        }).join('') + '</div>'
      : '';
    var expandBtn = hasSub ? '<button class="da-tc-expand" title="Details" tabindex="-1">' + icon('expand_more') + '</button>' : '';
    return '<div class="da-tc-task" data-anno="' + escHtml(a.id) + '">' +
        '<span class="da-tc-dot"></span>' +
        '<span class="da-tc-task-body"><span class="da-tc-task-text">' + escHtml(a.title) + '</span>' + details + '</span>' +
        expandBtn + '<span class="material-symbols-rounded da-tc-task-arrow">arrow_forward</span>' +
      '</div>';
  }

  function tcSectionHTML(page, list) {
    return '<div class="da-tc-section" data-page-id="' + escHtml(page.id) + '">' +
      '<div class="da-tc-page-hd">' + icon('expand_more').replace('material-symbols-rounded', 'material-symbols-rounded da-tc-chevron') +
        '<span class="da-tc-page-label">' + escHtml(page.label) + '</span>' +
        '<span class="da-tc-page-badge">' + list.length + '</span>' +
        (page.route ? '<button class="da-tc-go" data-page="' + escHtml(page.id) + '">Open page &#8599;</button>' : '') +
      '</div>' +
      '<div class="da-tc-page-body"><div class="da-tc-tasks">' + list.map(tcTaskHTML).join('') + '</div></div>' +
    '</div>';
  }

  function tcContentHTML() {
    var q = S.tcSearch.trim();
    if (q) {
      var sections = S.pages.map(function (p) {
        var m = annotationsForPage(p.id).filter(function (a) { return tcMatch(a, q); });
        return m.length ? tcSectionHTML(p, m) : '';
      }).filter(Boolean).join('');
      return sections || '<div class="da-tc-empty">No tasks match <strong>"' + escHtml(q) + '"</strong></div>';
    }
    if (S.tcFilter === 'all') {
      return S.pages.map(function (p) {
        var list = annotationsForPage(p.id);
        return list.length ? tcSectionHTML(p, list) : '';
      }).filter(Boolean).join('');
    }
    var page = byId(S.tcFilter);
    if (!page) return '';
    return tcSectionHTML(page, annotationsForPage(page.id));
  }

  function tcWireContent() {
    if (!S.tcModal) return;
    var content = S.tcModal.querySelector('.da-tc-content');
    content.querySelectorAll('.da-tc-page-hd').forEach(function (hd) {
      hd.addEventListener('click', function (e) {
        if (e.target.closest('.da-tc-go')) return;
        this.closest('.da-tc-section').classList.toggle('is-collapsed');
      });
    });
    content.querySelectorAll('.da-tc-go').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var page = byId(this.getAttribute('data-page'));
        closeTaskCenter();
        (S.cfg.navigate || defaultNavigate)(page.id, page, null);
      });
    });
    content.querySelectorAll('.da-tc-expand').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        this.closest('.da-tc-task').classList.toggle('is-expanded');
      });
    });
    content.querySelectorAll('.da-tc-task').forEach(function (task) {
      task.addEventListener('click', function (e) {
        if (e.target.closest('.da-tc-expand')) return;
        goToAnnotation(this.getAttribute('data-anno'));
      });
    });
  }

  function tcWirePills() {
    S.tcModal.querySelectorAll('.da-tc-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        S.tcSearch = '';
        var si = S.tcModal.querySelector('.da-tc-search-input');
        var sc = S.tcModal.querySelector('.da-tc-search-clear');
        if (si) si.value = ''; if (sc) sc.hidden = true;
        S.tcModal.querySelectorAll('.da-tc-pill').forEach(function (p) { p.classList.remove('is-active'); });
        this.classList.add('is-active');
        S.tcFilter = this.getAttribute('data-filter');
        S.tcModal.querySelector('.da-tc-content').innerHTML = tcContentHTML();
        tcWireContent();
      });
    });
  }

  function tcWireSearch() {
    var input = S.tcModal.querySelector('.da-tc-search-input');
    var clear = S.tcModal.querySelector('.da-tc-search-clear');
    if (!input) return;
    input.addEventListener('input', function () {
      S.tcSearch = this.value;
      if (clear) clear.hidden = !S.tcSearch;
      S.tcModal.querySelector('.da-tc-content').innerHTML = tcContentHTML();
      tcWireContent();
    });
    if (clear) clear.addEventListener('click', function () {
      S.tcSearch = ''; input.value = ''; this.hidden = true; input.focus();
      S.tcModal.querySelector('.da-tc-content').innerHTML = tcContentHTML();
      tcWireContent();
    });
  }

  function buildTaskCenter() {
    injectCSS();
    var total = S.annotations.length;
    var pills = '<button class="da-tc-pill is-active" data-filter="all">All <span class="da-tc-pill-count">' + total + '</span></button>';
    S.pages.forEach(function (p) {
      var n = annotationsForPage(p.id).length;
      if (!n) return;
      pills += '<button class="da-tc-pill" data-filter="' + escHtml(p.id) + '">' + escHtml(p.label) + ' <span class="da-tc-pill-count">' + n + '</span></button>';
    });

    S.tcBackdrop = document.createElement('div');
    S.tcBackdrop.className = 'da-tc-backdrop';
    S.tcBackdrop.addEventListener('click', closeTaskCenter);
    document.body.appendChild(S.tcBackdrop);

    S.tcModal = document.createElement('div');
    S.tcModal.className = 'da-tc-modal';
    S.tcModal.setAttribute('role', 'dialog');
    S.tcModal.setAttribute('aria-label', 'Design Tasks Overview');
    S.tcModal.innerHTML =
      '<div class="da-tc-hd"><div class="da-tc-hd-icon">' + icon('task_alt') + '</div>' +
        '<span class="da-tc-title">Design Tasks</span>' +
        '<span class="da-tc-count">' + total + ' pending</span>' +
        '<button class="da-tc-close" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="da-tc-pills">' + pills + '</div>' +
      '<div class="da-tc-search-wrap">' + icon('search').replace('material-symbols-rounded', 'material-symbols-rounded da-tc-search-icon') +
        '<input type="text" class="da-tc-search-input" placeholder="Search tasks…" autocomplete="off">' +
        '<button class="da-tc-search-clear" hidden>' + icon('close') + '</button></div>' +
      '<div class="da-tc-content">' + tcContentHTML() + '</div>';
    document.body.appendChild(S.tcModal);

    S.tcModal.querySelector('.da-tc-close').addEventListener('click', closeTaskCenter);
    tcWirePills(); tcWireContent(); tcWireSearch();
  }

  function openTaskCenter() {
    if (!S.tcModal) buildTaskCenter();
    requestAnimationFrame(function () {
      S.tcBackdrop.classList.add('is-open');
      S.tcModal.classList.add('is-open');
      S.tcOpen = true;
    });
  }
  function closeTaskCenter() {
    if (S.tcBackdrop) S.tcBackdrop.classList.remove('is-open');
    if (S.tcModal) S.tcModal.classList.remove('is-open');
    S.tcOpen = false;
  }

  function injectTaskCenterButton() {
    var opt = S.cfg.taskCenter;
    if (opt === false) return;
    var total = S.annotations.length;
    var btn = document.createElement('button');
    btn.className = 'da-tc-btn';
    btn.id = 'da-tc-btn';
    btn.setAttribute('title', 'Design Tasks Overview');
    btn.innerHTML = icon('task_alt') + 'Design tasks<span class="da-tc-badge">' + total + '</span>';
    btn.addEventListener('click', openTaskCenter);
    S.tcBtn = btn;

    var anchorSel = (opt && opt.anchor) || null;
    var mountSel  = (opt && opt.mount) || null;
    var position  = (opt && opt.position) || 'after';

    if (mountSel) {
      var m = document.querySelector(mountSel);
      if (m) { m.appendChild(btn); return; }
    }
    if (anchorSel) {
      var a = document.querySelector(anchorSel);
      if (a && a.parentElement) {
        if (position === 'before') a.parentElement.insertBefore(btn, a);
        else a.parentElement.insertBefore(btn, a.nextSibling);
        return;
      }
    }
    // Fallback: floating button bottom-right so it always works.
    btn.classList.add('da-tc-btn--float');
    document.body.appendChild(btn);
  }

  function injectDrawerToggleButton() {
    if (S.fab) return;
    var btn = document.createElement('button');
    btn.className = 'da-fab';
    btn.id = 'da-fab';
    btn.setAttribute('title', 'Toggle design annotations');
    btn.innerHTML = icon('edit_note') + 'Annotations';
    btn.addEventListener('click', toggleDrawer);
    document.body.appendChild(btn);
    S.fab = btn;
  }

  /* =========================================================================
     GLOBAL EVENTS
     ========================================================================= */
  function matchesHotkey(e, combo) {
    if (!combo) return false;
    var parts = String(combo).toLowerCase().split('+');
    var key = parts[parts.length - 1];
    var needCtrlOrMeta = parts.indexOf('mod') !== -1 || parts.indexOf('ctrl') !== -1 || parts.indexOf('cmd') !== -1 || parts.indexOf('meta') !== -1;
    var needShift = parts.indexOf('shift') !== -1;
    var needAlt = parts.indexOf('alt') !== -1;
    if (needCtrlOrMeta && !(e.metaKey || e.ctrlKey)) return false;
    if (needShift !== e.shiftKey) return false;
    if (needAlt !== e.altKey) return false;
    return e.key && e.key.toLowerCase() === key;
  }

  function onContextMenu(e) {
    if (S.drawer && S.drawer.contains(e.target)) return;
    if (S.tcModal && S.tcModal.contains(e.target)) return;
    e.preventDefault();
    toggleDrawer();
  }
  function onKeydown(e) {
    if (e.key === 'Escape') {
      if (S.tcOpen) closeTaskCenter();
      else if (S.drawerOpen) closeDrawer();
      return;
    }
    if (S.cfg.hotkey && matchesHotkey(e, S.cfg.hotkey)) {
      e.preventDefault();
      toggleDrawer();
    }
  }
  function onMouseMove(e) {
    S.mouseX = e.clientX; S.mouseY = e.clientY;
    if (S.tooltipEl && S.tooltipEl.style.display !== 'none') positionTooltip();
  }

  /* =========================================================================
     PUBLIC API
     ========================================================================= */
  /* Apply a fresh data set: normalise, derive pages, refresh any built UI. */
  function applyData(annotations, pages) {
    S.annotations = normalizeAnnotations(annotations);
    S.pages = derivePages(S.annotations, pages || S.cfg.pages);
    S.currentPageId = resolveCurrentPageId();
    if (S.drawer) updateDrawer();
    if (S.tcModal) { S.tcModal.remove(); S.tcModal = null; }
    if (S.tcBackdrop) { S.tcBackdrop.remove(); S.tcBackdrop = null; }
    if (S.tcBtn) { var b = S.tcBtn.querySelector('.da-tc-badge'); if (b) b.textContent = S.annotations.length; }
  }

  /* annotations may be an Array, a function returning an Array, or a function/
     value resolving to a Promise<Array> — so tasks can be loaded "on the fly". */
  function resolveAnnotations(src, cb) {
    var val = src;
    if (typeof src === 'function') { try { val = src(); } catch (e) { val = []; } }
    if (val && typeof val.then === 'function') val.then(function (list) { cb(list || []); }, function () { cb([]); });
    else cb(val || []);
  }

  function init(config) {
    config = config || {};
    S.cfg = {};
    for (var k in DEFAULTS) S.cfg[k] = DEFAULTS[k];
    for (var j in config) S.cfg[j] = config[j];

    // Render the chrome immediately with whatever pages are declared up front;
    // annotations may arrive synchronously (array) or later (fetch / API).
    S.annotations = [];
    S.pages = derivePages([], S.cfg.pages);
    S.currentPageId = resolveCurrentPageId();

    injectCSS();
    if (S.cfg.taskCenter !== false) injectTaskCenterButton();

    var triggers = Array.isArray(S.cfg.trigger) ? S.cfg.trigger : [S.cfg.trigger];
    if (triggers.indexOf('contextmenu') !== -1) document.addEventListener('contextmenu', onContextMenu);
    if (triggers.indexOf('button') !== -1) injectDrawerToggleButton();
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('mousemove', onMouseMove);

    resolveAnnotations(S.cfg.annotations, function (list) {
      applyData(list, S.cfg.pages);
      consumePendingIntent();   // run after data exists so the lookup resolves
    });

    S.started = true;
    return API;
  }

  var API = {
    init: init,
    open: function (pageId) { openDrawer(pageId); },
    close: closeDrawer,
    toggle: toggleDrawer,
    openTaskCenter: openTaskCenter,
    closeTaskCenter: closeTaskCenter,
    goToAnnotation: goToAnnotation,
    highlight: function (id) { var a = findAnnotation(id); if (a) highlight(a.target, { scroll: true, autoClearMs: 3500 }); },
    clearHighlight: function () { clearHighlights(); clearAllHighlights(); },

    /* Switch the drawer's page context (e.g. when a host modal opens, treat it
       as its own "page" of annotations). Pass null/undefined args to reset. */
    setContext: function (pageId) {
      S.contextOverride = pageId || null;
      S.currentPageId = resolveCurrentPageId();
      S.allOn = false;
      if (S.drawerOpen) updateDrawer();
    },
    clearContext: function () {
      S.contextOverride = null;
      S.currentPageId = resolveCurrentPageId();
      if (S.drawerOpen) updateDrawer();
    },

    /* Replace the annotation set at runtime (e.g. after fetching from an API).
       Accepts an Array, or a function/Promise resolving to one. */
    setAnnotations: function (annotations, pages) {
      resolveAnnotations(annotations, function (list) { applyData(list, pages); });
    },

    /* Register a deep-link reveal handler (open a modal, switch a tab, …). */
    registerReveal: function (key, fn) { S.cfg.reveal = S.cfg.reveal || {}; S.cfg.reveal[key] = fn; },

    getState: function () {
      return { pages: S.pages.slice(), annotations: S.annotations.slice(), currentPageId: S.currentPageId };
    },

    destroy: function () {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('mousemove', onMouseMove);
      [S.drawer, S.tcModal, S.tcBackdrop, S.tcBtn, S.fab, S.tooltipEl].forEach(function (el) { if (el && el.remove) el.remove(); });
      var css = document.getElementById('da-css'); if (css) css.remove();
      clearAllHighlights();
      S.drawer = S.tcModal = S.tcBackdrop = S.tcBtn = S.fab = S.tooltipEl = null;
      S.started = false;
    },
  };

  /* expose */
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  window.DesignAnnotations = API;

}());
