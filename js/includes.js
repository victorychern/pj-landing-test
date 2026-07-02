(async () => {
  const els = document.querySelectorAll('[data-include]');
  await Promise.all(Array.from(els).map(async el => {
    const res = await fetch(el.dataset.include);
    const html = await res.text();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    el.replaceWith(...tmp.childNodes);
  }));
})();
