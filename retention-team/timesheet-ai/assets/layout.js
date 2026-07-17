/* =============================================================
   Starter template — shell boot
   -------------------------------------------------------------
   Initialises the Hubstaff shell. The shell handles all of the
   top bar, sidebar, and collapse/expand behaviour internally.
   Add app-level logic below this init call.
   ============================================================= */

HubstaffShell.init({
  activeItem: 'timesheets', // which sidebar icon is highlighted
  activeSub:  'Timesheets', // which sub-item is highlighted (first "Timesheets" entry — the renamed Time Logged feature)
  logoHref:   '#',          // where the Hubstaff logo links to
  expanded:   true,         // start with sidebar expanded
});

/* Programmatic control of the sidebar, if you ever need it:
 *
 *   document.body.classList.add('hs-expanded');     // expand
 *   document.body.classList.remove('hs-expanded');  // collapse
 *   document.body.classList.toggle('hs-expanded');  // toggle
 *
 * Or change the active sidebar item:
 *
 *   HubstaffShell.setActiveItem('payments');
 */
