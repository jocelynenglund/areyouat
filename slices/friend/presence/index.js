(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(function () {});
  }

  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
  if (!place || place === 'about') return;

  const params = new URLSearchParams(window.location.search);
  const storageKey = `areyouat:${place}`;
  const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');

  window.PRESENCE = window.PRESENCE || {};
  PRESENCE.place = place;
  PRESENCE.passphrase = params.get('magicword') || (stored && stored.passphrase) || null;
  PRESENCE.myNickname = (stored && stored.checkedIn !== false) ? stored.nickname : null;
  PRESENCE.storedNickname = stored ? stored.nickname : null;
  PRESENCE.storageKey = storageKey;

  if (PRESENCE.passphrase) {
    PRESENCE.renderLoading();
    PRESENCE.query();
  } else {
    PRESENCE.renderPassphrase();
  }
})();
