window.PRESENCE = window.PRESENCE || {};

let etaChooserExpanded = false;

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

PRESENCE.renderEtaChooser = function () {
  if (etaChooserExpanded) {
    const chips = [5, 15, 30, 45].map(function (m) {
      return `<button class="eta-chip" data-eta-chip="${m}" type="button">${m}m</button>`;
    }).join('');
    return `
      <div class="eta-chooser eta-chooser--expanded">
        <div class="eta-prompt">${I18N.t('eta_prompt')}</div>
        <div class="eta-hint">${I18N.t('eta_hint')}</div>
        <div class="eta-chips">${chips}</div>
      </div>
    `;
  }
  return `
    <div class="eta-chooser" data-eta-toggle>
      <div class="eta-prompt">${I18N.t('eta_prompt')}</div>
      <div class="eta-hint">${I18N.t('eta_hint')}</div>
      <button class="eta-set-btn" type="button">${I18N.t('set_eta')}</button>
    </div>
  `;
};

PRESENCE.mountEtaHandlers = function () {
  document.querySelectorAll('[data-eta-toggle]').forEach(function (el) {
    el.addEventListener('click', function () {
      etaChooserExpanded = true;
      PRESENCE.query();
    });
  });
  document.querySelectorAll('[data-eta-chip]').forEach(function (el) {
    el.addEventListener('click', function () {
      const minutes = parseInt(el.getAttribute('data-eta-chip'), 10);
      commitEta(minutes);
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

function commitEta(minutes) {
  if (!PRESENCE.myNickname) {
    PRESENCE.renderNamePrompt({
      submitLabel: I18N.t('set_eta'),
      onSubmit: function (nickname) {
        AREYOUAT.setEta(PRESENCE.place, PRESENCE.passphrase, nickname, minutes)
          .then(function () {
            etaChooserExpanded = false;
            PRESENCE.query();
          })
          .catch(function () { PRESENCE.query(); });
      }
    });
    return;
  }
  AREYOUAT.setEta(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname, minutes)
    .then(function () {
      etaChooserExpanded = false;
      PRESENCE.query();
    })
    .catch(function () { PRESENCE.query(); });
}

function isSelf(entry) {
  return PRESENCE.myNickname && entry.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
}

function remainingMinutes(entry) {
  const mins = entry.minutes || 0;
  if (!entry.announcedAt) return mins;
  const arriveAt = new Date(entry.announcedAt).getTime() + mins * 60 * 1000;
  return Math.round((arriveAt - Date.now()) / 60000);
}

function formatEta(entry) {
  const remaining = remainingMinutes(entry);
  if (remaining <= 0) return '~' + I18N.t('time_now');
  return '~' + remaining + 'm';
}

function renderEtaPill(entry) {
  const self = isSelf(entry);
  const statusHtml = PRESENCE.renderStatus ? PRESENCE.renderStatus(entry, self) : '';
  const label = formatEta(entry);
  if (self) {
    return `
      <div class="pill eta-pill eta-pill--self">
        <div class="pill-name">${escapeHtml(entry.nickname)}<span class="pill-you">${I18N.t('you_label')}</span></div>
        <div class="eta-mins">${label}</div>
        <button class="eta-arrived-btn" id="eta-arrived-btn" type="button">${I18N.t('arrived')}</button>
        <button class="eta-cancel-btn" id="eta-cancel-btn" type="button" aria-label="${I18N.t('cancel_eta')}">\u00D7</button>
        ${statusHtml}
      </div>
    `;
  }
  return `
    <div class="pill eta-pill">
      <div class="pill-name">${escapeHtml(entry.nickname)}</div>
      <div class="eta-mins">${label}</div>
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
