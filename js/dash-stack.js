/* ── Dashboard screenshot stack ──
   Desktop: windows are stacked; activating one behind the front brings it
   forward and the previously active one drops to the back. Mobile: the stack
   collapses to a tab row (see the media query in index.css) that drives the
   very same windows — only the front one is rendered.

   Positions are just classes (.dash-win--back / --mid / --front), so both
   interactions boil down to swapping them; CSS animates top/width.
*/
(function () {
  var canvas = document.querySelector('.dash-canvas');
  if (!canvas) return;

  var tabs = document.querySelectorAll('.dash-tab');
  var POSITIONS = ['dash-win--back', 'dash-win--mid', 'dash-win--front'];

  function moveTo(win, position) {
    POSITIONS.forEach(function (p) { win.classList.remove(p); });
    win.classList.add(position);
  }

  // Mirror the visual state for assistive tech
  function syncState() {
    canvas.querySelectorAll('.dash-win').forEach(function (win) {
      var isFront = win.classList.contains('dash-win--front');
      var bar = win.querySelector('.dash-win-bar');
      if (!bar) return;
      var name = win.querySelector('.dash-win-name').textContent.trim();
      bar.setAttribute('aria-disabled', isFront ? 'true' : 'false');
      bar.setAttribute('aria-label', isFront ? name + ' — currently shown' : 'Show ' + name);
      if (isFront) bar.setAttribute('aria-current', 'true');
      else bar.removeAttribute('aria-current');
    });

    var frontKey = canvas.querySelector('.dash-win--front').dataset.key;
    tabs.forEach(function (tab) {
      tab.setAttribute('aria-selected', String(tab.dataset.target === frontKey));
    });
  }

  function bringToFront(win) {
    if (!win || win.classList.contains('dash-win--front')) return;

    var front = null, other = null;
    canvas.querySelectorAll('.dash-win').forEach(function (w) {
      if (w.classList.contains('dash-win--front')) front = w;
      else if (w !== win) other = w;
    });
    if (!front || !other) return;

    moveTo(win, 'dash-win--front');
    moveTo(front, 'dash-win--back');
    moveTo(other, 'dash-win--mid');
    syncState();
  }

  // Desktop: the whole window is clickable (its title bar handles the keyboard)
  canvas.addEventListener('click', function (e) {
    bringToFront(e.target.closest('.dash-win'));
  });

  // Mobile: tab row
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      bringToFront(canvas.querySelector('.dash-win[data-key="' + tab.dataset.target + '"]'));
    });
  });

  syncState();
})();
