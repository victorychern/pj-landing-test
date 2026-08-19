/* ── Drawn scrollbar ──
   Replaces the native scrollbar for a scrolling box, because on macOS/iOS the
   native one is an overlay: it can't sit beside or below the content, and it
   fades away when idle.

   <div data-scrollbox="x">…</div>          x or y
   <div data-scrollbar><span></span></div>  must be a sibling

   The bar hides itself when there is nothing to scroll.
*/
(function () {
  document.querySelectorAll('[data-scrollbox]').forEach(function (box) {
    var bar = box.parentNode.querySelector('[data-scrollbar]');
    if (!bar) return;
    var thumb = bar.firstElementChild;
    var vertical = box.dataset.scrollbox === 'y';

    // one set of names per axis keeps the maths identical for both
    var size    = vertical ? 'clientHeight' : 'clientWidth';
    var content = vertical ? 'scrollHeight' : 'scrollWidth';
    var offset  = vertical ? 'scrollTop'    : 'scrollLeft';
    var barSize = vertical ? 'clientHeight' : 'clientWidth';
    var dim     = vertical ? 'height'       : 'width';
    var axis    = vertical ? 'Y'            : 'X';

    function update() {
      var ratio = box[size] / box[content];
      if (ratio >= 1) { bar.hidden = true; return; }
      // reveal before measuring: a hidden bar has no track to measure
      bar.hidden = false;
      // clientHeight/Width includes the bar's padding, so subtract it — the
      // thumb lives in the content box and would otherwise overshoot it
      var cs = getComputedStyle(bar);
      var pad = vertical
        ? parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
        : parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      var track = bar[barSize] - pad;
      var len = Math.max(32, track * ratio);
      var max = box[content] - box[size];
      thumb.style[dim] = len + 'px';
      thumb.style.transform = 'translate' + axis + '(' + (box[offset] / max) * (track - len) + 'px)';
    }

    box.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // the content can change without a resize — e.g. a tab swaps the panel
    if (window.MutationObserver) {
      new MutationObserver(update).observe(box, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['hidden']
      });
    }
    update();

    thumb.addEventListener('pointerdown', function (e) {
      var start = vertical ? e.clientY : e.clientX;
      var from = box[offset];
      var track = bar[barSize];
      var len = vertical ? thumb.offsetHeight : thumb.offsetWidth;
      var max = box[content] - box[size];
      thumb.setPointerCapture(e.pointerId);
      function move(ev) {
        var delta = (vertical ? ev.clientY : ev.clientX) - start;
        box[offset] = from + delta / (track - len) * max;
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
