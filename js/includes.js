history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const _favicon = document.createElement('link');
_favicon.rel = 'icon'; _favicon.type = 'image/png'; _favicon.href = '/favicon.png';
document.head.appendChild(_favicon);

(async () => {
  const els = document.querySelectorAll('[data-include]');
  await Promise.all(Array.from(els).map(async el => {
    const res = await fetch(el.dataset.include);
    const html = await res.text();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    el.replaceWith(...tmp.childNodes);
  }));

  const hero = Array.from(document.body.children).find(el => el.tagName !== 'HEADER');
  if (hero) {
    hero.classList.add('hero-animate');
    setTimeout(() => {
      hero.classList.remove('hero-animate');
      hero.style.overflow = 'visible';
    }, 700);
  }

  // Language dropdown
  document.querySelectorAll('.lang-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.site-header-lang, .ft-lang-btn');
    const drop = wrap.querySelector('.lang-drop');
    const list = wrap.querySelector('.lang-drop-list');
    const scrollbar = wrap.querySelector('.lang-scrollbar');
    const thumb = wrap.querySelector('.lang-scrollbar-thumb');

    // Custom scrollbar logic
    function updateScrollbar() {
      if (!list || !thumb || !scrollbar) return;
      const ratio = list.clientHeight / list.scrollHeight;
      if (ratio >= 1) { scrollbar.classList.remove('is-visible'); return; }
      scrollbar.classList.add('is-visible');
      const trackH = list.clientHeight - 20;
      thumb.style.height = Math.max(20, ratio * trackH) + 'px';
      thumb.style.top = (list.scrollTop / list.scrollHeight) * trackH + 10 + 'px';
    }
    if (list) list.addEventListener('scroll', updateScrollbar);

    // Scrollbar drag
    if (scrollbar && thumb && list) {
      let dragging = false, startY = 0, startScroll = 0;
      scrollbar.addEventListener('mousedown', e => {
        dragging = true; startY = e.clientY; startScroll = list.scrollTop;
        scrollbar.classList.add('is-dragging');
        e.preventDefault();
      });
      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const trackH = list.clientHeight - 20;
        list.scrollTop = startScroll + (e.clientY - startY) / trackH * list.scrollHeight;
      });
      document.addEventListener('mouseup', () => {
        dragging = false; scrollbar.classList.remove('is-dragging');
      });
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = drop.classList.toggle('is-open');
      btn.classList.toggle('is-open', open);
      if (open) setTimeout(updateScrollbar, 0);
    });

    wrap.querySelectorAll('.lang-item').forEach(item => {
      item.addEventListener('click', () => {
        // Remove previous selection
        wrap.querySelectorAll('.lang-item').forEach(i => {
          i.classList.remove('lang-item--on');
          const c = i.querySelector('.sel-drop-check');
          if (c) c.remove();
        });
        // Add check to selected
        const chk = document.createElement('img');
        chk.className = 'sel-drop-check'; chk.src = 'assets/check-m.svg'; chk.alt = '';
        item.appendChild(chk);
        item.classList.add('lang-item--on');
        // Move selected to top
        if (list) list.prepend(item);
        // Update button flag
        const flag = item.querySelector('img:first-child');
        const langFlag = wrap.querySelector('.site-header-lang-flag img');
        if (flag && langFlag) langFlag.src = flag.src;
        const langName = wrap.querySelector('.ft-lang-name');
        if (langName) langName.textContent = item.querySelector('.lang-item-name').textContent;
        drop.classList.remove('is-open');
        btn.classList.remove('is-open');
      });
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.lang-drop.is-open').forEach(drop => {
      drop.classList.remove('is-open');
      const btn = drop.closest('.lang-wrap').querySelector('.site-header-lang, .ft-lang-btn');
      if (btn) btn.classList.remove('is-open');
    });
  });

  // Hide header on scroll down, show on scroll up; hide when footer is visible
  const _headers = document.querySelectorAll('.site-header, .site-header-mobile');
  const _footer = document.getElementById('footer');
  let _lastY = window.scrollY;

  // Overscroll canvas color: CSS paints a viewport-fixed light/dark gradient (common.css).
  // Fallback for browsers that only use the root background-color for the rubber-band
  // canvas: flip it the moment the footer enters view — hundreds of px before the page
  // edge is reachable, so even the fastest scroll can't catch a wrong color.
  if (_footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      document.documentElement.style.backgroundColor =
        entries[0].isIntersecting ? 'var(--color-neutral-5)' : '';
    }).observe(_footer);
  }

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const delta = y - _lastY;
    if (Math.abs(delta) < 4) { _lastY = y; return; }

    const footerVisible = _footer && _footer.getBoundingClientRect().top < window.innerHeight;

    if (footerVisible) {
      _headers.forEach(h => h.classList.toggle('is-hidden', delta > 0));
    } else {
      _headers.forEach(h => h.classList.remove('is-hidden'));
    }

    _lastY = y;
  }, { passive: true });
})();
