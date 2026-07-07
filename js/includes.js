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
    setTimeout(() => { hero.style.overflow = 'visible'; }, 700);
  }

  // Language dropdown
  document.querySelectorAll('.lang-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.site-header-lang');
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
        drop.classList.remove('is-open');
        btn.classList.remove('is-open');
      });
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.lang-drop.is-open').forEach(drop => {
      drop.classList.remove('is-open');
      drop.closest('.lang-wrap').querySelector('.site-header-lang').classList.remove('is-open');
    });
  });
})();
