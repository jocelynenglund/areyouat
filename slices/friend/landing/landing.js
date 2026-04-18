(function () {
  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
  if (place && place !== 'about') return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="scandi-screen">
      <div class="scandi-chrome">
        <a class="brand-mark" href="/about" aria-label="about">
          <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
            <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
            <circle cx="16" cy="16" r="4" fill="currentColor"/>
          </svg>
        </a>
        <div class="lang-switcher"></div>
      </div>

      <div class="scandi-hero">
        <div class="display-heading">
          ${I18N.t('landing_heading_a')}<br/>
          <span class="italic">${I18N.t('landing_heading_b')}</span>
        </div>
        <div class="scandi-sub">${I18N.t('landing_about')}</div>
      </div>

      <div class="scandi-form">
        <div class="scandi-field">
          <div class="section-label">${I18N.t('landing_place_label')}</div>
          <div class="scandi-input-wrap">
            <span class="slash">/</span>
            <input class="scandi-input scandi-input--mono" id="place-input" type="text" placeholder="${I18N.t('landing_place_placeholder')}" autocomplete="off" />
          </div>
        </div>
        <div class="scandi-field">
          <div class="section-label">${I18N.t('landing_pp_label')}</div>
          <div class="scandi-input-wrap">
            <input class="scandi-input scandi-input--serif" id="pp-input" type="text" placeholder="${I18N.t('landing_pp_placeholder')}" autocomplete="off" />
          </div>
        </div>
      </div>

      <button class="scandi-btn" id="go-btn">
        <span>${I18N.t('landing_submit')}</span><span>→</span>
      </button>

      <div class="scandi-footer-note">${I18N.t('landing_about2')}</div>
    </div>
  `;

  I18N.mountSwitcher();

  const placeInput = document.getElementById('place-input');
  const ppInput = document.getElementById('pp-input');
  const goBtn = document.getElementById('go-btn');

  function submit() {
    const p = placeInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const pp = ppInput.value.trim();
    if (!pp) { ppInput.focus(); return; }
    if (!p) { placeInput.focus(); return; }
    window.location.href = `/${p}?magicword=${encodeURIComponent(pp)}`;
  }

  goBtn.addEventListener('click', submit);
  [placeInput, ppInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  });
  placeInput.focus();
})();
