/* =============================================================================
   Usability tracking — prototype-only, drop-in plugin
   -----------------------------------------------------------------------------
   Passive instrumentation for moderated usability sessions on this prototype.
   Logs every click plus a set of feature-specific milestones (announcement
   dismissed, filters opened, member drill-in, Add Time modal opened/closed,
   batch member selection changed, Save clicked, Daily/Weekly/Monthly view
   switched) with millisecond timing relative to page load. Never touches
   existing page logic — everything here is either a delegated document-level
   click listener (capturing phase) or a MutationObserver on elements that
   already exist in the markup.

   This copy runs on whoever is actually demoing the prototype (e.g. an
   interviewer on a call) and is intentionally hands-off: recording starts
   the moment the page loads — no button to press — so it never depends on
   them remembering a step. Scoring judgment (Success/Partial/Failed, prompt
   counts) is NOT captured here; that lives in the separate scoring-companion
   tool a moderator runs on their own machine while watching this screen.
   Combine the two CSVs after the session using shared wall-clock timestamps.

   The task list shown in the panel is driven by the same ?role= URL param
   that locks the prototype's role (see the role-switcher script in
   index.html), so the panel always matches whichever track — manager or
   regular user — is actually loaded.

   Do not reveal this panel to test participants — it's a moderator/interviewer
   tool, same spirit as the role switcher.
   ========================================================================== */
(function() {
  'use strict';

  /* ── Track detection — mirrors the role-lock logic in index.html ── */
  var urlRole = new URLSearchParams(window.location.search).get('role');
  var track = urlRole === 'member' ? 'user' : 'manager'; /* default/admin → manager */
  var trackLabel = track === 'manager' ? 'Manager track' : 'Regular user track';
  var trackTag = track === 'manager' ? 'MGR' : 'USER';

  var sessionStart = Date.now();
  var log = [];
  var clickCount = 0;

  function record(type, label, detail) {
    log.push({
      tMs: Date.now() - sessionStart,
      tISO: new Date().toISOString(),
      type: type,
      label: label,
      detail: detail || '',
    });
    if (type === 'click') clickCount++;
    renderStats();
  }
  record('milestone', 'session_start', 'track=' + track);

  /* ── Best-effort human label for whatever was clicked ── */
  function describeElement(target) {
    var el = target.closest('button, a, [role="button"], input, select, textarea, .tl-tbl-row, li, [data-action]') || target;
    var label =
      el.getAttribute('aria-label') ||
      (el.tagName === 'INPUT' ? (el.value || el.placeholder || el.type) : '') ||
      (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) ||
      el.id ||
      el.className ||
      el.tagName;
    var detail = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '');
    return { label: label, detail: detail };
  }

  /* ── Generic clickstream (capturing phase = sees everything first) ── */
  document.addEventListener('click', function(e) {
    var t = e.target;

    /* Don't let interactions with this panel itself pollute the clickstream. */
    if (t.closest('#uxt-panel') || t.closest('#uxt-pill')) return;

    var info = describeElement(t);
    record('click', info.label, info.detail);

    var memberRow = t.closest('.tl-tbl-row[data-member-id]');
    if (memberRow && !t.closest('.tl-tbl-actions-btn')) {
      record('milestone', 'member_row_drill_in', 'memberId=' + memberRow.getAttribute('data-member-id'));
    }
    if (t.closest('#tl-add-time-btn') || t.closest('#tsh-add-time-btn')) {
      record('milestone', 'add_time_button_clicked', '');
    }
    if (t.closest('.utm-save-btn')) {
      var inner = document.getElementById('utm-members-select-inner');
      record('milestone', 'add_time_save_clicked', 'selectedMembersCount=' + (inner ? inner.children.length : 0));
    }
    if (t.closest('#tsh-filter-btn')) {
      record('milestone', 'filters_button_clicked', 'source=multi-member table');
    }
    if (t.closest('#tl-member-filter-btn')) {
      record('milestone', 'filters_button_clicked', 'source=single-member view');
    }
    var segBtn = t.closest('.ts-seg-btn, .tl-seg-btn');
    if (segBtn) {
      record('milestone', 'view_switched', 'view=' + segBtn.textContent.trim());
    }
  }, true);

  /* ── Milestone: watch an overlay/drawer's `hidden` attribute ── */
  function watchHidden(id, shownLabel, hiddenLabel, extraFn) {
    var el = document.getElementById(id);
    if (!el) return;
    var wasHidden = el.hidden;
    new MutationObserver(function() {
      if (el.hidden === wasHidden) return;
      wasHidden = el.hidden;
      record('milestone', el.hidden ? hiddenLabel : shownLabel, extraFn ? extraFn() : '');
    }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
  }

  watchHidden('fa-overlay', 'announcement_shown', 'announcement_dismissed');
  watchHidden('flt-drawer', 'filters_drawer_opened', 'filters_drawer_closed');
  watchHidden('flt-member-drawer', 'member_filters_drawer_opened', 'member_filters_drawer_closed');
  watchHidden('utm-overlay', 'add_time_modal_opened', 'add_time_modal_closed', function() {
    var singleDisplay = document.getElementById('utm-member-display');
    var isSingle = singleDisplay && !singleDisplay.hidden;
    return 'mode=' + (isSingle ? 'single' : 'multi/batch');
  });

  /* ── Milestone: batch member selection count changing inside the modal ── */
  (function() {
    var inner = document.getElementById('utm-members-select-inner');
    if (!inner) return;
    function selectedCount() {
      var kids = Array.prototype.slice.call(inner.children);
      if (kids.length === 1 && kids[0].className === 'utm-select__placeholder') return 0;
      return kids.length;
    }
    new MutationObserver(function() {
      record('milestone', 'batch_selection_changed', 'count=' + selectedCount());
    }).observe(inner, { childList: true });
  })();

  /* ── CSV export — raw clickstream + milestones only. Scoring lives in the
     separate scoring-companion tool a moderator runs on their own machine. ── */
  function csvEscape(v) {
    v = String(v == null ? '' : v);
    if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  function toRows(rows) {
    return rows.map(function(r) { return r.map(csvEscape).join(','); }).join('\n');
  }
  function toCSV() {
    var pidInput = document.getElementById('uxt-pid');
    var pid = (pidInput && pidInput.value) || '';
    var blocks = [];
    blocks.push(toRows([
      ['Participant', 'Track', 'Date', 'Duration (s)'],
      [pid, track, new Date().toISOString().slice(0, 10), Math.round((Date.now() - sessionStart) / 1000)],
    ]));
    var logRows = [['t_ms', 't_iso', 'type', 'label', 'detail']];
    log.forEach(function(r) { logRows.push([r.tMs, r.tISO, r.type, r.label, r.detail]); });
    blocks.push(toRows(logRows));
    return blocks.join('\n\n');
  }
  function exportCSV() {
    var pidInput = document.getElementById('uxt-pid');
    var pid = ((pidInput && pidInput.value) || 'participant').trim().replace(/[^a-z0-9_-]+/gi, '_');
    var blob = new Blob([toCSV()], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'clickstream-' + track + '-' + pid + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  /* ── Minimal floating status panel — passive, nothing to press ── */
  var CSS = ''
    + '.uxt-pill{position:fixed;bottom:16px;right:16px;z-index:99999;background:#111827;color:#fff;'
    + 'font:12px/1.4 Roboto,sans-serif;border-radius:20px;padding:8px 14px;cursor:pointer;'
    + 'box-shadow:0 2px 8px rgba(0,0,0,.25);opacity:.55;transition:opacity .15s;user-select:none;}'
    + '.uxt-pill:hover{opacity:1;}'
    + '.uxt-panel{position:fixed;bottom:16px;right:16px;z-index:99999;background:#fff;color:#111827;'
    + 'font:12px/1.4 Roboto,sans-serif;border-radius:10px;padding:12px;width:220px;'
    + 'box-shadow:0 4px 20px rgba(0,0,0,.25);border:1px solid #D6DBE6;}'
    + '.uxt-panel h4{margin:0 0 2px;font-size:12px;font-weight:600;display:flex;justify-content:space-between;align-items:center;}'
    + '.uxt-panel .uxt-close{cursor:pointer;color:#6B7280;font-size:14px;}'
    + '.uxt-track{color:#0168DD;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px;}'
    + '.uxt-row{margin-bottom:6px;}'
    + '.uxt-panel input[type=text]{width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid #D6DBE6;border-radius:6px;font-size:12px;}'
    + '.uxt-panel button{width:100%;box-sizing:border-box;margin-top:4px;padding:5px 6px;border:1px solid #D6DBE6;'
    + 'border-radius:6px;background:#F3F4F6;font-size:11px;cursor:pointer;text-align:center;}'
    + '.uxt-panel button:hover{background:#e5e7eb;}'
    + '.uxt-panel button.uxt-primary{background:#0168DD;color:#fff;border-color:#0168DD;font-weight:600;}'
    + '.uxt-panel button.uxt-primary:hover{background:#015bc0;}'
    + '.uxt-stats{color:#6B7280;font-size:11px;margin-bottom:8px;}'
    + '.uxt-hint{color:#9ca3af;font-size:10px;margin-top:8px;line-height:1.4;}';

  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  var pill = document.createElement('div');
  pill.className = 'uxt-pill';
  pill.id = 'uxt-pill';
  document.body.appendChild(pill);

  var panel = document.createElement('div');
  panel.className = 'uxt-panel';
  panel.id = 'uxt-panel';
  panel.hidden = true;
  panel.innerHTML = ''
    + '<h4>Usability tracking <span class="uxt-close" id="uxt-close">&times;</span></h4>'
    + '<div class="uxt-track">' + trackLabel + '</div>'
    + '<div class="uxt-stats" id="uxt-stats"></div>'
    + '<div class="uxt-row"><input type="text" id="uxt-pid" placeholder="Participant ID"></div>'
    + '<button id="uxt-export" class="uxt-primary">Export CSV</button>'
    + '<div class="uxt-hint">Recording started automatically on page load — nothing to press. Export at the end of the session.</div>';
  document.body.appendChild(panel);

  function renderStats() {
    var stats = document.getElementById('uxt-stats');
    if (!stats) return;
    var elapsed = Math.round((Date.now() - sessionStart) / 1000);
    stats.textContent = elapsed + 's elapsed · ' + clickCount + ' clicks · ' + log.length + ' events';
    pill.textContent = '⏱ ' + elapsed + 's / ' + clickCount + ' clicks · ' + trackTag;
  }
  setInterval(renderStats, 1000);
  renderStats();

  pill.addEventListener('click', function() { panel.hidden = false; pill.hidden = true; });
  document.getElementById('uxt-close').addEventListener('click', function() { panel.hidden = true; pill.hidden = false; });
  document.getElementById('uxt-export').addEventListener('click', exportCSV);

  /* Exposed for console access / debugging */
  window._uxTracking = { record: record, exportCSV: exportCSV, getLog: function() { return log.slice(); }, track: track };
})();
