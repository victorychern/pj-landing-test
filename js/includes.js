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
  if (hero) hero.classList.add('hero-animate');
})();
