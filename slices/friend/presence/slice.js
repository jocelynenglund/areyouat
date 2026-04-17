(function () {
  // --- module state ---
  const place = window.location.pathname.replace(/^\//, '').split('/')[0] || null;
  const app = document.getElementById('app');

  const params = new URLSearchParams(window.location.search);
  let passphrase = params.get('pp') || null;
  const storageKey = `areyouat:${place}`;
  const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
  let myNickname = stored ? stored.nickname : null;
  if (!passphrase && stored) passphrase = stored.passphrase;

  // --- guard ---
  if (!place || place === 'about') {
    app.innerHTML = `
      <div class="presence-card">
        <div class="tagline" style="margin-top:0">vart ska ni?</div>
        <input class="presence-input" id="place-input" type="text" placeholder="bron, gymmet, kontoret…" autocomplete="off" />
        <input class="presence-input" id="pp-input" type="password" placeholder="lösenord" autocomplete="off" />
        <button class="btn btn-primary" id="go-btn">fortsätt →</button>
        <div style="color:var(--muted);font-size:13px;line-height:1.7;text-align:center;margin-top:8px;border-top:1px solid var(--border);padding-top:20px;width:100%">
          hitta på ett platsnamn och ett lösenord som bara ni känner till —
          dela länken med vänner så ser ni vem som är där just nu.<br><br>
          ingen app. inget konto. allt nollställs vid midnatt.
        </div>
      </div>
    `;

    const placeInput = document.getElementById('place-input');
    const ppInput = document.getElementById('pp-input');
    const goBtn = document.getElementById('go-btn');

    function submit() {
      const p = placeInput.value.trim().toLowerCase().replace(/\s+/g, '-');
      const pp = ppInput.value.trim();
      if (!p) { placeInput.focus(); return; }
      if (!pp) { ppInput.focus(); return; }
      window.location.href = `/${p}?pp=${encodeURIComponent(pp)}`;
    }

    goBtn.addEventListener('click', submit);
    [placeInput, ppInput].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
    placeInput.focus();
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
      localStorage.setItem(storageKey, JSON.stringify({ nickname: val, passphrase }));
      renderLoading();
      announce(val);
    }

    confirm.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    cancel.addEventListener('click', function () { renderLoading(); queryPresence(); });
    input.focus();
  }

  function renderPopulated(entries, history) {
    history = history || [];
    const count = entries.length;
    const banner = count === 0 ? 'ingen e här nu' : count === 1 ? 'någon e här!' : `${count} e här`;
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
          ${isMe ? '<button class="leave-btn" id="leave-btn">lämna</button>' : ''}
        </div>
      `;
    }).join('');

    const historyHtml = history.length ? `
      <div class="history-section">
        <div class="history-label">var här tidigare</div>
        ${history.map(function (e) {
          return `<div class="history-item"><span>${e.nickname}</span><span class="presence-time">${fmt(e.announcedAt)}</span></div>`;
        }).join('')}
      </div>
    ` : '';

    app.innerHTML = `
      <div class="presence-card">
        ${placeName()}
        <div class="there-banner"><span class="dot"></span>${banner}</div>
        ${isAlreadyHere ? '<div class="state-sub">andra i gruppen kan se dig nu</div>' : ''}
        <div class="presence-list">${listHtml}</div>
        ${historyHtml}
        ${joinLabel ? `<button class="btn btn-primary" id="join-btn" style="margin-top:4px">${joinLabel}</button>` : ''}
        <button class="check-again-btn" id="check-btn">kolla igen</button>
      </div>
    `;

    if (joinLabel) {
      document.getElementById('join-btn').addEventListener('click', renderNamePrompt);
    }
    if (document.getElementById('leave-btn')) {
      document.getElementById('leave-btn').addEventListener('click', function () {
        window.AREYOUAT.leavePresence(place, passphrase, myNickname)
          .then(function () {
            myNickname = null;
            localStorage.removeItem(storageKey);
            renderLoading();
            queryPresence();
          })
          .catch(function () { renderLoading(); queryPresence(); });
      });
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
        const history = data.history || [];
        if (entries.length === 0 && history.length === 0) {
          renderEmpty();
        } else {
          renderPopulated(entries, history);
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
  if (passphrase) {
    renderLoading();
    queryPresence();
  } else {
    renderPassphrase();
  }
})();
