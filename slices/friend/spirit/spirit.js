window.PRESENCE = window.PRESENCE || {};

// "In spirit" — people who can't make it but want to be counted as rooting for
// the ones who are there. A non-present, person-scoped signal that lives in its
// own band (parallel to the on-the-way / ETA band) and never affects the "N här"
// headline count.

PRESENCE.renderSpiritBand = function (spirits) {
  if (!spirits || spirits.length === 0) return '';
  const sorted = [].concat(spirits).sort(function (a, b) {
    const aSelf = isSelf(a);
    const bSelf = isSelf(b);
    if (aSelf && !bSelf) return -1;
    if (bSelf && !aSelf) return 1;
    return new Date(a.announcedAt) - new Date(b.announcedAt);
  });
  const pills = sorted.map(renderSpiritPill).join('');
  return `
    <div class="history-divider spirit-divider">
      <div class="rule"></div>
      <div class="section-label">${I18N.t('in_spirit')}</div>
      <div class="rule"></div>
    </div>
    <div class="scandi-pills spirit-pills">${pills}</div>
  `;
};

PRESENCE.updateSpiritSection = function (spirits) {
  const host = document.getElementById('spirit-host');
  if (!host) return;
  host.innerHTML = PRESENCE.renderSpiritBand(spirits || []);
  PRESENCE.mountSpiritHandlers();
};

// A soft invitation shown to anyone not present, not on the way, and not already
// in spirit — "can't make it, but I'm with you".
PRESENCE.renderSpiritTrigger = function () {
  return `
    <div class="spirit-trigger" data-spirit-toggle>
      <button class="spirit-trigger-btn" type="button">${I18N.t('cant_make_it')}</button>
    </div>
  `;
};

PRESENCE.renderSpiritPrompt = function () {
  const app = document.getElementById('app');
  const initial = PRESENCE.storedNickname || PRESENCE.myNickname || '';

  app.innerHTML = `
    <div class="scandi-screen">
      <div class="scandi-chrome">
        <div class="section-label">${I18N.t('section_label_02')}</div>
        <div class="lang-switcher"></div>
      </div>

      <div class="scandi-hero">
        <div class="display-heading">
          <span class="italic">${I18N.t('spirit_prompt')}</span>
        </div>
        <div class="scandi-sub">${I18N.t('spirit_hint')}</div>
      </div>

      <div class="scandi-avatar-block">
        <div class="scandi-avatar" id="avatar">${initial && PRESENCE.nickInitials ? PRESENCE.nickInitials(initial) : '—'}</div>
        <input class="scandi-nickname-input" id="name-input" type="text" placeholder="${I18N.t('name_placeholder')}" value="${escapeHtml(initial)}" autocomplete="off" />
        <div class="scandi-hint">${I18N.t('name_saved_hint')}</div>
      </div>

      <div class="spirit-note-block">
        <input class="spirit-note-input" id="spirit-note-input" type="text" maxlength="30" placeholder="${I18N.t('spirit_note_placeholder')}" autocomplete="off" />
      </div>

      <div style="flex:1"></div>

      <div style="display:flex; gap:10px; margin-top:28px;">
        <button class="scandi-btn" id="spirit-submit" style="flex:2;"><span>${I18N.t('spirit_submit')}</span><span>💙</span></button>
        <button class="scandi-btn scandi-btn--ghost-soft" id="cancel-btn" style="flex:1;">${I18N.t('name_cancel')}</button>
      </div>
    </div>
  `;

  I18N.mountSwitcher();

  const input = document.getElementById('name-input');
  const noteInput = document.getElementById('spirit-note-input');
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

  function submit() {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    const note = noteInput.value.trim();
    PRESENCE.myNickname = name;
    localStorage.setItem(PRESENCE.storageKey, JSON.stringify({ nickname: name, passphrase: PRESENCE.passphrase }));
    PRESENCE.renderLoading();
    AREYOUAT.setSpirit(PRESENCE.place, PRESENCE.passphrase, name, note)
      .then(function () { PRESENCE.query(); })
      .catch(function () { PRESENCE.query(); });
  }

  document.getElementById('spirit-submit').addEventListener('click', submit);
  noteInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); noteInput.focus(); }
  });

  document.getElementById('cancel-btn').addEventListener('click', function () {
    PRESENCE.renderLoading();
    PRESENCE.query();
  });
};

PRESENCE.mountSpiritHandlers = function () {
  document.querySelectorAll('[data-spirit-toggle]').forEach(function (el) {
    el.addEventListener('click', function () {
      PRESENCE.renderSpiritPrompt();
    });
  });
  const undo = document.getElementById('spirit-undo-btn');
  if (undo) undo.addEventListener('click', function () {
    if (!PRESENCE.myNickname) return;
    AREYOUAT.cancelSpirit(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname)
      .then(function () { PRESENCE.query(); })
      .catch(function () { PRESENCE.query(); });
  });
};

PRESENCE.selfInSpirit = function (spirits) {
  if (!spirits || !PRESENCE.myNickname) return false;
  const me = PRESENCE.myNickname.toLowerCase();
  return spirits.some(function (s) { return s.nickname.toLowerCase() === me; });
};

function isSelf(entry) {
  return PRESENCE.myNickname && entry.nickname.toLowerCase() === PRESENCE.myNickname.toLowerCase();
}

function renderSpiritPill(entry) {
  const self = isSelf(entry);
  const noteHtml = entry.note
    ? `<div class="spirit-note">“${escapeHtml(entry.note)}”</div>`
    : '';
  if (self) {
    return `
      <div class="pill spirit-pill spirit-pill--self">
        <div class="pill-name">${escapeHtml(entry.nickname)}<span class="pill-you">${I18N.t('you_label')}</span></div>
        ${noteHtml}
        <button class="spirit-undo-btn" id="spirit-undo-btn" type="button">${I18N.t('spirit_undo')}</button>
      </div>
    `;
  }
  return `
    <div class="pill spirit-pill">
      <div class="pill-name">${escapeHtml(entry.nickname)}</div>
      ${noteHtml}
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
