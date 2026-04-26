(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(function () {});
  }

  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
  if (!place || place === 'about' || place === 'changelog') return;

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
    // Realtime started its connection at DOMContentLoaded with no passphrase
    // available yet. Now that we have one (from ?magicword= or localStorage),
    // join the right group. Identity.submitPassphrase does the same on manual
    // entry — this covers the auto-login paths.
    if (PRESENCE.realtime && PRESENCE.realtime.rejoinIfChanged) PRESENCE.realtime.rejoinIfChanged();
    const cached = PRESENCE.readTodayCache && PRESENCE.readTodayCache();
    if (cached) {
      const entries = cached.entries || [];
      const history = cached.history || [];
      const etas = cached.etas || [];
      if (PRESENCE.ripple && PRESENCE.ripple.observe) PRESENCE.ripple.observe(entries);
      if (entries.length === 0 && history.length === 0 && etas.length === 0) {
        PRESENCE.renderEmpty();
      } else {
        PRESENCE.renderPopulated(entries, history, etas);
      }
    } else {
      PRESENCE.renderLoading();
    }
    PRESENCE.query({ silent: !!cached });
  } else {
    PRESENCE.renderPassphrase();
  }
})();
