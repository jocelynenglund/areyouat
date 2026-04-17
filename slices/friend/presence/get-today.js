window.PRESENCE = window.PRESENCE || {};

PRESENCE.renderLoading = function () {
  document.getElementById('app').innerHTML = `
    <div class="presence-card">
      <div class="spinner"></div>
      <div class="loading-text">${I18N.t('loading')}</div>
    </div>
  `;
};

PRESENCE.renderEmpty = function () {
  const app = document.getElementById('app');
  const locale = I18N.t('date_locale');
  const d = new Date();
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  PRESENCE.setLogoDot('none');

  app.innerHTML = `
    <div class="presence-card">
      <div class="state-heading">${I18N.t('empty_heading')}</div>
      <div class="state-sub">${I18N.t('empty_time_sub', { time: timeStr, date: dateStr })}</div>
      <button class="btn btn-primary" id="announce-btn">${I18N.t('but_im_here')}</button>
      <button class="check-again-btn" id="check-btn">${I18N.t('check_again')}</button>
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
  const locale = I18N.t('date_locale');

  PRESENCE.setLogoDot(count > 0 ? 'active' : 'none');

  const banner = count === 0 ? I18N.t('banner_zero')
    : count === 1 ? I18N.t('banner_one')
    : I18N.t('banner_many', { n: count });

  const isAlreadyHere = PRESENCE.myNickname && entries.some(function (e) {
    return e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
  });
  const joinLabel = isAlreadyHere ? null
    : count === 0 ? I18N.t('join_zero')
    : count === 1 ? I18N.t('join_one')
    : I18N.t('join_many');

  function fmt(iso) {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  const listHtml = entries.map(function (e) {
    const isMe = PRESENCE.myNickname && e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    return `
      <div class="presence-item${isMe ? ' is-you' : ''}">
        <span class="presence-name">${isMe ? e.nickname + ' ' + I18N.t('you_suffix') : e.nickname}</span>
        <span class="presence-time">${isMe ? I18N.t('time_now') : fmt(e.announcedAt)}</span>
        ${isMe ? `<button class="leave-btn" id="leave-btn">${I18N.t('leave')}</button><button class="bell-btn" id="bell-btn">🔕</button>` : ''}
      </div>
    `;
  }).join('');

  const historyHtml = history.length ? `
    <div class="history-section">
      <div class="history-label">${I18N.t('history_label')}</div>
      ${history.map(function (e) {
        return `<div class="history-item"><span>${e.nickname}</span><span class="presence-time">${fmt(e.announcedAt)}</span></div>`;
      }).join('')}
    </div>
  ` : '';

  app.innerHTML = `
    <div class="presence-card">
      ${count > 0 ? `<div class="there-banner">${banner}</div>` : `<div class="state-heading">${banner}</div>`}
      ${isAlreadyHere ? `<div class="state-sub">${I18N.t('others_can_see')}</div>` : ''}
      ${count > 0 ? `<div class="presence-list">${listHtml}</div>` : ''}
      ${historyHtml}
      ${joinLabel ? `<button class="btn btn-primary" id="join-btn" style="margin-top:4px">${joinLabel}</button>` : ''}
      <button class="check-again-btn" id="check-btn">${I18N.t('check_again')}</button>
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
      PRESENCE.renderPassphrase(I18N.t('error_wrong_pass'));
    });
};

PRESENCE.setLogoDot = function (state) {
  const dot = document.getElementById('logo-dot');
  if (!dot) return;
  dot.className = 'logo-dot logo-dot--' + state;
};
