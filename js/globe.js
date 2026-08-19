/* ── Interactive globe ──
   Renders an orthographic globe on a canvas: drag to spin, hover an available
   country to highlight it, click to open its location page.

   No dependencies — the projection is a handful of lines of trigonometry, the
   TopoJSON is unpacked by hand, and hit-testing is left to the browser via
   Path2D + isPointInPath.

   Countries come in three states, matching the mockup:
     · current   — the country this page is about
     · available — sold here, so it highlights and links out
     · muted     — not offered, inert
   The available list comes from assets/globe-countries.json, keyed by the name
   used in the map data, so the backend can regenerate that file on its own.

   Below the mobile breakpoint the globe is purely decorative — it shows the
   page's country centred and flagged, and takes no input at all. Dragging it
   there only fought with the page scroll.

   Colours are read from CSS custom properties on the container, keeping the
   globe on design tokens.

   Markup contract:
   <div class="loc-globe" data-globe data-country="United States of America">
     <canvas class="loc-globe-canvas"></canvas>
     <img class="loc-globe-flag">           optional marker pinned to the country
     <div class="loc-globe-tip"></div>
   </div>
*/
(function () {
  var root = document.querySelector('[data-globe]');
  if (!root) return;

  var canvas = root.querySelector('.loc-globe-canvas');
  var flag   = root.querySelector('.loc-globe-flag');
  var tip    = root.querySelector('.loc-globe-tip');
  var ctx    = canvas.getContext('2d');

  var HOME = root.dataset.country || '';
  var CENTRES = { 'United States of America': [-98.5, 39.8] };
  var RAD = Math.PI / 180, TAU = Math.PI * 2;

  // Breakpoint mirrors css/location.css: below it the globe takes no input
  var mobile = window.matchMedia('(max-width: 960px)');
  function interactive() { return !mobile.matches; }

  var SIZE = 0, R = 0, C = 0, DPR = 1;        // canvas size, sphere radius, centre, pixel ratio
  var countries = [], available = {}, hovered = null, ready = false;

  function token(name, fallback) {
    return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  }
  function pageFor(mapName) {
    var c = available[mapName];
    return c ? 'locations/' + c.slug + '-proxy/' : null;
  }

  /* ── Projection ──
     Rotation uses d3's convention: [deltaLambda, deltaPhi] in degrees. A point
     is turned into a unit vector, spun, and read off directly — the component
     facing the viewer decides visibility, the other two are the screen position.
     No atan2/asin needed anywhere. */
  var lamR = 0, cosP = 1, sinP = 0;
  var _v = 0, _y = 0, _z = 0;                 // last rotated point

  function setRotation(a, b) {
    lamR = a * RAD;
    b = Math.max(-90, Math.min(90, b));
    cosP = Math.cos(b * RAD); sinP = Math.sin(b * RAD);
    rot[0] = a; rot[1] = b;
  }
  var rot = [0, 0];

  function rotate(lon, lat) {
    var lam = lon * RAD + lamR, phi = lat * RAD, cp = Math.cos(phi);
    var x = cp * Math.cos(lam), y = cp * Math.sin(lam), z = Math.sin(phi);
    _v = x * cosP - z * sinP;                 // >= 0 means on the near side
    _y = y;
    _z = z * cosP + x * sinP;
  }
  function sx(y) { return C + R * y; }
  function sy(z) { return C - R * z; }

  /* ── TopoJSON, decoded by hand ──
     Arcs are delta-encoded on a quantised grid; a ring is a list of arc indices,
     where a negative index ~i means "arc i, reversed". */
  function decodeArcs(topo) {
    var s = topo.transform.scale, t = topo.transform.translate;
    return topo.arcs.map(function (arc) {
      var x = 0, y = 0, out = new Float64Array(arc.length * 2);
      for (var i = 0; i < arc.length; i++) {
        x += arc[i][0]; y += arc[i][1];
        out[i * 2]     = x * s[0] + t[0];
        out[i * 2 + 1] = y * s[1] + t[1];
      }
      return out;
    });
  }

  function ring(arcs, idx) {
    var pts = [];
    for (var i = 0; i < idx.length; i++) {
      var k = idx[i], rev = k < 0, a = arcs[rev ? ~k : k], n = a.length / 2, j;
      // arcs share endpoints, so every arc after the first drops its first point
      if (rev) for (j = n - 1 - (i ? 1 : 0); j >= 0; j--) pts.push(a[j * 2], a[j * 2 + 1]);
      else     for (j = i ? 1 : 0; j < n; j++)             pts.push(a[j * 2], a[j * 2 + 1]);
    }
    return Float64Array.from(pts);
  }

  function build(topo) {
    var arcs = decodeArcs(topo);
    return topo.objects.countries.geometries.map(function (g) {
      var rings = [];
      var polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
      polys.forEach(function (poly) {
        poly.forEach(function (r) { rings.push(ring(arcs, r)); });
      });
      return { name: g.properties.name, rings: rings, path: null };
    });
  }

  /* ── Clipping to the visible hemisphere ──
     Points behind the globe would otherwise fold onto the front. Rings that
     straddle the horizon are cut at the crossing point and closed along the rim,
     which is what d3's spherical clipping produces. */
  var BV = [], BY = [], BZ = [];

  function addRing(p, r) {
    var n = r.length / 2, i, allNear = true, anyNear = false;
    for (i = 0; i < n; i++) {
      rotate(r[i * 2], r[i * 2 + 1]);
      BV[i] = _v; BY[i] = _y; BZ[i] = _z;
      if (_v >= 0) anyNear = true; else allNear = false;
    }
    if (!anyNear) return;

    if (allNear) {
      p.moveTo(sx(BY[0]), sy(BZ[0]));
      for (i = 1; i < n; i++) p.lineTo(sx(BY[i]), sy(BZ[i]));
      p.closePath();
      return;
    }

    // where an edge crosses the horizon, land exactly on the rim
    function crossing(i, j) {
      var t = BV[i] / (BV[i] - BV[j]);
      var y = BY[i] + t * (BY[j] - BY[i]), z = BZ[i] + t * (BZ[j] - BZ[i]);
      var m = Math.hypot(y, z) || 1;
      return [y / m, z / m];
    }

    var start = -1;
    for (i = 0; i < n; i++) if (BV[i] < 0 && BV[(i + 1) % n] >= 0) { start = i; break; }
    if (start < 0) return;

    var i0 = start, steps = 0, open = false, a0 = 0;
    while (steps++ <= n) {
      var j = (i0 + 1) % n, near = BV[i0] >= 0, nearNext = BV[j] >= 0, c;
      if (!near && nearNext) {                       // entering view
        c = crossing(i0, j);
        a0 = Math.atan2(-c[1], c[0]);                // rim angle, screen-space
        p.moveTo(sx(c[0]), sy(c[1]));
        p.lineTo(sx(BY[j]), sy(BZ[j]));
        open = true;
      } else if (near && nearNext) {
        if (open) p.lineTo(sx(BY[j]), sy(BZ[j]));
      } else if (near && !nearNext && open) {        // leaving view
        c = crossing(i0, j);
        p.lineTo(sx(c[0]), sy(c[1]));
        var a1 = Math.atan2(-c[1], c[0]);
        var d = a0 - a1; while (d < 0) d += TAU;     // close along the shorter rim arc
        p.arc(C, C, R, a1, a0, d > Math.PI);
        p.closePath();
        open = false;
      }
      i0 = j;
    }
  }

  function pathFor(c) {
    var p = new Path2D();
    for (var i = 0; i < c.rings.length; i++) addRing(p, c.rings[i]);
    return p;
  }

  /* ── Graticule — meridians and parallels every 10°, clipped the same way ── */
  function strokeGraticule() {
    var p = new Path2D(), lon, lat, first;
    for (lon = -180; lon < 180; lon += 10) {
      first = true;
      for (lat = -80; lat <= 80; lat += 2.5) {
        rotate(lon, lat);
        if (_v < 0) { first = true; continue; }
        if (first) { p.moveTo(sx(_y), sy(_z)); first = false; } else p.lineTo(sx(_y), sy(_z));
      }
    }
    for (lat = -80; lat <= 80; lat += 10) {
      first = true;
      for (lon = -180; lon <= 180; lon += 2.5) {
        rotate(lon, lat);
        if (_v < 0) { first = true; continue; }
        if (first) { p.moveTo(sx(_y), sy(_z)); first = false; } else p.lineTo(sx(_y), sy(_z));
      }
    }
    ctx.stroke(p);
  }

  /* ── Render ── */
  function resize() {
    SIZE = root.clientWidth;
    if (!interactive()) restRotation();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * DPR; canvas.height = SIZE * DPR;
    canvas.style.width = canvas.style.height = SIZE + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = SIZE / 2 - 1; C = SIZE / 2;
    draw();
  }

  function draw() {
    if (!SIZE) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.beginPath(); ctx.arc(C, C, R, 0, TAU);
    ctx.fillStyle = token('--globe-sphere', '#FCFCFC'); ctx.fill();

    ctx.strokeStyle = token('--globe-grid', '#C1C1C7');
    ctx.setLineDash([2, 3]); ctx.lineWidth = 0.5;
    strokeGraticule();
    ctx.setLineDash([]);

    var cCurrent = token('--globe-land-current', '#747CFB');
    var cOpen    = token('--globe-land', '#B6B9FB');
    var cHover   = token('--globe-land-hover', '#959AFB');
    var cMuted   = token('--globe-land-muted', '#D2D4FB');
    var stroke   = token('--globe-stroke', '#fff');

    ctx.lineWidth = 0.6;
    for (var i = 0; i < countries.length; i++) {
      var c = countries[i];
      c.path = pathFor(c);
      ctx.fillStyle = c.name === HOME ? cCurrent
                    : !available[c.name] ? cMuted
                    : c === hovered ? cHover
                    : cOpen;
      ctx.fill(c.path);
      ctx.strokeStyle = stroke; ctx.stroke(c.path);
    }

    placeFlag();
  }

  function placeFlag() {
    if (!flag) return;
    var centre = CENTRES[HOME];
    if (!centre) { flag.style.display = 'none'; return; }
    rotate(centre[0], centre[1]);
    if (_v < 0) { flag.style.display = 'none'; return; }
    flag.style.display = '';
    flag.style.left = sx(_y) + 'px';
    flag.style.top  = sy(_z) + 'px';
  }

  // The browser tests the point against the path it already built for drawing.
  // isPointInPath takes canvas-space pixels and ignores the current transform,
  // so the CSS-pixel cursor position has to be scaled by the pixel ratio.
  function hitAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left, y = clientY - rect.top;
    if (Math.hypot(x - C, y - C) > R) return null;
    for (var i = 0; i < countries.length; i++) {
      var c = countries[i];
      if (!c.path || !available[c.name]) continue;
      if (ctx.isPointInPath(c.path, x * DPR, y * DPR)) return c;
    }
    return null;
  }

  /* ── Interaction ── */
  var dragging = false, moved = false, last = null, spin = [0, 0], raf = null;

  function restRotation() {
    cancelAnimationFrame(raf);
    dragging = false; spin = [0, 0];
    if (hovered) { hovered = null; hideTip(); }
    root.classList.remove('is-linked', 'is-dragging');
    var centre = CENTRES[HOME] || [0, 20];
    setRotation(-centre[0], -centre[1] + 2);
  }

  function rotateBy(dx, dy) { setRotation(rot[0] + dx, rot[1] - dy); draw(); }

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
    if (hit) showTip(available[hit.name].name, e.clientX, e.clientY);
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
    if (moved || !ready || !interactive()) return;
    var hit = hitAt(e.clientX, e.clientY);
    var url = hit && pageFor(hit.name);
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
    countries = build(res[0]);
    available = res[1];
    restRotation();
    ready = true;
    root.classList.add('is-ready');
    resize();
  }).catch(function () { /* globe stays hidden; the page still reads fine */ });

  window.addEventListener('resize', resize);
})();
