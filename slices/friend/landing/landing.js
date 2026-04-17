(function () {
  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
  if (place && place !== 'about') return;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="presence-card">
      <div class="tagline" style="margin-top:0">vart ska ni?</div>
      <input class="presence-input" id="place-input" type="text" placeholder="bron, gymmet, kontoret…" autocomplete="off" />
      <input class="presence-input" id="pp-input" type="password" placeholder="vad brukar vi säga?" autocomplete="off" />
      <button class="btn btn-primary" id="go-btn">fortsätt →</button>
      <div class="about-text">
        hitta på ett platsnamn och ett magicword som bara ni känner till —
        dela länken med vänner så ser ni vem som är där just nu.<br><br>
        ingen app. inget konto. allt nollställs vid midnatt.
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
    window.location.href = `/${p}?pp=${encodeURIComponent(pp)}`;
  }

  goBtn.addEventListener('click', submit);
  [placeInput, ppInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  });
  placeInput.focus();
})();
