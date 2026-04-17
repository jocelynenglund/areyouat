window.PRESENCE = window.PRESENCE || {};

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nickBg(nickname) {
  const h = hashString((nickname || '').toLowerCase()) % 360;
  return `oklch(0.88 0.04 ${h})`;
}

function nickInk(nickname) {
  const h = hashString((nickname || '').toLowerCase()) % 360;
  return `oklch(0.28 0.03 ${h})`;
}

function nickInitials(nickname) {
  if (!nickname) return '—';
  const parts = nickname.trim().split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nickname.slice(0, 2).toUpperCase();
}

PRESENCE.nickBg = nickBg;
PRESENCE.nickInk = nickInk;
PRESENCE.nickInitials = nickInitials;

PRESENCE.renderPassphrase = function (errorMsg) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="scandi-screen">
      <div class="scandi-chrome">
        <div class="section-label">${I18N.t('section_label_01')}</div>
        <div class="lang-switcher"></div>
      </div>

      <div class="scandi-hero">
        <div class="display-heading">
          ${I18N.t('enter_heading_a')}<br/>
          <span class="italic">${I18N.t('enter_heading_b')}</span>
        </div>
        <div class="scandi-sub">/${PRESENCE.place} — ${I18N.t('passphrase_prompt')}</div>
      </div>

      <div class="scandi-form">
        <div class="scandi-field">
          <div class="section-label">${I18N.t('landing_pp_label')}</div>
          <div class="scandi-input-wrap">
            <span class="slash">/</span>
            <input class="scandi-input scandi-input--mono" id="pp-input" type="text" autocomplete="off" />
          </div>
        </div>
      </div>

      ${errorMsg ? `<div class="scandi-error">${errorMsg}</div>` : ''}

      <button class="scandi-btn" id="pp-btn">
        <span>${I18N.t('passphrase_submit')}</span><span>→</span>
      </button>
    </div>
  `;

  I18N.mountSwitcher();

  const input = document.getElementById('pp-input');
  document.getElementById('pp-btn').addEventListener('click', submitPassphrase);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitPassphrase(); });
  input.focus();

  function submitPassphrase() {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    PRESENCE.passphrase = val;
    PRESENCE.renderLoading();
    PRESENCE.query();
  }
};

PRESENCE.renderNamePrompt = function (opts) {
  opts = opts || {};
  const headingA = opts.headingA || I18N.t('name_prompt_a');
  const headingB = opts.headingB || I18N.t('name_prompt_b');
  const submitLabel = opts.submitLabel || I18N.t('name_submit');
  const onSubmit = opts.onSubmit || defaultAnnounceSubmit;

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
          ${headingA}<br/>
          <span class="italic">${headingB}</span>
        </div>
      </div>

      <div class="scandi-avatar-block">
        <div class="scandi-avatar" id="avatar">${initial ? nickInitials(initial) : '—'}</div>
        <input class="scandi-nickname-input" id="name-input" type="text" placeholder="${I18N.t('name_placeholder')}" value="${initial}" autocomplete="off" />
        <div class="scandi-hint">${I18N.t('name_saved_hint')}</div>
      </div>

      <div style="flex:1"></div>

      <div style="display:flex; gap:10px; margin-top:28px;">
        <button class="scandi-btn scandi-btn--ghost-soft" id="cancel-btn" style="flex:0 0 auto;">${I18N.t('name_cancel')}</button>
        <button class="scandi-btn" id="confirm-btn" style="flex:1;">
          <span>${submitLabel}</span><span>→</span>
        </button>
      </div>
    </div>
  `;

  I18N.mountSwitcher();

  const input = document.getElementById('name-input');
  const avatar = document.getElementById('avatar');

  function updateAvatar() {
    const v = input.value.trim();
    if (v) {
      avatar.textContent = nickInitials(v);
      avatar.classList.add('has-name');
      avatar.style.background = nickBg(v);
      avatar.style.color = nickInk(v);
    } else {
      avatar.textContent = '—';
      avatar.classList.remove('has-name');
      avatar.style.background = '';
      avatar.style.color = '';
    }
  }
  if (initial) updateAvatar();

  document.getElementById('confirm-btn').addEventListener('click', submitName);
  document.getElementById('cancel-btn').addEventListener('click', function () { PRESENCE.renderLoading(); PRESENCE.query(); });
  input.addEventListener('input', updateAvatar);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitName(); });
  input.focus();
  input.select();

  function submitName() {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    PRESENCE.myNickname = val;
    localStorage.setItem(PRESENCE.storageKey, JSON.stringify({ nickname: val, passphrase: PRESENCE.passphrase }));
    PRESENCE.renderLoading();
    onSubmit(val);
  }
};

function defaultAnnounceSubmit(nickname) {
  window.AREYOUAT.announcePresence(PRESENCE.place, PRESENCE.passphrase, nickname)
    .then(function () { return window.AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase); })
    .then(function (data) {
      const entries = data.presences || data.presence || data || [];
      const history = data.history || [];
      const etas = data.etas || [];
      PRESENCE.renderPopulated(entries, history, etas);
    })
    .catch(function () { PRESENCE.renderPassphrase(I18N.t('error_generic')); });
}
