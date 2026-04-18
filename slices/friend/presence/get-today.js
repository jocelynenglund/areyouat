window.PRESENCE = window.PRESENCE || {};

const HISTORY_CAP = 3;
let historyExpanded = false;

function topChrome() {
  return `
    <div class="scandi-presence-chrome">
      <div class="live-chrome">
        <a class="live-logo" href="/about" aria-label="about">
          <div class="mark-wrap"><span class="mark-core"></span></div>
          <div class="live-title">${I18N.t('app_title_short')}</div>
        </a>
        <div class="live-pass">/${PRESENCE.place}</div>
      </div>
      <div class="lang-switcher"></div>
    </div>
  `;
}

PRESENCE.renderLoading = function () {
  document.getElementById('app').innerHTML = `
    <div class="scandi-presence">
      ${topChrome()}
      <div class="scandi-count">
        <div class="scandi-count-sub">${I18N.t('loading')}</div>
      </div>
    </div>
  `;
  I18N.mountSwitcher();
};

PRESENCE.renderEmpty = function () {
  const app = document.getElementById('app');
  const locale = I18N.t('date_locale');
  const d = new Date();
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  app.innerHTML = `
    <div class="scandi-presence">
      ${topChrome()}
      <div class="scandi-empty">
        <div class="scandi-empty-heading">${I18N.t('empty_heading')}</div>
        <div class="scandi-empty-sub">${I18N.t('empty_time_sub', { time: timeStr, date: dateStr })}</div>
      </div>

      <div class="scandi-actions" style="padding: 24px 28px 8px;">
        <button class="scandi-btn" id="announce-btn" style="max-width:280px;">
          <span>${I18N.t('but_im_here')}</span><span>→</span>
        </button>
      </div>
      <div class="scandi-actions">
        <button class="scandi-btn--ghost-soft" id="check-btn">${I18N.t('check_again')}</button>
      </div>
    </div>
  `;

  I18N.mountSwitcher();

  document.getElementById('announce-btn').addEventListener('click', PRESENCE.renderNamePrompt);
  document.getElementById('check-btn').addEventListener('click', function () {
    PRESENCE.renderLoading();
    PRESENCE.query();
  });
};

PRESENCE.renderPopulated = function (entries, history, etas) {
  history = history || [];
  etas = etas || [];
  const app = document.getElementById('app');
  const count = entries.length;
  const locale = I18N.t('date_locale');

  const isAlreadyHere = PRESENCE.myNickname && entries.some(function (e) {
    return e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
  });
  const selfHasEta = PRESENCE.selfHasEta ? PRESENCE.selfHasEta(etas) : false;
  const showEtaChooser = !isAlreadyHere && !selfHasEta;

  const others = isAlreadyHere ? count - 1 : count;
  let subLabel;
  if (count === 0) {
    subLabel = '';
  } else if (isAlreadyHere && count === 1) {
    subLabel = I18N.t('sub_alone');
  } else if (isAlreadyHere && others === 1) {
    subLabel = I18N.t('sub_you_plus_one');
  } else if (isAlreadyHere) {
    subLabel = I18N.t('sub_you_plus_many', { n: others });
  } else {
    subLabel = count === 1 ? I18N.t('banner_one') : '';
  }

  const joinLabel = isAlreadyHere ? null
    : count === 0 ? I18N.t('join_zero')
    : count === 1 ? I18N.t('join_one')
    : I18N.t('join_many');

  function fmt(iso) {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  const sorted = [].concat(entries).sort(function (a, b) {
    const aSelf = PRESENCE.myNickname && a.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    const bSelf = PRESENCE.myNickname && b.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    if (aSelf && !bSelf) return -1;
    if (bSelf && !aSelf) return 1;
    return new Date(b.announcedAt) - new Date(a.announcedAt);
  });

  const pillsHtml = sorted.map(function (e) {
    const isMe = PRESENCE.myNickname && e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    const statusHtml = PRESENCE.renderStatus ? PRESENCE.renderStatus(e, isMe) : '';
    if (isMe) {
      return `
        <div class="pill pill--self">
          <div class="pill-name">${e.nickname}<span class="pill-you">${I18N.t('you_label')}</span></div>
          <div class="pill-time">${I18N.t('time_now')}</div>
          <button class="pill-leave-btn" id="leave-btn">${I18N.t('leave')}</button>
          <div class="bell-wrap"><button class="bell-btn" id="bell-btn" aria-label="notifications" type="button">${bellSvg(false)}</button></div>
          ${statusHtml}
        </div>
      `;
    }
    return `
      <div class="pill">
        <div class="pill-name">${e.nickname}</div>
        <div class="pill-time">${fmt(e.announcedAt)}</div>
        ${statusHtml}
      </div>
    `;
  }).join('');

  const hiddenCount = Math.max(0, history.length - HISTORY_CAP);
  const visibleHistory = historyExpanded ? history : history.slice(0, HISTORY_CAP);
  const toggleLabel = historyExpanded
    ? I18N.t('show_less')
    : I18N.t('show_more', { n: hiddenCount });
  const historyHtml = history.length ? `
    <div class="history-divider">
      <div class="rule"></div>
      <div class="section-label">${I18N.t('history_label')}</div>
      <div class="rule"></div>
    </div>
    <div class="scandi-pills">
      ${visibleHistory.map(function (e) {
        return `
          <div class="pill pill--history">
            <div class="pill-name">${e.nickname}</div>
            <div class="pill-time">${fmt(e.announcedAt)}</div>
          </div>
        `;
      }).join('')}
    </div>
    ${hiddenCount > 0 || historyExpanded ? `
      <button class="history-toggle" id="history-toggle-btn">${toggleLabel}</button>
    ` : ''}
  ` : '';

  app.innerHTML = `
    <div class="scandi-presence">
      ${topChrome()}

      ${count > 0 ? `
        <div class="scandi-count">
          <div class="scandi-count-num">${count}<span class="suffix">${I18N.t('banner_here')}</span></div>
          ${subLabel ? `<div class="scandi-count-sub">${subLabel}</div>` : ''}
        </div>
      ` : `
        <div class="scandi-empty">
          <div class="scandi-empty-heading">${I18N.t('banner_zero')}</div>
        </div>
      `}

      <div class="scandi-actions">
        ${joinLabel ? `<button class="scandi-btn--ghost" id="join-btn">${joinLabel}</button>` : ''}
        <button class="scandi-btn--ghost" id="share-btn">+ ${I18N.t('share')}</button>
        <button class="scandi-btn--ghost-soft" id="check-btn">${I18N.t('check_again')}</button>
      </div>

      ${pillsHtml ? `<div class="scandi-pills">${pillsHtml}</div>` : ''}

      ${PRESENCE.renderOnTheWayBand ? PRESENCE.renderOnTheWayBand(etas) : ''}

      ${showEtaChooser && PRESENCE.renderEtaChooser ? PRESENCE.renderEtaChooser() : ''}

      ${historyHtml}
    </div>
  `;

  I18N.mountSwitcher();

  if (joinLabel) document.getElementById('join-btn').addEventListener('click', PRESENCE.renderNamePrompt);
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) shareBtn.addEventListener('click', function () { PRESENCE.openShare && PRESENCE.openShare(); });
  document.getElementById('check-btn').addEventListener('click', function () {
    PRESENCE.renderLoading();
    PRESENCE.query();
  });
  const leaveBtn = document.getElementById('leave-btn');
  if (leaveBtn) leaveBtn.addEventListener('click', PRESENCE.leave);
  const bellBtn = document.getElementById('bell-btn');
  if (bellBtn) PRESENCE.initBell(bellBtn);
  if (PRESENCE.mountStatusEditor) PRESENCE.mountStatusEditor();
  if (PRESENCE.mountEtaHandlers) PRESENCE.mountEtaHandlers();
  const historyToggle = document.getElementById('history-toggle-btn');
  if (historyToggle) historyToggle.addEventListener('click', function () {
    historyExpanded = !historyExpanded;
    PRESENCE.renderPopulated(entries, history, etas);
  });
};

PRESENCE.query = function (opts) {
  const silent = !!(opts && opts.silent);
  window.AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase)
    .then(function (data) {
      const entries = data.presences || data.presence || data || [];
      const history = data.history || [];
      const etas = data.etas || [];
      if (PRESENCE.ripple && PRESENCE.ripple.observe) PRESENCE.ripple.observe(entries);
      if (entries.length === 0 && history.length === 0 && etas.length === 0) {
        PRESENCE.renderEmpty();
      } else {
        PRESENCE.renderPopulated(entries, history, etas);
      }
    })
    .catch(function () {
      if (silent) return;
      PRESENCE.passphrase = null;
      PRESENCE.myNickname = null;
      PRESENCE.renderPassphrase(I18N.t('error_wrong_pass'));
    });
};

function bellSvg(on) {
  const dot = on ? '<circle cx="18" cy="5" r="3" fill="currentColor" stroke="none"/>' : '';
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
    ${dot}
  </svg>`;
}

PRESENCE.bellSvg = bellSvg;
