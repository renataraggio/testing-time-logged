/**
 * Design Annotations data for the Time Logged / Timesheets prototype.
 *
 * This is a changelog against the prototype baseline, grouped by the two
 * view-toggle sections in index.html (there's no routing — #view-time-logged /
 * #view-timesheets are shown/hidden via CSS classes in the same document), so
 * `navigate` in the init script just swaps which one is visible.
 */
window.DESIGN_ANNOTATIONS_DATA = {
  pages: [
    { id: 'time-logged', label: 'Timesheets' },
    { id: 'timesheets',  label: 'Approvals' },
  ],

  annotations: [
    // ── Header filters ───────────────────────────────────────────────────
    {
      id: 'tl-team-filter-chip-style',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Header filters',
      title: '"All teams" matches the Add time modal\'s chip style',
      description: 'Selecting 2+ teams in the "All teams" header filter renders one named chip per team (colored dot + name) — the same style and logic as the Add time modal\'s teams select — instead of collapsing into a count badge. The select box grows to fit the chips (up to a max width) rather than staying a fixed 180px. The open dropdown panel itself (search, "Select all" / "Unselect all", checkmark on selected rows) matches the "All members" dropdown\'s panel style exactly — only the closed-state trigger differs (chips vs. count badge), which is intentional.',
      target: '#tl-team-select',
      sub: [
        'Single selection (1 team) is unchanged — color circle plus name',
        'No selection ("All teams" placeholder) is unchanged',
        '"Select all" / "Unselect all" here only affect teams currently visible under the search text',
      ],
    },
    {
      id: 'tl-member-filter-count-badge',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Header filters',
      title: '"All members" uses a count badge, plus Select all / Unselect all',
      description: 'Selecting 2+ members in the "All members" header filter shows a solid blue circular badge with the count (e.g. "2") next to the generic label "Members" — not individual name chips, and not a light count-pill with a close button. The dropdown list also gained "Select all" / "Unselect all" quick links above the member list, and selected rows show a checkmark on the right (in addition to the existing light-blue row highlight) rather than relying on the highlight alone.',
      target: '#tl-member-select',
      sub: [
        'Single selection (1 member) is unchanged — avatar plus name',
        'No selection ("All members" placeholder) is unchanged',
        'Deliberately different from the team filter and the Add time modal\'s chip style — this is the correct reference for this specific control',
      ],
    },
    {
      id: 'tl-team-filters-member-dropdown',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Header filters',
      title: '"All teams" filters the "All members" dropdown — and the table',
      description: 'Selecting one or more teams narrows the "All members" dropdown to only members on those teams — the same team → member mapping and filtering logic as the Add time modal\'s teams/members selects. It also filters the Daily/Weekly table itself to just that team\'s members, even before picking any individual member from the "All members" dropdown. "Select all" / "Unselect all" only apply to the currently visible (team + search filtered) members, not the full roster. If a team change would leave a previously-selected member no longer visible, that member is automatically dropped from the selection (same rule as the modal). Explicitly picking individual members from "All members" still narrows further/overrides the team-only filter.',
      target: '#tl-team-select, #tl-member-select',
    },

    // ── Date range picker ────────────────────────────────────────────────
    {
      id: 'tl-date-range-picker-interactive',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Date range picker',
      title: 'Date range pill opens an interactive picker',
      description: 'Clicking the date range pill (previously a static, non-interactive display) opens a popover with quick presets (Today, Yesterday, This week, Last week) and a two-month calendar for picking a custom range. Presets apply immediately and close the popover; a custom range needs two clicks (start day, then end day) and applies on the second click. Month navigation arrows shift both calendars together.',
      target: '#tl-date-range-btn',
      sub: [
        "The calendar's day-of-week alignment matches this prototype's existing convention (Nov 4, 2024 = Sunday) rather than the real Gregorian calendar, so it lines up with the rest of the app's hardcoded day labels",
      ],
    },
    {
      id: 'tl-date-range-filters-daily-view',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Date range picker',
      title: 'Picking a date range actually filters the Daily view',
      description: 'Applying a preset or custom range (via the date range picker) now re-renders the Daily view — both the multi-member table and an individual member\'s drilled-in page — to only show day sections that fall within the picked range, instead of always showing the full hardcoded two-week window regardless of what was picked. If the picked range has no overlap with the day the prototype has data for, an empty state ("No logged time in the selected date range.") shows instead of a blank page.',
      target: '#tl-date-range-btn',
      sub: [
        'Weekly and Monthly views are unaffected by this — Weekly always shows a full calendar week by design, and Monthly is disabled (coming soon)',
      ],
    },
    // ── Daily / Weekly / Monthly view ────────────────────────────────────
    {
      id: 'tl-monthly-tab-coming-soon',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Daily / Weekly / Monthly view',
      title: '"Monthly" tab is disabled — coming soon',
      description: 'The Monthly time-logged view isn\'t built yet. The "Monthly" segmented tab (single-member, multi-member, and calendar-mode header variants) is disabled and does not respond to clicks. It carries a persistent "Soon" badge next to the label — not just a hover tooltip — since a disabled-looking control doesn\'t invite hovering, and hover doesn\'t exist on touch. The tooltip ("Monthly view — coming soon") is still there as a secondary detail layer. "Daily" and "Weekly" are unaffected — "Weekly" already covers the Google-Calendar-style grid view for a single member.',
      target: '.ts-seg-btn:disabled, .tl-seg-btn:disabled, .tl-tab-soon-badge',
    },

    // ── Table improvements ──────────────────────────────────────────────
    {
      id: 'tl-row-click-to-detail',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Table improvements',
      title: 'Scope row clickability to the member cell, not the whole row',
      description: "Hovering anywhere in the row highlights the whole row and reveals the \"View time logged\" button (so the row still reads as a unit), but only the member's avatar/name cell — plus that \"View time logged\" button — actually navigates to that member's individual Time Logged page. The rest of the row (total time, activity, idle, etc.) highlights on hover but isn't clickable, so users don't accidentally trigger navigation from elsewhere in the row.",
      target: '.tl-tbl-body .tl-tbl-member--clickable',
      sub: [
        'Excludes the Actions button/menu, which has its own click behavior',
        'Excludes the table header row',
        'Revised from an earlier version of this spec that made the entire row clickable — usability review flagged that as too broad',
      ],
    },
    {
      id: 'tl-weekly-multi-row-click-to-detail',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Table improvements',
      title: 'Same row-click behavior and hover style in the multi-member Weekly table',
      description: "The multi-member Weekly table (the per-day-totals table shown under the Weekly tab, distinct from the Daily table) matches the Daily table exactly: same gray row-hover background, and the same \"View time logged\" pill that animates in next to the member's name on hover. Only the member's avatar/name cell (plus that button) is clickable — clicking it drills into that member's own Weekly time logged view (not Daily), the Weekly tab stays selected.",
      target: '.ts-wmk-member--clickable',
    },
    {
      id: 'tl-row-hover-tooltip',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Table improvements',
      title: 'Add a tooltip on hover for the clickable member cell',
      description: 'Since only the member cell is clickable, hovering it (and the "View time logged" button that appears on hover) should show a tooltip: "Go to [name]\'s time logged" — so it\'s clear which part of the row is interactive.',
      target: '.tl-tbl-body .tl-tbl-member--clickable',
    },
    {
      id: 'tl-row-actions-view-time-logged',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Table improvements',
      title: 'Add "View time logged" to the row Actions dropdown',
      description: 'Alongside the existing options (Add time, View screenshots, etc.), add a "View time logged" action that opens that row\'s member in their individual Time Logged page — the same destination as clicking the row itself.',
      target: '.tl-actions-dd__item[data-action="view-time-logged"]',
    },
    {
      id: 'tl-row-deep-link-date',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Table improvements',
      title: "Deep-link a row click to that row's specific day",
      description: "Clicking a row under a specific date (e.g. Tue, Nov 6) should open the member's individual Time Logged page with that exact day expanded and scrolled into view — every other day stays collapsed.",
      target: '.tl-tbl-body .tl-tbl-row',
      sub: [
        'Falls back to the first day with logged time when there\'s no specific date context (e.g. picking a member from the header dropdown instead of clicking a row)',
      ],
    },

    // ── Different user roles, different experiences ─────────────────────
    {
      id: 'tl-manager-default-view',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Different user roles, different experiences',
      title: 'Managers land on the multi-member view by default',
      description: 'When a manager, org owner, or team lead opens Time Logged, they should land on the multi-member table showing the whole team — not any one person\'s individual page.',
      target: '#hs-role-switch',
    },
    {
      id: 'tl-member-default-view',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Different user roles, different experiences',
      title: 'Regular users land on their own individual Time Logged page by default',
      description: "A regular team member (no admin permissions) should land directly on their own individual Time Logged page — there's no multi-member table for them to see, and no way to switch to another member.",
      target: '#hs-role-switch',
      reveal: 'switch-to-member-role',
      sub: [
        "Header shows their name and avatar as a plain label — no dropdown, no chevron, no way to switch to anyone else's data",
      ],
    },

    // ── Unified "Add time" modal experience ──────────────────────────────
    {
      id: 'utm-teams-count-badge',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Unified "Add time" modal experience',
      title: 'Add time modal\'s Teams select shows a count badge for 2+',
      description: 'Selecting more than one team in the Add time modal\'s "Select teams" field now shows a solid blue circular count badge (e.g. "2") plus the generic label "Teams", instead of one named chip per team. Selecting exactly one team still shows that single chip (dot + name) as before.',
      target: '#utm-teams-select',
    },
    {
      id: 'tl-unified-add-time-modal',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Unified "Add time" modal experience',
      title: 'Add time the same way from Timesheets as from Approvals',
      description: 'Clicking "Add time" here should open the same modal experience as clicking "Add time" on the Approvals page. Previously the two pages opened different modals with different flows.',
      target: '#tl-add-time-btn',
    },
    {
      id: 'tsh-unified-add-time-modal',
      page: 'timesheets',
      kind: 'required',
      priority: 'high',
      group: 'Unified "Add time" modal experience',
      title: 'Add time the same way from Approvals as from Timesheets',
      description: 'Clicking "Add time" here should open the same modal experience as clicking "Add time" on the Timesheets page — one consistent flow regardless of which page you start from.',
      target: '#tsh-add-time-btn',
    },
    {
      id: 'tsh-download-coming-soon',
      page: 'timesheets',
      kind: 'required',
      priority: 'medium',
      group: 'Table improvements',
      title: 'Download is disabled — coming soon',
      description: "The Download icon button next to \"Add time\" doesn't do anything yet — there are technical limitations to sort out before it can export real data. It's disabled with a \"Download — coming soon\" tooltip instead of looking clickable with no effect.",
      target: '.tsh-icon-btn[disabled]',
    },
    {
      id: 'tl-single-member-one-entry-only',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Unified "Add time" modal experience',
      title: 'One time entry only for genuine self-service; managers can add multiple slots for anyone else',
      description: '"Add time span" (multiple time entries in one save) is restricted only when a regular member is adding their own time ("locked" mode) — there, a single time entry is allowed and "Add time span"/"Total hours" are hidden. A manager adding time for someone else keeps "Add time span" available whether they\'re scoped to one specific member ("single" mode) or several ("multi"/"batch" mode), so they can log several time slots for that person in one save.',
      target: '#utm-add-span-btn',
      sub: [
        '"Locked" mode (regular member, self-service) is the only mode limited to one entry',
        '"Single" mode (manager viewing one specific member) and multi-member mode both keep "Add time span" and the "Total hours" footer',
      ],
    },
    {
      id: 'tl-workbreak-multi-member-disabled',
      page: 'time-logged',
      kind: 'required',
      priority: 'medium',
      group: 'Unified "Add time" modal experience',
      title: 'No Time log / Work break tabs for multi-member "Add time"',
      description: "Work breaks currently only ever support one member and one time entry — there's no real multi-member work break flow. Rather than show a tab bar with Work break disabled, multi-member \"Add time\" skips the tab bar entirely and goes straight into the Time log content (Members, Time selection, Assignment). The tabs reappear normally once the modal is scoped to one member (single or locked mode), where Work break is fully available.",
      target: '#utm-tabs',
    },
    {
      id: 'tl-save-success-toast',
      page: 'time-logged',
      kind: 'required',
      priority: 'high',
      group: 'Unified "Add time" modal experience',
      title: 'Saving shows a green success toast',
      description: 'Clicking Save closes the modal and confirms with a toast in the app\'s standard green success style (matching existing success states elsewhere) — not the black/dark style. "Time entry added." for the Time log tab, "Work break added." for the Work break tab.',
      target: '#utm-save-btn',
    },
  ],
};
