/* ── Tab switcher ──
   Wires a [role="tablist"] to the panels that carry data-tab-panel, matching
   each tab's data-tab. Keyboard support follows the tabs pattern: arrows move
   between tabs, Home/End jump to the ends.

   Panels are optional — a group with a single always-visible panel (because the
   other types have no content yet) still gets working tab states.

   Two tablists in the same section that name the same panels stay in sync.
*/
(function () {
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"][data-tab]'));
    if (!tabs.length) return;

    var scope = list.closest('section') || document;
    var panels = Array.prototype.slice.call(scope.querySelectorAll('[data-tab-panel]'));

    function select(tab, focus) {
      var key = tab.dataset.tab;
      // Every tab in the section pointing at the same panel follows along, so a
      // section can carry two switchers (e.g. tabs in a window plus a list).
      scope.querySelectorAll('[role="tab"][data-tab]').forEach(function (t) {
        var on = t.dataset.tab === key;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;          // one tab stop per group
      });
      // Only switch panels once there is more than one to switch between
      if (panels.length > 1) {
        panels.forEach(function (p) {
          p.hidden = p.dataset.tabPanel !== tab.dataset.tab;
        });
      }
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next, true);
      });
    });

    select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]);
  });
})();
