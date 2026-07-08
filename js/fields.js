/* ── Field component: custom select dropdowns ──
   Shared across pages. Markup contract:
   .sel-wrap[data-sel]            — dropdown field (custom select)
   .sel-wrap.sel-wrap--empty      — select with no value yet (label acts as placeholder)
   .sel-wrap.sel-wrap--text       — plain text input, no JS needed (CSS :placeholder-shown)
*/
(function () {
  var TRACK_H = 272; // 292 total height - 10px padding top - 10px padding bottom

  function pfUpdateScrollbar(drop) {
    var list = drop.querySelector('.sel-drop-list');
    var sb = drop.querySelector('.sel-scrollbar');
    if (!list || !sb) return;
    var thumb = sb.querySelector('.sel-scrollbar-thumb');
    var ratio = list.clientHeight / list.scrollHeight;
    if (ratio >= 1) { sb.classList.remove('is-visible'); return; }
    sb.classList.add('is-visible');
    var thumbH = Math.max(20, ratio * TRACK_H);
    var scrollRatio = list.scrollHeight > list.clientHeight
      ? list.scrollTop / (list.scrollHeight - list.clientHeight) : 0;
    thumb.style.height = thumbH + 'px';
    thumb.style.top = (10 + scrollRatio * (TRACK_H - thumbH)) + 'px';
  }

  function pfCloseAll() {
    document.querySelectorAll('.sel-drop.is-open').forEach(function (drop) {
      var list = drop.querySelector('.sel-drop-list');
      if (list) list.scrollTop = 0;
      var sb = drop.querySelector('.sel-scrollbar');
      if (sb) sb.classList.remove('is-visible');
      // Reset search
      var noResults = drop.querySelector('.sel-drop-no-results');
      if (noResults) noResults.classList.remove('is-visible');
      var dropList = drop.querySelector('.sel-drop-list');
      if (dropList) dropList.style.display = '';
      drop.querySelectorAll('.sel-drop-item').forEach(function (i) { i.style.display = ''; });
      drop.classList.remove('is-open', 'sel-drop--up');
      var wrap = drop.closest('.sel-wrap[data-sel]');
      if (!wrap) return;
      var searchInput = wrap.querySelector('.sel-search');
      if (searchInput) { searchInput.value = ''; searchInput.tabIndex = -1; }
      wrap.querySelector('.sel-input').classList.remove('sel-input--open');
      var chev = wrap.querySelector('.sel-chev');
      if (chev) chev.src = 'assets/chevron-down-field.svg';
    });
  }

  function pfMarkSelected(item) {
    item.closest('.sel-drop').querySelectorAll('.sel-drop-item').forEach(function (i) {
      i.classList.remove('sel-drop-item--on');
      var chk = i.querySelector('.sel-drop-check');
      if (chk) chk.remove();
    });
    item.classList.add('sel-drop-item--on');
    var newChk = document.createElement('img');
    newChk.src = 'assets/check-m.svg';
    newChk.className = 'sel-drop-check';
    newChk.alt = '';
    item.appendChild(newChk);
  }

  document.addEventListener('click', function (e) {
    // Toggle dropdown on input click
    // Clicking inside search input should not toggle dropdown
    if (e.target.closest('.sel-search')) { e.stopPropagation(); return; }

    var input = e.target.closest('.sel-wrap[data-sel] .sel-input');
    if (input) {
      e.stopPropagation();
      var wrap = input.closest('.sel-wrap[data-sel]');
      var drop = wrap.querySelector('.sel-drop');
      var chev = wrap.querySelector('.sel-chev');
      var isOpen = drop.classList.contains('is-open');
      pfCloseAll();
      if (!isOpen) {
        // Show temporarily to measure height
        drop.style.visibility = 'hidden';
        drop.style.display = 'flex';
        var dropH = drop.offsetHeight;
        drop.style.display = '';
        drop.style.visibility = '';
        var inputRect = input.getBoundingClientRect();
        var spaceBelow = window.innerHeight - inputRect.bottom;
        if (spaceBelow < dropH + 16) {
          drop.classList.add('sel-drop--up');
        }
        drop.classList.add('is-open');
        input.classList.add('sel-input--open');
        if (chev) chev.src = 'assets/chevron-up-field.svg';
        var searchInput = wrap.querySelector('.sel-search');
        if (searchInput) {
          searchInput.value = wrap.querySelector('.sel-value').textContent.trim();
          searchInput.tabIndex = 0;
          searchInput.focus();
          searchInput.select();
        }
        pfUpdateScrollbar(drop);
      }
      return;
    }

    // Country item click
    var countryItem = e.target.closest('.sel-drop:not(.sel-drop--plan) .sel-drop-item');
    if (countryItem) {
      e.stopPropagation();
      var wrap = countryItem.closest('.sel-wrap[data-sel]');
      var name = countryItem.querySelector('.sel-drop-name').textContent.trim();
      var flagEl = countryItem.querySelector('img:first-child');
      var fieldFlag = wrap.querySelector('.sel-flag');
      var fieldVal = wrap.querySelector('.sel-value');
      if (fieldVal) fieldVal.textContent = name;
      if (fieldFlag && flagEl) fieldFlag.src = flagEl.src;

      pfMarkSelected(countryItem);
      var dropList = countryItem.closest('.sel-drop-list');
      dropList.insertBefore(countryItem, dropList.firstElementChild);
      wrap.classList.remove('sel-wrap--empty');
      pfCloseAll();
      return;
    }

    // Plan item click
    var planItem = e.target.closest('.sel-drop--plan .sel-drop-item');
    if (planItem) {
      e.stopPropagation();
      var wrap = planItem.closest('.sel-wrap[data-sel]');
      var name = planItem.querySelector('.sel-drop-name').textContent.trim();
      wrap.querySelector('.sel-value').textContent = name;

      pfMarkSelected(planItem);
      wrap.classList.remove('sel-wrap--empty');
      pfCloseAll();
      return;
    }

    // Click outside — close all
    if (!e.target.closest('.sel-wrap[data-sel]')) {
      pfCloseAll();
    }
  });

  // Search / filter
  document.addEventListener('input', function(e) {
    if (!e.target.classList.contains('sel-search')) return;
    var wrap = e.target.closest('.sel-wrap[data-sel]');
    if (!wrap) return;
    var drop = wrap.querySelector('.sel-drop');
    if (!drop) return;
    var query = e.target.value.toLowerCase().trim();
    var hasMatch = false;
    drop.querySelectorAll('.sel-drop-item').forEach(function(item) {
      var name = item.querySelector('.sel-drop-name');
      if (!name) return;
      var match = !query || name.textContent.toLowerCase().includes(query);
      item.style.display = match ? '' : 'none';
      if (match) hasMatch = true;
    });
    var dropList = drop.querySelector('.sel-drop-list');
    if (dropList) dropList.style.display = hasMatch ? '' : 'none';
    var noResults = drop.querySelector('.sel-drop-no-results');
    if (noResults) noResults.classList.toggle('is-visible', !hasMatch);
    var sb = drop.querySelector('.sel-scrollbar');
    if (sb && !hasMatch) sb.classList.remove('is-visible');
    if (hasMatch) pfUpdateScrollbar(drop);
  });

  // Custom scrollbar — update thumb position on scroll
  document.addEventListener('scroll', function(e) {
    var list = e.target;
    if (!list.classList || !list.classList.contains('sel-drop-list')) return;
    var drop = list.closest('.sel-drop');
    if (drop) pfUpdateScrollbar(drop);
  }, { passive: true, capture: true });

  // Scrollbar drag
  var pfDrag = null;

  document.addEventListener('mousedown', function(e) {
    var sb = e.target.closest('.sel-scrollbar');
    if (!sb) return;
    var drop = sb.closest('.sel-drop');
    if (!drop) return;
    var list = drop.querySelector('.sel-drop-list');
    if (!list) return;
    e.preventDefault();
    sb.classList.add('is-dragging');
    pfDrag = { list: list, drop: drop, sb: sb, startY: e.clientY, startScrollTop: list.scrollTop };
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!pfDrag) return;
    var list = pfDrag.list;
    var ratio = list.clientHeight / list.scrollHeight;
    var thumbH = Math.max(20, ratio * TRACK_H);
    var delta = e.clientY - pfDrag.startY;
    list.scrollTop = pfDrag.startScrollTop + delta / (TRACK_H - thumbH) * (list.scrollHeight - list.clientHeight);
    pfUpdateScrollbar(pfDrag.drop);
  });

  document.addEventListener('mouseup', function() {
    if (!pfDrag) return;
    pfDrag.sb.classList.remove('is-dragging');
    pfDrag = null;
    document.body.style.userSelect = '';
  });
})();
