window.DEBUG = window.DEBUG || {};

(function () {
  function isEnabled() {
    const params = new URLSearchParams(location.search);
    return params.has('debug');
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function fmtPayload(payload) {
    if (payload == null) return '';
    try {
      return JSON.stringify(payload);
    } catch (_) {
      return String(payload);
    }
  }

  function ensurePill() {
    let pill = document.getElementById('debug-pill');
    if (pill) return pill;
    pill = document.createElement('button');
    pill.id = 'debug-pill';
    pill.className = 'debug-pill';
    pill.type = 'button';
    pill.setAttribute('aria-label', 'event log');
    pill.innerHTML = '<span class="debug-pill-dot"></span><span class="debug-pill-label">log</span>';
    document.body.appendChild(pill);
    pill.addEventListener('click', DEBUG.openPanel);
    return pill;
  }

  function closePanel() {
    const panel = document.getElementById('debug-panel');
    if (panel) panel.remove();
  }

  DEBUG.openPanel = function () {
    closePanel();
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.className = 'debug-panel';
    panel.innerHTML = `
      <div class="debug-panel-head">
        <div class="debug-panel-title">event log</div>
        <button class="debug-panel-close" type="button" aria-label="close">×</button>
      </div>
      <div class="debug-panel-meta" id="debug-panel-meta">loading…</div>
      <div class="debug-panel-list" id="debug-panel-list"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('.debug-panel-close').addEventListener('click', closePanel);

    const place = (window.PRESENCE && PRESENCE.place) || null;
    const passphrase = (window.PRESENCE && PRESENCE.passphrase) || null;
    const meta = panel.querySelector('#debug-panel-meta');
    const list = panel.querySelector('#debug-panel-list');

    if (!place || !passphrase) {
      meta.textContent = 'no place or magicword yet';
      return;
    }

    meta.textContent = `presence-${place}-<hash> · loading…`;

    AREYOUAT.getEvents(place, passphrase)
      .then(function (data) {
        meta.textContent = `${data.streamId} · ${data.count} events`;
        const events = (data.events || []).slice().reverse();
        if (events.length === 0) {
          list.innerHTML = '<div class="debug-empty">no events</div>';
          return;
        }
        list.innerHTML = events.map(function (e) {
          return `
            <div class="debug-event">
              <div class="debug-event-head">
                <span class="debug-event-type">${e.type}</span>
                <span class="debug-event-time">${fmtTime(e.timestamp)}</span>
              </div>
              <pre class="debug-event-payload">${fmtPayload(e.payload)}</pre>
            </div>
          `;
        }).join('');
      })
      .catch(function (err) {
        meta.textContent = 'failed to load events';
        list.innerHTML = `<div class="debug-empty">${err && err.message ? err.message : 'error'}</div>`;
      });
  };

  DEBUG.mount = function () {
    if (!isEnabled()) return;
    ensurePill();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', DEBUG.mount);
  } else {
    DEBUG.mount();
  }
})();
