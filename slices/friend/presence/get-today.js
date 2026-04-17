window.PRESENCE = window.PRESENCE || {};

PRESENCE.renderLoading = function () {
  document.getElementById('app').innerHTML = `
    <div class="presence-card">
      <div class="spinner"></div>
      <div class="loading-text">kollar…</div>
    </div>
  `;
};

PRESENCE.renderEmpty = function () {
  const app = document.getElementById('app');
  const d = new Date();
  const timeStr = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });

  PRESENCE.setLogoDot('none');

  app.innerHTML = `
    <div class="presence-card">
      <div class="state-heading">ingen e här</div>
      <div class="state-sub">kl ${timeStr} · ${dateStr}</div>
      <button class="btn btn-primary" id="announce-btn">men jag är!</button>
      <button class="check-again-btn" id="check-btn">kolla igen</button>
    </div>
  `;

  document.getElementById('announce-btn').addEventListener('click', PRESENCE.renderNamePrompt);
  document.getElementById('check-btn').addEventListener('click', function () {
    PRESENCE.renderLoading();
    PRESENCE.query();
  });
};

PRESENCE.renderPopulated = function (entries, history) {
  history = history || [];
  const app = document.getElementById('app');
  const count = entries.length;

  PRESENCE.setLogoDot(count > 0 ? 'active' : 'none');

  const banner = count === 0 ? 'ingen e här nu'
    : count === 1 ? 'någon e här!'
    : `${count} e här`;

  const isAlreadyHere = PRESENCE.myNickname && entries.some(function (e) {
    return e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
  });
  const joinLabel = isAlreadyHere ? null
    : count === 0 ? 'men jag är!'
    : count === 1 ? 'jag är också här!'
    : 'jag med!';

  function fmt(iso) {
    return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  }

  const listHtml = entries.map(function (e) {
    const isMe = PRESENCE.myNickname && e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    return `
      <div class="presence-item${isMe ? ' is-you' : ''}">
        <span class="presence-name">${isMe ? e.nickname + ' (du)' : e.nickname}</span>
        <span class="presence-time">${isMe ? 'nu' : fmt(e.announcedAt)}</span>
        ${isMe ? '<button class="leave-btn" id="leave-btn">lämna</button><button class="bell-btn" id="bell-btn">🔕</button>' : ''}
      </div>
    `;
  }).join('');

  const historyHtml = history.length ? `
    <div class="history-section">
      <div class="history-label">var här tidigare</div>
      ${history.map(function (e) {
        return `<div class="history-item"><span>${e.nickname}</span><span class="presence-time">${fmt(e.announcedAt)}</span></div>`;
      }).join('')}
    </div>
  ` : '';

  app.innerHTML = `
    <div class="presence-card">
      ${count > 0 ? `<div class="there-banner">${banner}</div>` : `<div class="state-heading">${banner}</div>`}
      ${isAlreadyHere ? '<div class="state-sub">andra i gruppen kan se dig nu</div>' : ''}
      ${count > 0 ? `<div class="presence-list">${listHtml}</div>` : ''}
      ${historyHtml}
      ${joinLabel ? `<button class="btn btn-primary" id="join-btn" style="margin-top:4px">${joinLabel}</button>` : ''}
      <button class="check-again-btn" id="check-btn">kolla igen</button>
    </div>
  `;

  if (joinLabel) document.getElementById('join-btn').addEventListener('click', PRESENCE.renderNamePrompt);
  if (document.getElementById('leave-btn')) document.getElementById('leave-btn').addEventListener('click', PRESENCE.leave);
  if (document.getElementById('bell-btn')) {
    PRESENCE.initBell(document.getElementById('bell-btn'));
  }
  document.getElementById('check-btn').addEventListener('click', function () {
    PRESENCE.renderLoading();
    PRESENCE.query();
  });
};

PRESENCE.query = function () {
  window.AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase)
    .then(function (data) {
      const entries = data.presences || data.presence || data || [];
      const history = data.history || [];
      if (entries.length === 0 && history.length === 0) {
        PRESENCE.renderEmpty();
      } else {
        PRESENCE.renderPopulated(entries, history);
      }
    })
    .catch(function () {
      PRESENCE.passphrase = null;
      PRESENCE.myNickname = null;
      PRESENCE.renderPassphrase('fel lösenord eller nätverksfel — försök igen');
    });
};

PRESENCE.setLogoDot = function (state) {
  const dot = document.getElementById('logo-dot');
  if (!dot) return;
  dot.className = 'logo-dot logo-dot--' + state;
};
