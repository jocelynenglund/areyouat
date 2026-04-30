window.PRESENCE = window.PRESENCE || {};

const HISTORY_CAP = 3;
let historyExpanded = false;

function markTier(count) {
  if (count == null) return 'is-empty';
  if (count === 0) return 'is-empty';
  if (count <= 4) return 'is-calm';
  return 'is-busy';
}

function topChrome(count) {
  const tier = markTier(count);
  return `
    <div class="scandi-presence-chrome">
      <div class="live-chrome">
        <a class="live-logo" href="/about" aria-label="about">
          <div class="mark-wrap ${tier}">${BRAND.mark({ size: 18 })}</div>
          <div class="live-title">${I18N.t('app_title_short')}</div>
        </a>
        <div class="live-pass">/${PRESENCE.place}</div>
      </div>
      <div class="lang-switcher"></div>
    </div>
  `;
}

function pinRow() {
  const html = PRESENCE.renderPinChip ? PRESENCE.renderPinChip() : '';
  return `<div class="scandi-pin-row" id="pin-host">${html}</div>`;
}

PRESENCE.updatePinChip = function () {
  const host = document.getElementById('pin-host');
  if (!host) return;
  host.innerHTML = PRESENCE.renderPinChip ? PRESENCE.renderPinChip() : '';
  if (PRESENCE.mountPinChip) PRESENCE.mountPinChip();
};

PRESENCE.renderLoading = function () {
  document.getElementById('app').innerHTML = `
    <div class="scandi-presence">
      ${topChrome(null)}
      <div class="scandi-count">
        <div class="scandi-count-sub">${I18N.t('loading')}</div>
      </div>
    </div>
  `;
  I18N.mountSwitcher();
  if (PRESENCE.mountPinChip) PRESENCE.mountPinChip();
};

PRESENCE.renderEmpty = function () {
  const app = document.getElementById('app');
  const locale = I18N.t('date_locale');
  const d = new Date();
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  app.innerHTML = `
    <div class="scandi-presence">
      ${topChrome(0)}
      <div class="scandi-empty">
        <div class="scandi-empty-heading">${I18N.t('empty_heading')}</div>
        <div class="scandi-empty-sub">${I18N.t('empty_time_sub', { time: timeStr, date: dateStr })}</div>
      </div>

      ${pinRow()}

      <div class="scandi-actions" style="padding: 24px 28px 8px;">
        <button class="scandi-btn" id="announce-btn" style="max-width:280px;">
          <span>${I18N.t('but_im_here')}</span><span>→</span>
        </button>
      </div>
      <div class="scandi-actions">
        <button class="scandi-btn--ghost-soft" id="check-btn">${I18N.t('check_again')}</button>
      </div>

      ${PRESENCE.renderEtaChooser ? PRESENCE.renderEtaChooser() : ''}
    </div>
  `;

  I18N.mountSwitcher();
  if (PRESENCE.mountPinChip) PRESENCE.mountPinChip();

  document.getElementById('announce-btn').addEventListener('click', PRESENCE.renderNamePrompt);
  document.getElementById('check-btn').addEventListener('click', function () {
    PRESENCE.renderLoading();
    PRESENCE.query();
  });
  if (PRESENCE.mountEtaHandlers) PRESENCE.mountEtaHandlers();
};

function fmtTime(iso, locale) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function buildPillsHtml(entries, locale) {
  const sorted = [].concat(entries).sort(function (a, b) {
    const aSelf = PRESENCE.myNickname && a.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    const bSelf = PRESENCE.myNickname && b.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    if (aSelf && !bSelf) return -1;
    if (bSelf && !aSelf) return 1;
    return new Date(b.announcedAt) - new Date(a.announcedAt);
  });
  return sorted.map(function (e) {
    const isMe = PRESENCE.myNickname && e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
    const statusHtml = PRESENCE.renderStatus ? PRESENCE.renderStatus(e, isMe) : '';
    const leavingHtml = PRESENCE.renderLeavingBadge ? PRESENCE.renderLeavingBadge(e, isMe) : '';
    if (isMe) {
      return `
        <div class="pill pill--self">
          <div class="pill-self-row pill-self-row--primary">
            <div class="pill-name">${e.nickname}<span class="pill-you">${I18N.t('you_label')}</span></div>
            <button class="pill-leave-btn" id="leave-btn">${I18N.t('leave')}</button>
            <div class="bell-wrap"><button class="bell-btn" id="bell-btn" aria-label="notifications" type="button">${bellSvg(false)}</button></div>
          </div>
          <div class="pill-self-row pill-self-row--secondary">
            ${statusHtml}
            <div data-leaving-slot>${leavingHtml}</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="pill">
        <div class="pill-name">${e.nickname}</div>
        <div class="pill-time">${fmtTime(e.announcedAt, locale)}</div>
        ${statusHtml}
        ${leavingHtml}
      </div>
    `;
  }).join('');
}

function buildCountBannerHtml(entries) {
  const count = entries.length;
  if (count === 0) {
    return `<div class="scandi-empty"><div class="scandi-empty-heading">${I18N.t('banner_zero')}</div></div>`;
  }
  const isAlreadyHere = PRESENCE.myNickname && entries.some(function (e) {
    return e.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
  });
  const others = isAlreadyHere ? count - 1 : count;
  let subLabel;
  if (isAlreadyHere && count === 1) subLabel = I18N.t('sub_alone');
  else if (isAlreadyHere && others === 1) subLabel = I18N.t('sub_you_plus_one');
  else if (isAlreadyHere) subLabel = I18N.t('sub_you_plus_many', { n: others });
  else subLabel = count === 1 ? I18N.t('banner_one') : '';
  return `
    <div class="scandi-count">
      <div class="scandi-count-num">${count}<span class="suffix">${I18N.t('banner_here')}</span></div>
      ${subLabel ? `<div class="scandi-count-sub">${subLabel}</div>` : ''}
    </div>
  `;
}

PRESENCE.updatePillsSection = function (entries) {
  const host = document.getElementById('pills-host');
  if (!host) return;
  const locale = I18N.t('date_locale');
  host.innerHTML = buildPillsHtml(entries || [], locale);
  // Re-mount pill-internal handlers (status edit, leaving, leave btn, bell).
  const leaveBtn = document.getElementById('leave-btn');
  if (leaveBtn) leaveBtn.addEventListener('click', PRESENCE.leave);
  const bellBtn = document.getElementById('bell-btn');
  if (bellBtn && PRESENCE.initBell) PRESENCE.initBell(bellBtn);
  if (PRESENCE.mountStatusEditor) PRESENCE.mountStatusEditor();
  if (PRESENCE.mountLeavingHandlers) PRESENCE.mountLeavingHandlers();
};

PRESENCE.updateCountBanner = function (entries) {
  const host = document.getElementById('count-host');
  if (!host) return;
  host.innerHTML = buildCountBannerHtml(entries || []);
};

function buildHistoryHtml(history, locale) {
  history = history || [];
  if (!history.length) return '';
  const hiddenCount = Math.max(0, history.length - HISTORY_CAP);
  const visibleHistory = historyExpanded ? history : history.slice(0, HISTORY_CAP);
  const toggleLabel = historyExpanded
    ? I18N.t('show_less')
    : I18N.t('show_more', { n: hiddenCount });
  return `
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
            <div class="pill-time">${fmtTime(e.announcedAt, locale)}</div>
          </div>
        `;
      }).join('')}
    </div>
    ${hiddenCount > 0 || historyExpanded ? `
      <button class="history-toggle" id="history-toggle-btn">${toggleLabel}</button>
    ` : ''}
  `;
}

PRESENCE.updateHistorySection = function (history) {
  const host = document.getElementById('history-host');
  if (!host) return;
  const locale = I18N.t('date_locale');
  PRESENCE._historyCache = history || [];
  host.innerHTML = buildHistoryHtml(PRESENCE._historyCache, locale);
  const toggle = document.getElementById('history-toggle-btn');
  if (toggle) toggle.addEventListener('click', function () {
    historyExpanded = !historyExpanded;
    PRESENCE.updateHistorySection(PRESENCE._historyCache);
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

  const joinLabel = isAlreadyHere ? null
    : count === 0 ? I18N.t('join_zero')
    : count === 1 ? I18N.t('join_one')
    : I18N.t('join_many');

  function fmt(iso) { return fmtTime(iso, locale); }

  const pillsHtml = buildPillsHtml(entries, locale);
  const countBannerHtml = buildCountBannerHtml(entries);

  PRESENCE._historyCache = history;
  const historyHtml = buildHistoryHtml(history, locale);

  app.innerHTML = `
    <div class="scandi-presence">
      ${topChrome(count + etas.length)}

      <div id="count-host">${countBannerHtml}</div>

      ${pinRow()}

      <div class="scandi-actions">
        ${joinLabel ? `<button class="scandi-btn--ghost" id="join-btn">${joinLabel}</button>` : ''}
        <button class="scandi-btn--ghost" id="share-btn">+ ${I18N.t('share')}</button>
        <button class="scandi-btn--ghost-soft" id="check-btn">${I18N.t('check_again')}</button>
      </div>

      <div class="scandi-pills" id="pills-host">${pillsHtml}</div>

      ${PRESENCE.renderOnTheWayBand ? PRESENCE.renderOnTheWayBand(etas) : ''}

      ${showEtaChooser && PRESENCE.renderEtaChooser ? PRESENCE.renderEtaChooser() : ''}

      <div id="history-host">${historyHtml}</div>
    </div>
  `;

  I18N.mountSwitcher();
  if (PRESENCE.mountPinChip) PRESENCE.mountPinChip();

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
  if (PRESENCE.mountLeavingHandlers) PRESENCE.mountLeavingHandlers();
  const historyToggle = document.getElementById('history-toggle-btn');
  if (historyToggle) historyToggle.addEventListener('click', function () {
    historyExpanded = !historyExpanded;
    PRESENCE.updateHistorySection(PRESENCE._historyCache);
  });
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cacheKey() {
  return PRESENCE.storageKey + ':today';
}

PRESENCE.readTodayCache = function () {
  try {
    const raw = localStorage.getItem(cacheKey());
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (!snap || snap.date !== todayKey()) return null;
    return snap;
  } catch (_) { return null; }
};

function writeTodayCache(entries, history, etas, pin) {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify({
      date: todayKey(),
      entries: entries,
      history: history,
      etas: etas,
      pin: pin || null
    }));
  } catch (_) {}
}

PRESENCE.query = function (opts) {
  const silent = !!(opts && opts.silent);
  return window.AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase)
    .then(function (data) {
      const entries = data.presences || data.presence || data || [];
      const history = data.history || [];
      const etas = data.etas || [];
      PRESENCE.pin = data.pin || null;
      writeTodayCache(entries, history, etas, PRESENCE.pin);
      if (PRESENCE.ripple && PRESENCE.ripple.observe) PRESENCE.ripple.observe(entries);
      if (PRESENCE.scheduleEtaNotification && PRESENCE.findSelfEta) {
        PRESENCE.scheduleEtaNotification(PRESENCE.findSelfEta(etas));
      }
      if (entries.length === 0 && history.length === 0 && etas.length === 0) {
        PRESENCE.renderEmpty();
      } else {
        PRESENCE.renderPopulated(entries, history, etas);
      }
      return data;
    })
    .catch(function () {
      if (silent) return;
      PRESENCE.passphrase = null;
      PRESENCE.myNickname = null;
      PRESENCE.renderPassphrase(I18N.t('error_wrong_pass'));
    });
};

// Partial-update dispatcher used by the SignalR refresh handler.
// On a known event type, refetch state but only mutate the relevant section
// of the DOM — preserves any open sheets, focused inputs, scroll position,
// and avoids the visible flicker of a full innerHTML swap.
//
// Falls back to a full PRESENCE.query() for any event type we don't have a
// targeted updater for, so adding a new event type is at worst no regression.
PRESENCE.applyPartialUpdate = function (payload) {
  const type = payload && payload.type;
  // Only the pin-chip subtree changes for Place/PinSet — keep everything else.
  if (type === 'Place/PinSet') {
    return window.AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase)
      .then(function (data) {
        const entries = data.presences || [];
        const history = data.history || [];
        const etas = data.etas || [];
        PRESENCE.pin = data.pin || null;
        writeTodayCache(entries, history, etas, PRESENCE.pin);
        PRESENCE.updatePinChip();
      })
      .catch(function () { /* silent */ });
  }
  // Presence/* events change pills + count banner; pin/eta band/history may
  // also change so this is a strict subset of full re-render but skips the
  // chrome and pin chip (the high-flicker regions).
  if (typeof type === 'string' && type.startsWith('Presence/')) {
    return window.AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase)
      .then(function (data) {
        const entries = data.presences || [];
        const history = data.history || [];
        const etas = data.etas || [];
        PRESENCE.pin = data.pin || null;
        writeTodayCache(entries, history, etas, PRESENCE.pin);
        if (PRESENCE.ripple && PRESENCE.ripple.observe) PRESENCE.ripple.observe(entries);
        // If the host elements aren't on the page yet (e.g. we were on the
        // empty/passphrase screen), fall back to a full render.
        const haveHosts = document.getElementById('pills-host') && document.getElementById('count-host');
        if (!haveHosts) {
          if (entries.length === 0 && history.length === 0 && etas.length === 0) {
            PRESENCE.renderEmpty();
          } else {
            PRESENCE.renderPopulated(entries, history, etas);
          }
          return;
        }
        if (PRESENCE.scheduleEtaNotification && PRESENCE.findSelfEta) {
          PRESENCE.scheduleEtaNotification(PRESENCE.findSelfEta(etas));
        }
        PRESENCE.updateCountBanner(entries);
        PRESENCE.updatePillsSection(entries);
        PRESENCE.updateHistorySection(history);
        PRESENCE.updatePinChip();
      })
      .catch(function () { /* silent */ });
  }
  // Default: full refetch + re-render. Same as the safety-net poll behavior.
  return PRESENCE.query({ silent: true });
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

PRESENCE.tickCountdowns = function () {
  const now = Date.now();
  document.querySelectorAll('[data-tick-eta][data-target-at]').forEach(function (el) {
    const target = parseInt(el.getAttribute('data-target-at'), 10);
    if (!target) return;
    const remaining = Math.round((target - now) / 60000);
    if (PRESENCE.formatEtaTime) el.textContent = PRESENCE.formatEtaTime(remaining);
  });
  document.querySelectorAll('[data-tick-leaving][data-target-at]').forEach(function (el) {
    const target = parseInt(el.getAttribute('data-target-at'), 10);
    if (!target) return;
    const remaining = Math.round((target - now) / 60000);
    if (PRESENCE.formatLeavingTime) el.textContent = PRESENCE.formatLeavingTime(remaining);
  });
};

if (!PRESENCE._tickerInstalled) {
  PRESENCE._tickerInstalled = true;
  setInterval(PRESENCE.tickCountdowns, 30000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) PRESENCE.tickCountdowns();
  });
}
