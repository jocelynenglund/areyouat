(function () {
  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
  if (!place || place === 'about') return;

  const params = new URLSearchParams(window.location.search);
  const storageKey = `areyouat:${place}`;
  const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');

  window.PRESENCE = window.PRESENCE || {};
  PRESENCE.place = place;
  PRESENCE.passphrase = params.get('pp') || (stored && stored.passphrase) || null;
  PRESENCE.myNickname = stored ? stored.nickname : null;
  PRESENCE.storageKey = storageKey;

  // Inject place into the header
  const header = document.getElementById('site-title');
  if (header) {
    const placeSpan = document.createElement('span');
    placeSpan.className = 'header-place';
    placeSpan.textContent = `/${place}`;
    header.appendChild(placeSpan);
  }

  if (PRESENCE.passphrase) {
    PRESENCE.renderLoading();
    PRESENCE.query();
  } else {
    PRESENCE.renderPassphrase();
  }
})();
