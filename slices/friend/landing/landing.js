(function () {
  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
  if (place && place !== 'about') return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="presence-card">
      <div class="tagline" style="margin-top:0">${I18N.t('landing_heading')}</div>
      <input class="presence-input" id="place-input" type="text" placeholder="${I18N.t('landing_place_placeholder')}" autocomplete="off" />
      <input class="presence-input" id="pp-input" type="text" placeholder="${I18N.t('landing_pp_placeholder')}" autocomplete="off" />
      <button class="btn btn-primary" id="go-btn">${I18N.t('landing_submit')}</button>
      <div class="about-text">
        ${I18N.t('landing_about')}<br><br>
        ${I18N.t('landing_about2')}
      </div>
    </div>
  `;

  const placeInput = document.getElementById('place-input');
  const ppInput = document.getElementById('pp-input');
  const goBtn = document.getElementById('go-btn');

  function submit() {
    const p = placeInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const pp = ppInput.value.trim();
    if (!p) { placeInput.focus(); return; }
    if (!pp) { ppInput.focus(); return; }
    window.location.href = `/${p}?magicword=${encodeURIComponent(pp)}`;
  }

  goBtn.addEventListener('click', submit);
  [placeInput, ppInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  });
  placeInput.focus();
})();
