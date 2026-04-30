window.PRESENCE = window.PRESENCE || {};

PRESENCE.renderOnTheWayBand = function (etas) {
  if (!etas || etas.length === 0) return '';
  const sorted = [].concat(etas).sort(function (a, b) {
    const aSelf = isSelf(a);
    const bSelf = isSelf(b);
    if (aSelf && !bSelf) return -1;
    if (bSelf && !aSelf) return 1;
    return remainingMinutes(a) - remainingMinutes(b);
  });
  const pills = sorted.map(renderEtaPill).join('');
  return `
    <div class="history-divider eta-divider">
      <div class="rule"></div>
      <div class="section-label">${I18N.t('on_the_way')}</div>
      <div class="rule"></div>
    </div>
    <div class="scandi-pills eta-pills">${pills}</div>
  `;
};

const AFTER_WORK_HOUR = 17;
const AFTER_WORK_MIN = 0;

function minutesUntil(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  return Math.round((target - now) / 60000);
}

PRESENCE.renderEtaChooser = function () {
  return `
    <div class="eta-chooser" data-eta-toggle>
      <div class="eta-prompt">${I18N.t('eta_prompt')}</div>
      <div class="eta-hint">${I18N.t('eta_hint')}</div>
      <button class="eta-set-btn" type="button">${I18N.t('set_eta')}</button>
    </div>
  `;
};

PRESENCE.renderEtaPrompt = function () {
  const app = document.getElementById('app');
  const initial = PRESENCE.storedNickname || PRESENCE.myNickname || '';
  const chips = [
    { minutes: 30, label: '30m' },
    { minutes: 60, label: '1h' },
    { minutes: 120, label: '2h' }
  ];
  const chipsHtml = chips.map(function (c) {
    return `<button class="eta-chip" data-eta-chip="${c.minutes}" type="button">${c.label}</button>`;
  }).join('');

  app.innerHTML = `
    <div class="scandi-screen">
      <div class="scandi-chrome">
        <div class="section-label">${I18N.t('section_label_02')}</div>
        <div class="lang-switcher"></div>
      </div>

      <div class="scandi-hero">
        <div class="display-heading">
          <span class="italic">${I18N.t('eta_prompt')}</span>
        </div>
        <div class="scandi-sub">${I18N.t('eta_hint')}</div>
      </div>

      <div class="scandi-avatar-block">
        <div class="scandi-avatar" id="avatar">${initial && PRESENCE.nickInitials ? PRESENCE.nickInitials(initial) : '—'}</div>
        <input class="scandi-nickname-input" id="name-input" type="text" placeholder="${I18N.t('name_placeholder')}" value="${escapeHtml(initial)}" autocomplete="off" />
        <div class="scandi-hint">${I18N.t('name_saved_hint')}</div>
      </div>

      <div class="eta-prompt-time">
        <div class="eta-chips">${chipsHtml}</div>
        <div class="eta-custom-hint">${I18N.t('eta_after_work')}?</div>
        <div class="eta-custom">
          <input class="eta-custom-input" id="eta-custom-input" type="time" value="17:00" aria-label="${I18N.t('eta_custom')}">
          <button class="eta-custom-submit" id="eta-custom-submit" type="button">${I18N.t('eta_go')}</button>
        </div>
        <div class="eta-custom-error" id="eta-custom-error" hidden>${I18N.t('eta_invalid')}</div>
      </div>

      <div style="flex:1"></div>

      <div style="display:flex; gap:10px; margin-top:28px;">
        <button class="scandi-btn scandi-btn--ghost-soft" id="cancel-btn" style="flex:1;">${I18N.t('name_cancel')}</button>
      </div>
    </div>
  `;

  I18N.mountSwitcher();

  const input = document.getElementById('name-input');
  const avatar = document.getElementById('avatar');

  function updateAvatar() {
    const v = input.value.trim();
    if (v && PRESENCE.nickInitials) {
      avatar.textContent = PRESENCE.nickInitials(v);
      avatar.classList.add('has-name');
      avatar.style.background = PRESENCE.nickBg(v);
      avatar.style.color = PRESENCE.nickInk(v);
    } else {
      avatar.textContent = '—';
      avatar.classList.remove('has-name');
      avatar.style.background = '';
      avatar.style.color = '';
    }
  }
  if (initial) updateAvatar();
  input.addEventListener('input', updateAvatar);

  function submitWith(minutes) {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    PRESENCE.myNickname = name;
    localStorage.setItem(PRESENCE.storageKey, JSON.stringify({ nickname: name, passphrase: PRESENCE.passphrase }));
    PRESENCE.renderLoading();
    AREYOUAT.setEta(PRESENCE.place, PRESENCE.passphrase, name, minutes)
      .then(function () { PRESENCE.query(); })
      .catch(function () { PRESENCE.query(); });
  }

  document.querySelectorAll('[data-eta-chip]').forEach(function (el) {
    el.addEventListener('click', function () {
      const minutes = parseInt(el.getAttribute('data-eta-chip'), 10);
      submitWith(minutes);
    });
  });

  const customSubmit = document.getElementById('eta-custom-submit');
  const customInput = document.getElementById('eta-custom-input');
  const customError = document.getElementById('eta-custom-error');
  function submitCustom() {
    if (!customInput || !customInput.value) return;
    const parts = customInput.value.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return;
    const minutes = minutesUntil(h, m);
    if (minutes <= 0) {
      if (customError) customError.hidden = false;
      return;
    }
    if (customError) customError.hidden = true;
    submitWith(minutes);
  }
  if (customSubmit) customSubmit.addEventListener('click', submitCustom);
  if (customInput) customInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submitCustom(); }
  });

  document.getElementById('cancel-btn').addEventListener('click', function () {
    PRESENCE.renderLoading();
    PRESENCE.query();
  });
};

PRESENCE.mountEtaHandlers = function () {
  document.querySelectorAll('[data-eta-toggle]').forEach(function (el) {
    el.addEventListener('click', function () {
      PRESENCE.renderEtaPrompt();
    });
  });
  const arrivedBtn = document.getElementById('eta-arrived-btn');
  if (arrivedBtn) arrivedBtn.addEventListener('click', function () {
    if (!PRESENCE.myNickname) return;
    PRESENCE.renderLoading();
    AREYOUAT.announcePresence(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname)
      .then(function () { PRESENCE.query(); })
      .catch(function () { PRESENCE.query(); });
  });
  const cancelBtn = document.getElementById('eta-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', function () {
    if (!PRESENCE.myNickname) return;
    AREYOUAT.cancelEta(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname)
      .then(function () { PRESENCE.query(); })
      .catch(function () { PRESENCE.query(); });
  });
};

PRESENCE.selfHasEta = function (etas) {
  if (!etas || !PRESENCE.myNickname) return false;
  const me = PRESENCE.myNickname.toLowerCase();
  return etas.some(function (e) { return e.nickname.toLowerCase() === me; });
};

PRESENCE.findSelfEta = function (etas) {
  if (!etas || !PRESENCE.myNickname) return null;
  const me = PRESENCE.myNickname.toLowerCase();
  return etas.find(function (e) { return e.nickname.toLowerCase() === me; }) || null;
};

// Lead time for the "arriving soon" prompt — fires 3 min before the ETA
// elapses ("din eta går ut snart — är du framme?"). Short enough to be
// useful, long enough that you can tap "i'm here" without sprinting.
const ETA_LEAD_MS = 3 * 60 * 1000;

// Single tab-scoped timer. Clearing + re-scheduling on every query response
// keeps it in sync with whatever the server says is true; we don't need to
// manually clear on arrived/cancel because the next response has no self ETA.
let etaNotifTimer = null;
let etaNotifAt = 0;

PRESENCE.scheduleEtaNotification = function (selfEta) {
  if (etaNotifTimer) {
    clearTimeout(etaNotifTimer);
    etaNotifTimer = null;
    etaNotifAt = 0;
  }
  if (!selfEta || !selfEta.minutes || !selfEta.announcedAt) return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  const elapseAt = new Date(selfEta.announcedAt).getTime() + selfEta.minutes * 60 * 1000;
  const fireAt = elapseAt - ETA_LEAD_MS;
  const ms = fireAt - Date.now();
  if (ms <= 0) return; // already too late for the heads-up

  etaNotifAt = fireAt;
  etaNotifTimer = setTimeout(function () {
    etaNotifTimer = null;
    etaNotifAt = 0;
    try {
      const title = I18N.t('app_title_short');
      const body = I18N.t('eta_arriving_soon');
      const n = new Notification(title, {
        body: body,
        icon: '/icons/apple-touch-icon.png',
        tag: 'eta-arriving',
        data: { url: '/' + (PRESENCE.place || '') }
      });
      n.onclick = function () {
        try { window.focus(); } catch (_) {}
        n.close();
      };
    } catch (_) { /* permission revoked or browser quirk */ }
  }, ms);
};

function isSelf(entry) {
  return PRESENCE.myNickname && entry.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
}

function remainingMinutes(entry) {
  const mins = entry.minutes || 0;
  if (!entry.announcedAt) return mins;
  const arriveAt = new Date(entry.announcedAt).getTime() + mins * 60 * 1000;
  return Math.round((arriveAt - Date.now()) / 60000);
}

PRESENCE.formatEtaTime = function (remaining) {
  if (remaining <= 0) return '~' + I18N.t('time_now');
  return '~' + remaining + 'm';
};

function arriveAtMs(entry) {
  const base = entry.announcedAt ? new Date(entry.announcedAt).getTime() : Date.now();
  return base + (entry.minutes || 0) * 60 * 1000;
}

function formatEta(entry) {
  return PRESENCE.formatEtaTime(remainingMinutes(entry));
}

function renderEtaPill(entry) {
  const self = isSelf(entry);
  const statusHtml = PRESENCE.renderStatus ? PRESENCE.renderStatus(entry, self) : '';
  const label = formatEta(entry);
  if (self) {
    const bellHtml = PRESENCE.bellSvg
      ? `<div class="bell-wrap"><button class="bell-btn" id="bell-btn" aria-label="notifications" type="button">${PRESENCE.bellSvg(false)}</button></div>`
      : '';
    return `
      <div class="pill eta-pill eta-pill--self">
        <div class="pill-name">${escapeHtml(entry.nickname)}<span class="pill-you">${I18N.t('you_label')}</span></div>
        <div class="eta-mins" data-tick-eta data-target-at="${arriveAtMs(entry)}">${label}</div>
        <button class="eta-arrived-btn" id="eta-arrived-btn" type="button">${I18N.t('arrived')}</button>
        <button class="eta-cancel-btn" id="eta-cancel-btn" type="button" aria-label="${I18N.t('cancel_eta')}">\u00D7</button>
        ${bellHtml}
        ${statusHtml}
      </div>
    `;
  }
  return `
    <div class="pill eta-pill">
      <div class="pill-name">${escapeHtml(entry.nickname)}</div>
      <div class="eta-mins" data-tick-eta data-target-at="${arriveAtMs(entry)}">${label}</div>
      ${statusHtml}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
