window.PRESENCE = window.PRESENCE || {};

(function () {
  const MAX_RIPPLES = 6;
  const DEDUPE_MS = 1000;
  const POLL_MS = 20000;
  const RIPPLE_LIFETIME_MS = 5200;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let seen = null;
  const lastRippleAt = new Map();

  function keyOf(entry) {
    return (entry && entry.nickname || '').toLowerCase();
  }

  function spawnRipple() {
    if (reducedMotion) return;
    const wrap = document.querySelector('.scandi-presence-chrome .mark-wrap');
    if (!wrap) return;

    const existing = wrap.querySelectorAll('.ripple');
    if (existing.length >= MAX_RIPPLES) existing[0].remove();

    const el = document.createElement('span');
    el.className = 'ripple';
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, RIPPLE_LIFETIME_MS);
  }

  PRESENCE.ripple = {
    spawn: spawnRipple,

    observe: function (entries) {
      const list = Array.isArray(entries) ? entries : [];
      const current = new Set(list.map(keyOf).filter(Boolean));

      if (seen === null) {
        seen = current;
        return;
      }

      const now = Date.now();
      current.forEach(function (key) {
        if (seen.has(key)) return;
        const last = lastRippleAt.get(key) || 0;
        if (now - last < DEDUPE_MS) return;
        lastRippleAt.set(key, now);
        spawnRipple();
      });

      seen = current;
    },

    reset: function () {
      seen = null;
      lastRippleAt.clear();
    }
  };

  let pollTimer = null;
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (document.visibilityState === 'visible' && PRESENCE.passphrase && PRESENCE.query) {
        PRESENCE.query({ silent: true });
      }
    }, POLL_MS);
  }
  function stopPolling() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      startPolling();
      if (PRESENCE.passphrase && PRESENCE.query) PRESENCE.query({ silent: true });
    } else {
      stopPolling();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPolling);
  } else {
    startPolling();
  }
})();
