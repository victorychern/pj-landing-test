/* ── Horizontal scroll indicator ──
   Drives a drawn scrollbar for a horizontally scrolling box, because the
   native one is an overlay on macOS/iOS and can't sit below the content.

   <div data-hscroll> … wide content … </div>
   <div data-hscroll-bar><span></span></div>

   The bar hides itself when there is nothing to scroll.
*/
(function () {
  document.querySelectorAll('[data-hscroll]').forEach(function (box) {
    var bar = box.parentNode.querySelector('[data-hscroll-bar]');
    if (!bar) return;
    var thumb = bar.firstElementChild;

    function update() {
      var track = bar.clientWidth;
      var ratio = box.clientWidth / box.scrollWidth;
      if (ratio >= 1) { bar.hidden = true; return; }
      bar.hidden = false;
      var w = Math.max(32, track * ratio);
      var max = box.scrollWidth - box.clientWidth;
      thumb.style.width = w + 'px';
      thumb.style.transform = 'translateX(' + (box.scrollLeft / max) * (track - w) + 'px)';
    }

    box.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // dragging the thumb scrolls the box
    thumb.addEventListener('pointerdown', function (e) {
      var startX = e.clientX, startLeft = box.scrollLeft;
      var track = bar.clientWidth, w = thumb.offsetWidth;
      var max = box.scrollWidth - box.clientWidth;
      thumb.setPointerCapture(e.pointerId);
      function move(ev) {
        box.scrollLeft = startLeft + (ev.clientX - startX) / (track - w) * max;
      }
      function up() {
        thumb.removeEventListener('pointermove', move);
        thumb.removeEventListener('pointerup', up);
      }
      thumb.addEventListener('pointermove', move);
      thumb.addEventListener('pointerup', up);
      e.preventDefault();
    });
  });
})();
