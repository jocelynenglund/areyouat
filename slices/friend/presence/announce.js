window.PRESENCE = window.PRESENCE || {};

PRESENCE.renderPassphrase = function (errorMsg) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="presence-card">
      <div class="tagline">vad brukar vi säga?</div>
      ${errorMsg ? `<div class="error-text">${errorMsg}</div>` : ''}
      <input class="presence-input" id="pp-input" type="password" placeholder="••••••" autocomplete="off" />
      <button class="btn btn-primary" id="pp-btn">fortsätt</button>
    </div>
  `;

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

PRESENCE.renderNamePrompt = function () {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="presence-card">
      <div class="tagline">vem e du?</div>
      <input class="presence-input" id="name-input" type="text" placeholder="ditt namn" value="${PRESENCE.storedNickname || ''}" autocomplete="off" />
      <button class="btn btn-primary" id="confirm-btn">jag är här!</button>
      <button class="btn btn-secondary" id="cancel-btn">avbryt</button>
    </div>
  `;

  const input = document.getElementById('name-input');
  document.getElementById('confirm-btn').addEventListener('click', submitName);
  document.getElementById('cancel-btn').addEventListener('click', function () { PRESENCE.renderLoading(); PRESENCE.query(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitName(); });
  input.focus();

  function submitName() {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    PRESENCE.myNickname = val;
    localStorage.setItem(PRESENCE.storageKey, JSON.stringify({ nickname: val, passphrase: PRESENCE.passphrase }));
    PRESENCE.renderLoading();
    window.AREYOUAT.announcePresence(PRESENCE.place, PRESENCE.passphrase, val)
      .then(function () { return window.AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase); })
      .then(function (data) {
        const entries = data.presences || data.presence || data || [];
        const history = data.history || [];
        PRESENCE.renderPopulated(entries, history);
      })
      .catch(function () { PRESENCE.renderPassphrase('något gick fel — försök igen'); });
  }
};
