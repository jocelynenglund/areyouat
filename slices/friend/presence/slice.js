(function () {
  // --- module state ---
  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || null;
  const app = document.getElementById('app');

  let passphrase = null;
  let myNickname = null;

  // --- guard ---
  if (!place) {
    app.innerHTML = '<p style="color:var(--muted);text-align:center;margin-top:40px">Ange en plats i URL:en, t.ex. /bron</p>';
    return;
  }

  // --- helpers ---
  function fmt(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  }

  function now() {
    const d = new Date();
    const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    return `kl ${time} · ${date}`;
  }

  function placeName() {
    return `<div class="place-name"><span class="slash">/</span>${place}</div>`;
  }

  // --- renders ---

  function renderPassphrase(errorMsg) {
    app.innerHTML = `
      <div class="presence-card">
        ${placeName()}
        <div class="tagline">skriv lösenord</div>
        ${errorMsg ? `<div class="error-text">${errorMsg}</div>` : ''}
        <input class="presence-input" id="pp-input" type="password" placeholder="••••••" autocomplete="off" />
        <button class="btn btn-primary" id="pp-btn">fortsätt</button>
      </div>
    `;

    const input = document.getElementById('pp-input');
    const btn = document.getElementById('pp-btn');

    function submit() {
      const val = input.value.trim();
      if (!val) { input.focus(); return; }
      passphrase = val;
      renderLoading();
      queryPresence();
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    input.focus();
  }

  function renderLoading() {
    app.innerHTML = `
      <div class="presence-card">
        ${placeName()}
        <div class="spinner"></div>
        <div class="loading-text">kollar…</div>
      </div>
    `;
  }

  function renderEmpty() {
    app.innerHTML = `
      <div class="presence-card">
        ${placeName()}
        <div class="state-heading">ingen e här</div>
        <div class="state-sub">${now()}</div>
        <button class="btn btn-primary" id="announce-btn">men jag är!</button>
        <button class="check-again-btn" id="check-btn">kolla igen</button>
      </div>
    `;

    document.getElementById('announce-btn').addEventListener('click', renderNamePrompt);
    document.getElementById('check-btn').addEventListener('click', function () {
      renderLoading();
      queryPresence();
    });
  }

  function renderNamePrompt() {
    app.innerHTML = `
      <div class="presence-card">
        ${placeName()}
        <div class="tagline">vem e du?</div>
        <input class="presence-input" id="name-input" type="text" placeholder="ditt namn" autocomplete="off" />
        <button class="btn btn-primary" id="confirm-btn">jag är här!</button>
        <button class="btn btn-secondary" id="cancel-btn">avbryt</button>
      </div>
    `;

    const input = document.getElementById('name-input');
    const confirm = document.getElementById('confirm-btn');
    const cancel = document.getElementById('cancel-btn');

    function submit() {
      const val = input.value.trim();
      if (!val) { input.focus(); return; }
      myNickname = val;
      renderLoading();
      announce(val);
    }

    confirm.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    cancel.addEventListener('click', function () { renderLoading(); queryPresence(); });
    input.focus();
  }

  function renderPopulated(entries) {
    const count = entries.length;
    const banner = count === 1 ? 'någon e här!' : `${count} e här`;
    const isAlreadyHere = myNickname && entries.some(function (e) {
      return e.nickname.toLowerCase() === myNickname.toLowerCase();
    });
    const joinLabel = isAlreadyHere ? null : (count === 1 ? 'jag är också här!' : 'jag med!');

    const listHtml = entries.map(function (e) {
      const isMe = myNickname && e.nickname.toLowerCase() === myNickname.toLowerCase();
      const nameLabel = isMe ? `${e.nickname} (du)` : e.nickname;
      const timeLabel = isMe ? 'nu' : fmt(e.announcedAt);
      return `
        <div class="presence-item${isMe ? ' is-you' : ''}">
          <span class="presence-name">${nameLabel}</span>
          <span class="presence-time">${timeLabel}</span>
        </div>
      `;
    }).join('');

    app.innerHTML = `
      <div class="presence-card">
        ${placeName()}
        <div class="there-banner"><span class="dot"></span>${banner}</div>
        ${isAlreadyHere ? '<div class="state-sub">andra i gruppen kan se dig nu</div>' : ''}
        <div class="presence-list">${listHtml}</div>
        ${joinLabel ? `<button class="btn btn-primary" id="join-btn" style="margin-top:4px">${joinLabel}</button>` : ''}
        <button class="check-again-btn" id="check-btn">kolla igen</button>
      </div>
    `;

    if (joinLabel) {
      document.getElementById('join-btn').addEventListener('click', renderNamePrompt);
    }
    document.getElementById('check-btn').addEventListener('click', function () {
      renderLoading();
      queryPresence();
    });
  }

  // --- API calls ---

  function queryPresence() {
    window.AREYOUAT.getPresenceToday(place, passphrase)
      .then(function (data) {
        const entries = data.presences || data.presence || data || [];
        if (entries.length === 0) {
          renderEmpty();
        } else {
          renderPopulated(entries);
        }
      })
      .catch(function () {
        passphrase = null;
        myNickname = null;
        renderPassphrase('fel lösenord eller nätverksfel — försök igen');
      });
  }

  function announce(nickname) {
    window.AREYOUAT.announcePresence(place, passphrase, nickname)
      .then(function () {
        return window.AREYOUAT.getPresenceToday(place, passphrase);
      })
      .then(function (data) {
        const entries = data.presences || data.presence || data || [];
        renderPopulated(entries);
      })
      .catch(function () {
        renderPassphrase('något gick fel — försök igen');
      });
  }

  // --- boot ---
  renderPassphrase();
})();
