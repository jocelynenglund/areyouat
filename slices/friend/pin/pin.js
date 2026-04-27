window.PRESENCE = window.PRESENCE || {};

PRESENCE.pin = null;

PRESENCE.renderPinChip = function () {
  if (!PRESENCE.passphrase) return '';
  const pin = PRESENCE.pin;
  if (pin && typeof pin.lat === 'number' && typeof pin.lng === 'number') {
    return `
      <button class="pin pin--set" data-pin-action="menu" type="button" aria-label="${escapeAttr(I18N.t('pin_label'))}" title="${escapeAttr(I18N.t('pin_label'))}">
        ${pinIcon(13)}
      </button>
    `;
  }
  return `
    <button class="pin pin--empty" data-pin-action="drop" type="button" aria-label="${escapeAttr(I18N.t('pin_drop'))}">
      ${pinIcon(12)}
      <span class="pin__label">${escapeText(I18N.t('pin_drop'))}</span>
    </button>
  `;
};

PRESENCE.mountPinChip = function () {
  document.querySelectorAll('[data-pin-action]').forEach(function (el) {
    if (el.__pinBound) return;
    el.__pinBound = true;
    const action = el.getAttribute('data-pin-action');
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (action === 'drop') dropFromChip(el);
      else if (action === 'menu') openPinSheet(PRESENCE.pin);
    });
  });
};

function openPinSheet(pin) {
  if (!pin || typeof pin.lat !== 'number' || typeof pin.lng !== 'number') return;

  const setBy = pin.nickname
    ? I18N.t('pin_set_by', { who: pin.nickname })
    : I18N.t('pin_set_anon');
  const ago = relativeTime(pin.setAt);
  const meta = ago ? `${escapeText(setBy)} <span class="pin-sheet__ago">· ${escapeText(ago)}</span>` : escapeText(setBy);

  const sheet = document.createElement('div');
  sheet.className = 'pin-sheet-backdrop';
  sheet.innerHTML = `
    <div class="pin-sheet" role="dialog" aria-label="${escapeAttr(I18N.t('pin_label'))}">
      <div class="section-label pin-sheet__label">${escapeText(I18N.t('pin_label'))}</div>
      <div class="pin-sheet__title"><span class="italic">${meta}</span></div>
      <div class="pin-sheet__actions">
        <button class="pin-sheet__action" data-sheet-action="open" type="button">
          <span class="pin-sheet__icon">${pinIcon(15)}</span>
          <span class="pin-sheet__action-label">${escapeText(I18N.t('pin_open'))}</span>
        </button>
        <button class="pin-sheet__action" data-sheet-action="move" type="button">
          <span class="pin-sheet__icon">${pencilIcon(15)}</span>
          <span class="pin-sheet__action-label">${escapeText(I18N.t('pin_replace'))}</span>
        </button>
        <button class="pin-sheet__action" data-sheet-action="copy" type="button">
          <span class="pin-sheet__icon">${linkIcon(15)}</span>
          <span class="pin-sheet__action-label">${escapeText(I18N.t('pin_copy'))}</span>
        </button>
        <button class="pin-sheet__action pin-sheet__action--danger" data-sheet-action="remove" type="button">
          <span class="pin-sheet__icon">${trashIcon(15)}</span>
          <span class="pin-sheet__action-label">${escapeText(I18N.t('pin_remove'))}</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);

  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    sheet.remove();
    document.removeEventListener('keydown', onKey);
    PRESENCE._closePinSheet = null;
  }
  PRESENCE._closePinSheet = close;

  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) close();
  });
  document.addEventListener('keydown', onKey);

  sheet.querySelectorAll('[data-sheet-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const action = btn.getAttribute('data-sheet-action');
      if (action === 'open') {
        openPinInMaps(pin);
        close();
      } else if (action === 'move') {
        movePinFromSheet(btn);
      } else if (action === 'copy') {
        copyMapsLink(pin, btn);
      } else if (action === 'remove') {
        confirmRemove(btn);
      }
    });
  });
}

function openPinInMaps(pin) {
  if (!pin || typeof pin.lat !== 'number' || typeof pin.lng !== 'number') return;
  const lat = pin.lat;
  const lng = pin.lng;
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `geo:${lat},${lng}?q=${lat},${lng}`;
    return;
  }
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener');
}

function dropFromChip(el) {
  setBusy(el, true);
  geolocate(
    function (lat, lng) { saveAndRefresh(lat, lng); },
    function (msg) { setBusy(el, false); flashChip(el, msg); }
  );
}

function movePinFromSheet(btn) {
  setActionBusy(btn, true);
  geolocate(
    function (lat, lng) {
      saveAndRefresh(lat, lng, function () {
        if (PRESENCE._closePinSheet) PRESENCE._closePinSheet();
      });
    },
    function (msg) {
      setActionBusy(btn, false);
      flashAction(btn, msg);
    }
  );
}

function geolocate(onOk, onErr) {
  if (!navigator.geolocation) { onErr(I18N.t('pin_unavailable')); return; }
  navigator.geolocation.getCurrentPosition(
    function (pos) { onOk(pos.coords.latitude, pos.coords.longitude); },
    function (err) {
      const msg = err && err.code === err.PERMISSION_DENIED
        ? I18N.t('pin_denied')
        : I18N.t('pin_unavailable');
      onErr(msg);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function saveAndRefresh(lat, lng, onSaved) {
  // Optimistic update: flip the chip immediately, then confirm via API.
  // SignalR's Place/PinSet broadcast (echoed back to all clients including
  // this one) re-confirms the authoritative state, so we don't need to
  // re-query on success. On failure, revert locally and surface via chip.
  const prev = PRESENCE.pin;
  PRESENCE.pin = { lat: lat, lng: lng, setAt: new Date().toISOString(), nickname: PRESENCE.myNickname || null };
  if (PRESENCE.updatePinChip) PRESENCE.updatePinChip();
  if (onSaved) onSaved();
  AREYOUAT.setPlacePin(PRESENCE.place, PRESENCE.passphrase, lat, lng, PRESENCE.myNickname || null)
    .catch(function () {
      PRESENCE.pin = prev;
      if (PRESENCE.updatePinChip) PRESENCE.updatePinChip();
    });
}

function copyMapsLink(pin, btn) {
  const url = `https://www.google.com/maps?q=${pin.lat},${pin.lng}`;
  copyToClipboard(url).then(function () {
    flashAction(btn, I18N.t('pin_copied'));
  });
}

function confirmRemove(btn) {
  if (btn.__confirming) {
    btn.__confirming = false;
    // Optimistic clear: chip flips to empty immediately; API + SignalR confirm.
    const prev = PRESENCE.pin;
    PRESENCE.pin = null;
    if (PRESENCE.updatePinChip) PRESENCE.updatePinChip();
    if (PRESENCE._closePinSheet) PRESENCE._closePinSheet();
    AREYOUAT.setPlacePin(PRESENCE.place, PRESENCE.passphrase, null, null, PRESENCE.myNickname || null)
      .catch(function () {
        PRESENCE.pin = prev;
        if (PRESENCE.updatePinChip) PRESENCE.updatePinChip();
      });
    return;
  }
  btn.__confirming = true;
  btn.classList.add('pin-sheet__action--confirming');
  const label = btn.querySelector('.pin-sheet__action-label');
  const orig = label ? label.textContent : '';
  if (label) label.textContent = I18N.t('pin_remove_confirm');
  setTimeout(function () {
    if (!btn.__confirming) return;
    btn.__confirming = false;
    btn.classList.remove('pin-sheet__action--confirming');
    if (label) label.textContent = orig;
  }, 3000);
}

function setBusy(el, busy) {
  if (!el) return;
  if (busy) {
    el.classList.add('pin--busy');
    el.setAttribute('aria-busy', 'true');
    const label = el.querySelector('.pin__label');
    if (label) label.textContent = I18N.t('pin_locating');
  } else {
    el.classList.remove('pin--busy');
    el.removeAttribute('aria-busy');
  }
}

function flashChip(el, msg) {
  if (!el) return;
  const label = el.querySelector('.pin__label');
  if (label) {
    label.textContent = msg;
    setTimeout(function () { PRESENCE.query(); }, 1800);
  }
}

function setActionBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = busy;
  btn.classList.toggle('pin-sheet__action--busy', busy);
  if (busy) {
    const label = btn.querySelector('.pin-sheet__action-label');
    if (label) {
      btn.__origLabel = label.textContent;
      label.textContent = I18N.t('pin_locating');
    }
  }
}

function flashAction(btn, msg) {
  if (!btn) return;
  const label = btn.querySelector('.pin-sheet__action-label');
  const orig = btn.__origLabel || (label ? label.textContent : '');
  if (label) label.textContent = msg;
  btn.classList.add('pin-sheet__action--flash');
  setTimeout(function () {
    btn.disabled = false;
    btn.classList.remove('pin-sheet__action--busy');
    btn.classList.remove('pin-sheet__action--flash');
    if (label) label.textContent = orig;
    btn.__origLabel = null;
  }, 1400);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (resolve) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    resolve();
  });
}

function relativeTime(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!t || isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.round(diff / 1000);
  if (sec < 45) return I18N.t('pin_just_now');
  const min = Math.round(diff / 60000);
  if (min < 60) return I18N.t('pin_ago_min', { n: min });
  const hr = Math.round(diff / 3600000);
  if (hr < 24) return I18N.t('pin_ago_hr', { n: hr });
  const day = Math.round(diff / 86400000);
  return I18N.t('pin_ago_day', { n: day });
}

function pinIcon(size) {
  const s = size || 14;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
}

function pencilIcon(size) {
  const s = size || 14;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}

function linkIcon(size) {
  const s = size || 14;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

function trashIcon(size) {
  const s = size || 14;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`;
}

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
