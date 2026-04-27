window.PRESENCE = window.PRESENCE || {};

PRESENCE.pin = null;

PRESENCE.renderPinChip = function () {
  if (!PRESENCE.passphrase) return '';
  const pin = PRESENCE.pin;
  if (pin && typeof pin.lat === 'number' && typeof pin.lng === 'number') {
    return `
      <span class="pin-chip" data-pin-action="open" role="button" tabindex="0" aria-label="${escapeAttr(I18N.t('pin_open'))}" title="${escapeAttr(I18N.t('pin_open'))}">
        <span class="pin-chip__glyph">📍</span>
        <button class="pin-chip__edit" data-pin-action="replace" aria-label="${escapeAttr(I18N.t('pin_replace'))}" title="${escapeAttr(I18N.t('pin_replace'))}" type="button">✎</button>
      </span>
    `;
  }
  return `
    <button class="pin-chip pin-chip--empty" data-pin-action="drop" type="button" aria-label="${escapeAttr(I18N.t('pin_drop'))}">
      <span class="pin-chip__glyph">📍</span>
      <span class="pin-chip__add-label">${escapeText(I18N.t('pin_drop'))}</span>
    </button>
  `;
};

PRESENCE.mountPinChip = function () {
  document.querySelectorAll('[data-pin-action]').forEach(function (el) {
    if (el.__pinBound) return;
    el.__pinBound = true;
    const action = el.getAttribute('data-pin-action');
    if (action === 'open') {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-pin-action="replace"]')) return;
        openPinInMaps(PRESENCE.pin);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPinInMaps(PRESENCE.pin);
        }
      });
    } else if (action === 'replace' || action === 'drop') {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        dropMyPin(el);
      });
    }
  });
};

function openPinInMaps(pin) {
  if (!pin || typeof pin.lat !== 'number' || typeof pin.lng !== 'number') return;
  const lat = pin.lat;
  const lng = pin.lng;
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isMobile) {
    // geo: scheme is honored by Android Maps and iOS will fall back appropriately.
    window.location.href = `geo:${lat},${lng}?q=${lat},${lng}`;
    return;
  }
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener');
}

function dropMyPin(el) {
  if (!navigator.geolocation) {
    flashChip(el, I18N.t('pin_unavailable'));
    return;
  }
  setBusy(el, true);
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      AREYOUAT.setPlacePin(PRESENCE.place, PRESENCE.passphrase, lat, lng, PRESENCE.myNickname || null)
        .then(function () {
          PRESENCE.pin = { lat: lat, lng: lng, setAt: new Date().toISOString(), nickname: PRESENCE.myNickname || null };
          PRESENCE.query();
        })
        .catch(function () {
          setBusy(el, false);
          flashChip(el, I18N.t('pin_unavailable'));
        });
    },
    function (err) {
      setBusy(el, false);
      const msg = err && err.code === err.PERMISSION_DENIED ? I18N.t('pin_denied') : I18N.t('pin_unavailable');
      flashChip(el, msg);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function setBusy(el, busy) {
  if (!el) return;
  if (busy) {
    el.classList.add('pin-chip--busy');
    el.setAttribute('aria-busy', 'true');
    const label = el.querySelector('.pin-chip__add-label');
    if (label) label.textContent = I18N.t('pin_locating');
  } else {
    el.classList.remove('pin-chip--busy');
    el.removeAttribute('aria-busy');
  }
}

function flashChip(el, msg) {
  if (!el) return;
  const label = el.querySelector('.pin-chip__add-label');
  if (label) {
    label.textContent = msg;
    setTimeout(function () { PRESENCE.query(); }, 1800);
  } else {
    el.setAttribute('title', msg);
  }
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
