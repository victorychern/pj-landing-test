/* ── Interactive globe ──
   Renders an orthographic globe on a canvas: drag to spin, hover an available
   country to highlight it, click to open its location page.

   Countries come in three states, matching the mockup:
     · current  — the country this page is about
     · available — sold here, so it highlights and links out
     · muted    — not offered, inert
   The available list comes from assets/globe-countries.json, keyed by the name
   used in the map data, so the backend can regenerate that file on its own.

   Colours are read from CSS custom properties on the container, keeping the
   globe on design tokens.

   Below the mobile breakpoint the globe is purely decorative — it shows the
   page's country centred and flagged, and takes no input at all. Dragging it
   there only fought with the page scroll.

   Markup contract:
   <div class="loc-globe" data-globe data-country="United States of America">
     <canvas class="loc-globe-canvas"></canvas>
     <img class="loc-globe-flag">           optional marker pinned to the country
     <div class="loc-globe-tip"></div>
   </div>
*/
(function () {
  var root = document.querySelector('[data-globe]');
  if (!root || !window.d3 || !window.topojson) return;

  var canvas = root.querySelector('.loc-globe-canvas');
  var flag   = root.querySelector('.loc-globe-flag');
  var tip    = root.querySelector('.loc-globe-tip');
  var ctx    = canvas.getContext('2d');

  var HOME = root.dataset.country || '';
  var CENTRES = { 'United States of America': [-98.5, 39.8] };

  // Breakpoint mirrors css/location.css, which also drops the tooltip and
  // makes the canvas ignore pointer events
  var mobile = window.matchMedia('(max-width: 960px)');
  function interactive() { return !mobile.matches; }

  var SIZE = 0, features = [], available = {}, hovered = null, ready = false;

  var projection = d3.geoOrthographic();
  var path = d3.geoPath(projection, ctx);
  var graticule = d3.geoGraticule10();

  function token(name, fallback) {
    return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  }
  function pageFor(mapName) {
    var c = available[mapName];
    // Relative so the site works from a subfolder; resolves against <base>
    return c ? 'locations/' + c.slug + '-proxy/' : null;
  }

  // Canvas is sized in CSS pixels but backed at device resolution for sharpness
  function resize() {
    SIZE = root.clientWidth;
    if (!interactive()) restRotation();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = canvas.style.height = SIZE + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    projection.scale(SIZE / 2 - 1).translate([SIZE / 2, SIZE / 2]);
    draw();
  }

  // Face the page's country again — the resting pose the mobile layout shows
  function restRotation() {
    cancelAnimationFrame(raf);
    dragging = false; spin = [0, 0];
    if (hovered) { hovered = null; hideTip(); }
    root.classList.remove('is-linked', 'is-dragging');
    var centre = CENTRES[HOME] || [0, 20];
    projection.rotate([-centre[0], -centre[1] + 2]);
  }

  function draw() {
    if (!SIZE) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.beginPath(); path({ type: 'Sphere' });
    ctx.fillStyle = token('--globe-sphere', '#FCFCFC'); ctx.fill();

    ctx.beginPath(); path(graticule);
    ctx.strokeStyle = token('--globe-grid', '#C1C1C7');
    ctx.setLineDash([2, 3]); ctx.lineWidth = 0.5; ctx.stroke(); ctx.setLineDash([]);

    var cCurrent = token('--globe-land-current', '#747CFB');
    var cOpen    = token('--globe-land', '#B6B9FB');
    var cHover   = token('--globe-land-hover', '#959AFB');
    var cMuted   = token('--globe-land-muted', '#D2D4FB');
    var stroke   = token('--globe-stroke', '#fff');

    features.forEach(function (f) {
      var name = f.properties.name;
      ctx.beginPath(); path(f);
      ctx.fillStyle = name === HOME ? cCurrent
                    : !available[name] ? cMuted
                    : f === hovered ? cHover
                    : cOpen;
      ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 0.6; ctx.stroke();
    });

    placeFlag();
  }

  // Pin the flag marker to its country, hiding it once it spins out of view
  function placeFlag() {
    if (!flag) return;
    var centre = CENTRES[HOME];
    if (!centre) { flag.style.display = 'none'; return; }
    var r = projection.rotate();
    if (d3.geoDistance(centre, [-r[0], -r[1]]) >= Math.PI / 2) { flag.style.display = 'none'; return; }
    var p = projection(centre);
    flag.style.display = '';
    flag.style.left = p[0] + 'px';
    flag.style.top  = p[1] + 'px';
  }

  // Only available countries respond to the pointer
  function hitAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var pt = projection.invert([clientX - rect.left, clientY - rect.top]);
    if (!pt || isNaN(pt[0])) return null;
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      if (!available[f.properties.name]) continue;
      if (d3.geoContains(f, pt)) return f;
    }
    return null;
  }

  /* ── Interaction ── */
  var dragging = false, moved = false, last = null, spin = [0, 0], raf = null;

  function rotateBy(dx, dy) {
    var r = projection.rotate();
    projection.rotate([r[0] + dx, Math.max(-90, Math.min(90, r[1] - dy))]);
    draw();
  }

  function startInertia() {
    cancelAnimationFrame(raf);
    (function step() {
      if (dragging) return;
      spin[0] *= 0.94; spin[1] *= 0.94;
      if (Math.abs(spin[0]) < 0.02 && Math.abs(spin[1]) < 0.02) return;
      rotateBy(spin[0], spin[1]);
      raf = requestAnimationFrame(step);
    })();
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (!ready || !interactive()) return;
    dragging = true; moved = false; last = [e.clientX, e.clientY];
    cancelAnimationFrame(raf);
    canvas.setPointerCapture(e.pointerId);
    root.classList.add('is-dragging');
    hideTip();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (dragging) {
      var dx = (e.clientX - last[0]) * 0.4, dy = (e.clientY - last[1]) * 0.4;
      if (Math.abs(e.clientX - last[0]) + Math.abs(e.clientY - last[1]) > 3) moved = true;
      spin = [dx, dy];
      rotateBy(dx, dy);
      last = [e.clientX, e.clientY];
      return;
    }
    if (!ready || !interactive()) return;
    var hit = hitAt(e.clientX, e.clientY);
    if (hit !== hovered) { hovered = hit; draw(); }
    if (hit) showTip(available[hit.properties.name].name, e.clientX, e.clientY);
    else hideTip();
    root.classList.toggle('is-linked', !!hit);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    if (e && e.pointerId != null && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    startInertia();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', function () {
    if (!dragging && hovered) { hovered = null; draw(); hideTip(); }
  });

  canvas.addEventListener('click', function (e) {
    if (moved || !ready || !interactive()) return; // a drag shouldn't count as a click
    var hit = hitAt(e.clientX, e.clientY);
    var url = hit && pageFor(hit.properties.name);
    if (url) window.location.href = url;
  });

  function showTip(text, clientX, clientY) {
    if (!tip) return;
    var rect = root.getBoundingClientRect();
    tip.textContent = text;
    tip.style.left = (clientX - rect.left) + 'px';
    tip.style.top  = (clientY - rect.top) + 'px';
    tip.classList.add('is-visible');
  }
  function hideTip() { if (tip) tip.classList.remove('is-visible'); }

  /* ── Boot ── */
  Promise.all([
    fetch('assets/countries-110m.json').then(function (r) { return r.json(); }),
    fetch('assets/globe-countries.json').then(function (r) { return r.json(); })
  ]).then(function (res) {
    features = topojson.feature(res[0], res[0].objects.countries).features;
    available = res[1];
    restRotation();
    ready = true;
    root.classList.add('is-ready');
    resize();
  }).catch(function () { /* globe stays hidden; the page still reads fine */ });

  window.addEventListener('resize', resize);
})();
