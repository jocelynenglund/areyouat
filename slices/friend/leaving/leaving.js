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

function replaceLeavingSlot(html) {
  const slot = document.querySelector('.pill--self [data-leaving-slot]');
  if (!slot) return null;
  const prev = slot.innerHTML;
  slot.innerHTML = html;
  PRESENCE.mountLeavingHandlers();
  return prev;
}

PRESENCE.mountLeavingHandlers = function () {
  document.querySelectorAll('[data-leaving-trigger]').forEach(function (el) {
    if (el.__lvBound) return;
    el.__lvBound = true;
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
    if (el.__lvBound) return;
    el.__lvBound = true;
    el.addEventListener('click', function () {
      if (!PRESENCE.myNickname) return;
      const minutes = parseInt(el.getAttribute('data-leaving-chip'), 10);
      if (!minutes) return;
      // Optimistic: flip the slot to the badge state immediately. SignalR
      // re-confirms via Presence/LeavingAnnounced; on API error we revert.
      const fakeEntry = {
        nickname: PRESENCE.myNickname,
        leavingMinutes: minutes,
        leavingAnnouncedAt: new Date().toISOString(),
      };
      const prev = replaceLeavingSlot(PRESENCE.renderLeavingBadge(fakeEntry, true));
      AREYOUAT.setLeaving(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname, minutes)
        .catch(function () {
          if (prev !== null) replaceLeavingSlot(prev);
        });
    });
  });

  document.querySelectorAll('[data-leaving-cancel]').forEach(function (el) {
    if (el.__lvBound) return;
    el.__lvBound = true;
    el.addEventListener('click', function () {
      if (!PRESENCE.myNickname) return;
      // Optimistic: flip back to the empty affordance immediately.
      const fakeEntry = { nickname: PRESENCE.myNickname };
      const prev = replaceLeavingSlot(PRESENCE.renderLeavingBadge(fakeEntry, true));
      AREYOUAT.cancelLeaving(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname)
        .catch(function () {
          if (prev !== null) replaceLeavingSlot(prev);
        });
    });
  });
};

function remainingMinutes(entry) {
  const mins = entry.leavingMinutes || 0;
  if (!entry.leavingAnnouncedAt) return mins;
  const leaveAt = new Date(entry.leavingAnnouncedAt).getTime() + mins * 60 * 1000;
  return Math.round((leaveAt - Date.now()) / 60000);
}
