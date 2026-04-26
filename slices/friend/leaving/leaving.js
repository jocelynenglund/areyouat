window.PRESENCE = window.PRESENCE || {};

const CHIPS = [5, 15, 30];

PRESENCE.formatLeavingTime = function (remaining) {
  if (remaining <= 0) return I18N.t('leaving_now');
  return '→ ' + remaining + 'm';
};

function leaveAtMs(entry) {
  if (!entry || !entry.leavingAnnouncedAt) return 0;
  return new Date(entry.leavingAnnouncedAt).getTime() + (entry.leavingMinutes || 0) * 60 * 1000;
}

PRESENCE.renderLeavingBadge = function (entry, isSelf) {
  const hasLeaving = entry && entry.leavingMinutes && entry.leavingAnnouncedAt;
  if (hasLeaving) {
    const remaining = remainingMinutes(entry);
    const label = PRESENCE.formatLeavingTime(remaining);
    const targetAt = leaveAtMs(entry);
    if (isSelf) {
      return `
        <div class="leaving-badge leaving-badge--self">
          <span class="leaving-mins" data-tick-leaving data-target-at="${targetAt}">${label}</span>
          <button class="leaving-cancel-btn" data-leaving-cancel type="button" aria-label="${I18N.t('cancel_leaving')}">×</button>
        </div>
      `;
    }
    return `<div class="leaving-badge"><span data-tick-leaving data-target-at="${targetAt}">${label}</span></div>`;
  }
  if (isSelf) {
    const chips = CHIPS.map(function (m) {
      return `<button class="leaving-chip" data-leaving-chip="${m}" type="button">${m}m</button>`;
    }).join('');
    return `
      <div class="leaving-affordance" data-leaving-root>
        <button class="leaving-trigger" data-leaving-trigger type="button">${I18N.t('set_leaving')}</button>
        <div class="leaving-chips is-hidden" data-leaving-chips>${chips}</div>
      </div>
    `;
  }
  return '';
};

PRESENCE.mountLeavingHandlers = function () {
  document.querySelectorAll('[data-leaving-trigger]').forEach(function (el) {
    el.addEventListener('click', function () {
      const root = el.closest('[data-leaving-root]');
      if (!root) return;
      const chips = root.querySelector('[data-leaving-chips]');
      if (!chips) return;
      chips.classList.remove('is-hidden');
      el.classList.add('is-hidden');
    });
  });

  document.querySelectorAll('[data-leaving-chip]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (!PRESENCE.myNickname) return;
      const minutes = parseInt(el.getAttribute('data-leaving-chip'), 10);
      if (!minutes) return;
      AREYOUAT.setLeaving(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname, minutes)
        .then(function () { PRESENCE.query(); })
        .catch(function () { PRESENCE.query(); });
    });
  });

  document.querySelectorAll('[data-leaving-cancel]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (!PRESENCE.myNickname) return;
      AREYOUAT.cancelLeaving(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname)
        .then(function () { PRESENCE.query(); })
        .catch(function () { PRESENCE.query(); });
    });
  });
};

function remainingMinutes(entry) {
  const mins = entry.leavingMinutes || 0;
  if (!entry.leavingAnnouncedAt) return mins;
  const leaveAt = new Date(entry.leavingAnnouncedAt).getTime() + mins * 60 * 1000;
  return Math.round((leaveAt - Date.now()) / 60000);
}
