// Realtime updates via SignalR. Connects to /hubs/areyouat, joins the
// {place}-{passphraseHash} group, and on every "refresh" message triggers
// a silent PRESENCE.query() so the UI catches up instantly.
//
// On reconnect (automatic, exponential backoff per signalR defaults) we
// re-call JoinPlace and force a refetch so any messages missed while the
// connection was down are recovered. The ripple-slice safety-net poll
// stays in place at a longer interval to cover the worst case where the
// reconnect itself fails for a long stretch.

window.PRESENCE = window.PRESENCE || {};

(function () {
  if (!window.signalR) {
    console.warn('signalR global missing — realtime disabled');
    return;
  }

  const HUB_BASE = (window.AREYOUAT && window.AREYOUAT.apiBase)
    || 'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net';

  let connection = null;
  let joinedKey = null;

  function placeKey() {
    if (!PRESENCE.place || !PRESENCE.passphrase) return null;
    return PRESENCE.place + '\x00' + PRESENCE.passphrase;
  }

  async function joinIfReady() {
    if (!connection) return;
    if (connection.state !== 'Connected') return; // start() will call us again on success
    const want = placeKey();
    if (!want) return;
    if (want === joinedKey) return;
    try {
      await connection.invoke('JoinPlace', PRESENCE.place, PRESENCE.passphrase);
      joinedKey = want;
    } catch (e) {
      console.warn('JoinPlace failed', e);
    }
  }

  async function start() {
    if (connection) return;
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_BASE + '/hubs/areyouat')
      .withAutomaticReconnect()
      .build();

    connection.on('refresh', function (payload) {
      if (!PRESENCE.passphrase) return;
      // Partial updates per event type when possible (no chrome flicker, open
      // sheets / status edits / scroll position survive). Falls back to full
      // query inside applyPartialUpdate for unknown types.
      if (PRESENCE.applyPartialUpdate) PRESENCE.applyPartialUpdate(payload);
      else if (PRESENCE.query) PRESENCE.query({ silent: true });
    });

    connection.onreconnected(async function () {
      // Force re-join after a reconnect (group membership is per-connection).
      joinedKey = null;
      await joinIfReady();
      if (PRESENCE.passphrase && PRESENCE.query) PRESENCE.query({ silent: true });
    });

    try {
      await connection.start();
      await joinIfReady();
    } catch (e) {
      console.warn('SignalR start failed', e);
    }
  }

  PRESENCE.realtime = {
    start: start,
    // Called when PRESENCE.passphrase changes (URL load, localStorage, manual
    // entry). Safe to call before the connection finishes connecting — start()
    // will trigger the join itself once Connected. If we're already connected,
    // we join right away.
    rejoinIfChanged: function () {
      return joinIfReady();
    },
  };

  // Browsers throttle/suspend websockets on hidden tabs. When the tab comes
  // back to foreground, give the connection a nudge: re-join the group if
  // it dropped, and refetch once so we catch up on anything missed while
  // backgrounded. The ripple-slice already triggers a refetch here too —
  // this hook focuses on the connection side.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (!connection) return;
    if (connection.state === 'Connected') {
      // Force a re-join in case the server lost our group membership.
      joinedKey = null;
      joinIfReady();
    }
    // start() / onreconnected handle the not-Connected cases automatically.
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
