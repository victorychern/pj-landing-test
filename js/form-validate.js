/* ── Contact form validation ──
   Marks invalid fields with .sel-wrap--error (error colours + visible .sel-hint).
   Text fields are validated from their input; the custom dropdown is considered
   empty while fields.js still keeps .sel-wrap--empty on it.
*/
(function () {
  var form = document.getElementById('cf-form');
  if (!form) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(wrap, on) {
    wrap.classList.toggle('sel-wrap--error', on);
    var hint = wrap.querySelector('.sel-hint');
    if (hint) hint.textContent = on ? (hint.dataset.hint || '') : '';
  }

  // Returns true when the field holds an acceptable value
  function isValid(wrap) {
    var select = wrap.matches('[data-sel][data-required]');
    if (select) return !wrap.classList.contains('sel-wrap--empty');

    var field = wrap.querySelector('.sel-field[required]');
    if (!field) return true;
    var value = field.value.trim();
    if (!value) return false;
    if (field.type === 'email') return EMAIL_RE.test(value);
    return true;
  }

  function fieldsToCheck() {
    return form.querySelectorAll('.sel-wrap--text, [data-sel][data-required]');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstInvalid = null;

    fieldsToCheck().forEach(function (wrap) {
      var ok = isValid(wrap);
      setError(wrap, !ok);
      if (!ok && !firstInvalid) firstInvalid = wrap;
    });

    if (firstInvalid) {
      var field = firstInvalid.querySelector('.sel-field');
      if (field) field.focus();
      else firstInvalid.querySelector('.sel-input').click();
      return;
    }

    // Valid — hand off to the backend here once the endpoint exists.
    form.reset();
    form.querySelectorAll('[data-sel] .sel-value').forEach(function (v) { v.textContent = ''; });
    form.querySelectorAll('[data-sel]').forEach(function (w) { w.classList.add('sel-wrap--empty'); });
  });

  // Clear the error as soon as the field is corrected
  form.addEventListener('input', function (e) {
    var wrap = e.target.closest('.sel-wrap--error');
    if (wrap && isValid(wrap)) setError(wrap, false);
  });

  form.addEventListener('click', function (e) {
    if (!e.target.closest('.sel-drop-item')) return;
    var wrap = e.target.closest('.sel-wrap--error');
    // fields.js clears .sel-wrap--empty on the same click, so re-check afterwards
    if (wrap) setTimeout(function () { if (isValid(wrap)) setError(wrap, false); }, 0);
  });
})();
