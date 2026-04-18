(function () {
  const DATA = window.KN_DATA && window.KN_DATA.data ? window.KN_DATA.data : {};
  const EVENTS = DATA.events || [];
  const DISTRICTS = DATA.districts || [];
  const GENRES = DATA.genres || [];

  const districtById = new Map(DISTRICTS.map(d => [d.id, d]));
  const genreById = new Map(GENRES.map(g => [g.id, g]));
  const eventById = new Map(EVENTS.map(e => [e.id, e]));
  const eventBySvId = new Map(EVENTS.map(e => [e.svId, e]));
  // Shared-URL lookup: accepts either English id or Swedish svId.
  function findEvent(anyId) {
    return eventById.get(anyId) || eventBySvId.get(anyId) || null;
  }

  const LS_FAVS = 'kn.favs.v1';
  const LS_SHOW = 'kn.view.v1';

  function loadFavs() {
    try {
      const raw = localStorage.getItem(LS_FAVS);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch (_) { return new Set(); }
  }
  function saveFavs() {
    localStorage.setItem(LS_FAVS, JSON.stringify(Array.from(favs)));
  }

  const favs = loadFavs();

  const state = {
    search: '',
    district: '',
    genre: '',
    english: false,
    wheelchair: false,
    late: false,
    view: localStorage.getItem(LS_SHOW) || 'all'
  };

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  function populateSelects() {
    const dSel = $('#district');
    DISTRICTS.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(d => {
      const o = document.createElement('option');
      o.value = d.id; o.textContent = d.name;
      dSel.appendChild(o);
    });
    const gSel = $('#genre');
    GENRES.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(g => {
      const o = document.createElement('option');
      o.value = g.id; o.textContent = g.name;
      gSel.appendChild(o);
    });
  }

  function firstProgramTime(e) {
    const p = (e.programItems || [])[0];
    if (!p) return '';
    if (p.startTime && p.endTime && p.startTime !== p.endTime) return p.startTime + '–' + p.endTime;
    return p.startTime || p.endTime || '';
  }

  function programTimeSpan(items) {
    const list = (items || []).filter(p => p.startTime || p.endTime);
    if (!list.length) return '';
    if (list.length === 1) return firstProgramTime({ programItems: list });
    const starts = list.map(p => p.startTime).filter(Boolean).sort();
    const ends = list.map(p => p.endTime).filter(Boolean).sort();
    const first = starts[0] || '';
    const last = ends[ends.length - 1] || '';
    if (first && last && first !== last) return `${first}–${last} · ${list.length} slots`;
    return `${list.length} slots`;
  }

  function accessibilityChips(acc) {
    const out = [];
    if (!acc) return out;
    if (acc.wheelchair) out.push({ cls: 'acc', text: '♿', title: 'Wheelchair accessible' });
    if (acc.hearingImpaired) out.push({ cls: 'acc', text: '🦻', title: 'Hearing support' });
    if (acc.visuallyImpaired) out.push({ cls: 'acc', text: '👁', title: 'Visual support' });
    if (acc.accessibleParking) out.push({ cls: 'acc', text: 'P♿', title: 'Accessible parking' });
    return out;
  }

  function hasTicket(e) {
    return (e.programItems || []).some(p => p.ticket);
  }

  function stripHtml(s) {
    return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  function matchesFilters(e) {
    if (state.view === 'fav' && !favs.has(e.id)) return false;
    if (state.district && String(e.districtId) !== state.district) return false;
    if (state.genre) {
      const gid = parseInt(state.genre, 10);
      if (!(e.genreIds || []).includes(gid)) return false;
    }
    if (state.english && !e.availableInEnglish) return false;
    if (state.wheelchair && !(e.accessibility && e.accessibility.wheelchair)) return false;
    if (state.late && !e.openAfterMidnight) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = [
        e.title, e.promoter, e.address, e.nearestStation,
        stripHtml(e.description), (e.additionalPromoters || []).join(' ')
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function render() {
    const list = $('#list');
    const filtered = EVENTS.filter(matchesFilters);

    $('#count').textContent = filtered.length + ' event' + (filtered.length === 1 ? '' : 's');
    $('#fav-count').textContent = favs.size;
    $('#fav-count-2').textContent = favs.size;
    const vt = $('#view-toggle');
    vt.textContent = state.view === 'fav' ? 'Favorites' : 'All';
    vt.setAttribute('aria-pressed', state.view === 'fav' ? 'true' : 'false');
    vt.classList.toggle('primary', state.view === 'fav');

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty">No events match.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(e => frag.appendChild(renderCard(e)));
    list.replaceChildren(frag);
  }

  function renderCard(e) {
    const card = document.createElement('article');
    card.className = 'card' + (favs.has(e.id) ? ' fav' : '');

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (e.thumbnail) thumb.style.backgroundImage = `url("${e.thumbnail}")`;
    card.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'body';
    const h = document.createElement('h3');
    const a = document.createElement('a');
    a.href = e.url || '#'; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = e.title || '(untitled)';
    h.appendChild(a);
    body.appendChild(h);

    const district = districtById.get(e.districtId);
    const time = programTimeSpan(e.programItems);
    const sub = document.createElement('div');
    sub.className = 'sub';
    const parts = [];
    if (time) parts.push(time);
    if (district) parts.push(district.name);
    if (e.nearestStation) parts.push('T: ' + e.nearestStation);
    if (e.promoter) parts.push(e.promoter);
    sub.textContent = parts.join(' · ');
    body.appendChild(sub);

    const chips = document.createElement('div');
    chips.className = 'chips';
    (e.genreIds || []).forEach(gid => {
      const g = genreById.get(gid);
      if (!g) return;
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = g.name;
      chips.appendChild(c);
    });
    if (e.availableInEnglish) {
      const c = document.createElement('span'); c.className = 'chip en'; c.textContent = 'EN'; chips.appendChild(c);
    }
    accessibilityChips(e.accessibility).forEach(info => {
      const c = document.createElement('span');
      c.className = 'chip ' + info.cls;
      c.textContent = info.text;
      c.title = info.title;
      chips.appendChild(c);
    });
    if (hasTicket(e)) {
      const c = document.createElement('span'); c.className = 'chip tix'; c.textContent = '🎫'; c.title = 'Ticket required'; chips.appendChild(c);
    }
    if (e.digital) {
      const c = document.createElement('span'); c.className = 'chip dig'; c.textContent = 'Online'; chips.appendChild(c);
    }
    if (e.openAfterMidnight) {
      const c = document.createElement('span'); c.className = 'chip late'; c.textContent = 'Late'; chips.appendChild(c);
    }
    body.appendChild(chips);

    const details = renderDetails(e);
    details.hidden = true;
    body.appendChild(details);

    card.appendChild(body);

    const star = document.createElement('button');
    star.className = 'star-btn' + (favs.has(e.id) ? ' on' : '');
    star.type = 'button';
    star.setAttribute('aria-label', favs.has(e.id) ? 'Remove favorite' : 'Add favorite');
    star.setAttribute('aria-pressed', favs.has(e.id) ? 'true' : 'false');
    star.textContent = favs.has(e.id) ? '★' : '☆';
    star.addEventListener('click', ev => { ev.stopPropagation(); toggleFav(e.id); });
    card.appendChild(star);

    card.addEventListener('click', ev => {
      if (ev.target.closest('a, button')) return;
      details.hidden = !details.hidden;
      card.classList.toggle('open', !details.hidden);
    });

    return card;
  }

  function renderDetails(e) {
    const wrap = document.createElement('div');
    wrap.className = 'details';

    if (e.description) {
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.innerHTML = sanitizeHtml(e.description);
      wrap.appendChild(desc);
    }
    if (e.additionalInformation) {
      const info = document.createElement('div');
      info.className = 'addinfo';
      info.textContent = e.additionalInformation;
      wrap.appendChild(info);
    }

    const items = e.programItems || [];
    if (items.length > 0) {
      const list = document.createElement('ul');
      list.className = 'program';
      items.forEach(p => {
        const li = document.createElement('li');
        const t = document.createElement('span');
        t.className = 'program-time';
        t.textContent = (p.startTime && p.endTime && p.startTime !== p.endTime)
          ? `${p.startTime}–${p.endTime}`
          : (p.startTime || p.endTime || '');
        li.appendChild(t);
        const ttl = document.createElement('span');
        ttl.className = 'program-title';
        ttl.textContent = p.title || '';
        if (p.ticket) ttl.textContent += '  🎫';
        li.appendChild(ttl);
        if (p.description) {
          const d = document.createElement('div');
          d.className = 'program-desc';
          d.textContent = p.description;
          li.appendChild(d);
        }
        list.appendChild(li);
      });
      wrap.appendChild(list);
    }

    if (e.address || e.position) {
      const a = document.createElement('a');
      a.className = 'map-link';
      a.target = '_blank'; a.rel = 'noopener';
      const q = e.position && e.position.lat
        ? `${e.position.lat},${e.position.lng}`
        : encodeURIComponent(e.address || '');
      a.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
      a.textContent = '📍 ' + (e.address || 'Open on map');
      wrap.appendChild(a);
    }

    if (e.additionalPromoters && e.additionalPromoters.length) {
      const p = document.createElement('div');
      p.className = 'addinfo';
      p.textContent = 'With: ' + e.additionalPromoters.join(', ');
      wrap.appendChild(p);
    }

    if (e.photographers && e.photographers.length) {
      const p = document.createElement('div');
      p.className = 'muted small';
      p.textContent = 'Photo: ' + e.photographers.join(', ');
      wrap.appendChild(p);
    }

    return wrap;
  }

  function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allowed = new Set(['P', 'BR', 'STRONG', 'EM', 'B', 'I', 'UL', 'OL', 'LI', 'A']);
    function walk(node) {
      const children = Array.from(node.childNodes);
      for (const c of children) {
        if (c.nodeType === 1) {
          if (!allowed.has(c.tagName)) {
            const text = document.createTextNode(c.textContent);
            c.replaceWith(text);
            continue;
          }
          for (const attr of Array.from(c.attributes)) {
            if (c.tagName === 'A' && (attr.name === 'href' || attr.name === 'title')) continue;
            c.removeAttribute(attr.name);
          }
          if (c.tagName === 'A') {
            c.setAttribute('target', '_blank');
            c.setAttribute('rel', 'noopener');
          }
          walk(c);
        }
      }
    }
    walk(doc.body);
    return doc.body.innerHTML;
  }

  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    saveFavs();
    render();
    updateSheet();
  }

  // ---- Export sheet ----

  function shareUrl(ids) {
    const base = 'https://kulturnattstockholm.se/delad-kulturnatt/?lang=en&ids=';
    return base + ids.join(',');
  }

  function favIds() {
    // Share URL expects Swedish IDs (svId) — that's what the official
    // delad-kulturnatt page matches against.
    return EVENTS.filter(e => favs.has(e.id)).map(e => e.svId);
  }

  function favsForRoute() {
    return EVENTS
      .filter(e => favs.has(e.id) && e.position && typeof e.position.lat === 'number')
      .map(e => {
        const first = (e.programItems || []).find(p => p.startTime) || {};
        return { e, time: first.startTime || '99:99', lat: e.position.lat, lng: e.position.lng };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function walkingRouteUrl() {
    const stops = favsForRoute();
    if (!stops.length) return null;
    if (stops.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${stops[0].lat},${stops[0].lng}`;
    }
    // /maps/dir/A/B/C/... format accepts many stops; !3e2 = walking mode.
    const points = stops.map(s => `${s.lat},${s.lng}`).join('/');
    return `https://www.google.com/maps/dir/${points}/data=!4m2!4m1!3e2`;
  }

  function updateSheet() {
    const ids = favIds();
    const url = shareUrl(ids);
    $('#share-url').value = ids.length ? url : '';
    $('#open-share').href = ids.length ? url : '#';
    $('#open-share').setAttribute('aria-disabled', ids.length ? 'false' : 'true');
    const hasAny = ids.length > 0;
    ['copy-share', 'download-ics', 'download-json', 'copy-titles'].forEach(id => {
      const b = document.getElementById(id);
      b.disabled = !hasAny;
    });

    const routeUrl = walkingRouteUrl();
    const stops = favsForRoute();
    const routeBtn = $('#open-route');
    const routeMeta = $('#route-meta');
    if (routeUrl) {
      routeBtn.href = routeUrl;
      routeBtn.classList.remove('btn-disabled');
      routeBtn.removeAttribute('aria-disabled');
    } else {
      routeBtn.href = '#';
      routeBtn.classList.add('btn-disabled');
      routeBtn.setAttribute('aria-disabled', 'true');
    }
    const missing = EVENTS.filter(e => favs.has(e.id)).length - stops.length;
    if (stops.length >= 2) {
      routeMeta.textContent = `${stops.length} stops, ordered by start time` + (missing ? ` (${missing} skipped, no coords)` : '');
    } else if (stops.length === 1) {
      routeMeta.textContent = 'Only one stop — opens as a pin';
    } else {
      routeMeta.textContent = 'Star a few events to build a route.';
    }
  }

  function openSheet(focusSection) {
    $('#backdrop').hidden = false;
    $('#sheet').hidden = false;
    updateSheet();
    if (focusSection === 'import') {
      // Defer so sheet is visible before scrolling
      requestAnimationFrame(() => {
        const ta = $('#import-urls');
        if (!ta) return;
        ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
        ta.focus();
        tryPrefillFromClipboard(ta);
      });
    }
  }

  async function tryPrefillFromClipboard(ta) {
    if (ta.value) return;
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && /[?&]ids=\d/.test(text)) {
        ta.value = text.trim();
        const msg = $('#import-msg');
        if (msg) msg.textContent = 'Pasted from clipboard — click "Add to favorites".';
      }
    } catch (_) { /* no permission — ignore */ }
  }
  function closeSheet() {
    $('#backdrop').hidden = true;
    $('#sheet').hidden = true;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
    return Promise.resolve();
  }

  function flashButton(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = orig; }, 1200);
  }

  function icsEscape(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtICSLocal(dateStr, hhmm) {
    // dateStr: YYYY-MM-DD, hhmm: HH:MM; produce YYYYMMDDTHHMMSS (floating local time)
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = hhmm.split(':').map(Number);
    return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  }
  function buildICS(date) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//kn-planner//EN',
      'CALSCALE:GREGORIAN'
    ];
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    EVENTS.filter(e => favs.has(e.id)).forEach(e => {
      const items = (e.programItems && e.programItems.length) ? e.programItems : [{ startTime: '18:00', endTime: '00:00' }];
      items.forEach((p, idx) => {
        const start = p.startTime || '18:00';
        let end = p.endTime || p.startTime || '23:59';
        const [sh, sm] = start.split(':').map(Number);
        let [eh, em] = end.split(':').map(Number);
        let endDate = date;
        // If end <= start, spans to next day
        if (eh * 60 + em <= sh * 60 + sm) {
          const d = new Date(date + 'T00:00');
          d.setDate(d.getDate() + 1);
          endDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          if (eh === 0 && em === 0) { eh = 0; em = 0; }
        }
        const uid = `kn-${e.id}-${idx}@kulturnattstockholm.se`;
        const title = p.title && p.title !== e.title ? `${e.title} — ${p.title}` : e.title;
        const loc = [e.address, e.nearestStation ? '(T: ' + e.nearestStation + ')' : ''].filter(Boolean).join(' ');
        const desc = [stripHtml(e.description), e.promoter ? 'By: ' + e.promoter : '', e.url].filter(Boolean).join('\n\n');
        lines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${fmtICSLocal(date, start)}`,
          `DTEND:${fmtICSLocal(endDate, `${pad(eh)}:${pad(em)}`)}`,
          `SUMMARY:${icsEscape(title)}`,
          `LOCATION:${icsEscape(loc)}`,
          `DESCRIPTION:${icsEscape(desc)}`,
          `URL:${e.url || ''}`,
          'END:VEVENT'
        );
      });
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function extractIdsFromUrls(text) {
    const ids = new Set();
    const re = /[?&]ids=([0-9,]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      m[1].split(',').forEach(s => {
        const n = parseInt(s, 10);
        if (!isNaN(n)) ids.add(n);
      });
    }
    // Also accept bare comma-separated list of IDs
    if (ids.size === 0) {
      text.split(/[\s,]+/).forEach(s => {
        const n = parseInt(s, 10);
        if (!isNaN(n) && s.match(/^\d+$/)) ids.add(n);
      });
    }
    return Array.from(ids);
  }

  // ---- Wiring ----

  function bindFilters() {
    $('#search').addEventListener('input', e => { state.search = e.target.value.trim(); render(); });
    $('#district').addEventListener('change', e => { state.district = e.target.value; render(); });
    $('#genre').addEventListener('change', e => { state.genre = e.target.value; render(); });
    $('#english').addEventListener('change', e => { state.english = e.target.checked; render(); });
    $('#wheelchair').addEventListener('change', e => { state.wheelchair = e.target.checked; render(); });
    $('#late').addEventListener('change', e => { state.late = e.target.checked; render(); });
    $('#clear-filters').addEventListener('click', () => {
      state.search = ''; state.district = ''; state.genre = '';
      state.english = false; state.wheelchair = false; state.late = false;
      $('#search').value = ''; $('#district').value = ''; $('#genre').value = '';
      $('#english').checked = false; $('#wheelchair').checked = false; $('#late').checked = false;
      render();
    });
    $('#view-toggle').addEventListener('click', () => {
      state.view = state.view === 'fav' ? 'all' : 'fav';
      localStorage.setItem(LS_SHOW, state.view);
      render();
    });
  }

  function bindSheet() {
    $('#export-btn').addEventListener('click', () => openSheet());
    $('#import-btn').addEventListener('click', () => openSheet('import'));
    $('#sheet-close').addEventListener('click', closeSheet);
    $('#backdrop').addEventListener('click', closeSheet);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
    });

    $('#copy-share').addEventListener('click', e => {
      const url = $('#share-url').value;
      if (!url) return;
      copyText(url).then(() => flashButton(e.target, 'Copied!'));
    });

    $('#download-ics').addEventListener('click', e => {
      const ids = favIds();
      if (!ids.length) return;
      const date = $('#kn-date').value || '2026-04-25';
      const ics = buildICS(date);
      download(`kulturnatt-${date}.ics`, ics, 'text/calendar;charset=utf-8');
      flashButton(e.target, 'Downloaded');
    });

    $('#download-json').addEventListener('click', e => {
      const payload = EVENTS.filter(ev => favs.has(ev.id));
      download('kulturnatt-favorites.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
      flashButton(e.target, 'Downloaded');
    });

    $('#copy-titles').addEventListener('click', e => {
      const lines = EVENTS.filter(ev => favs.has(ev.id)).map(ev => {
        const d = districtById.get(ev.districtId);
        const t = firstProgramTime(ev);
        return `• ${ev.title}${t ? ' (' + t + ')' : ''}${d ? ' — ' + d.name : ''}\n  ${ev.url}`;
      });
      copyText(lines.join('\n\n')).then(() => flashButton(e.target, 'Copied!'));
    });

    $('#import-go').addEventListener('click', () => {
      const text = $('#import-urls').value;
      const ids = extractIdsFromUrls(text);
      let added = 0, unknown = 0;
      ids.forEach(id => {
        const ev = findEvent(id);
        if (!ev) { unknown++; return; }
        if (!favs.has(ev.id)) { favs.add(ev.id); added++; }
      });
      saveFavs();
      const parts = [];
      parts.push(`Found ${ids.length} id${ids.length === 1 ? '' : 's'}`);
      if (added) parts.push(`${added} added`);
      if (unknown) parts.push(`${unknown} unknown`);
      $('#import-msg').textContent = parts.join(' · ');
      $('#import-urls').value = '';
      render();
      updateSheet();
    });

    $('#clear-favs').addEventListener('click', () => {
      if (!favs.size) return;
      if (!confirm(`Clear all ${favs.size} favorite${favs.size === 1 ? '' : 's'}?`)) return;
      favs.clear();
      saveFavs();
      render();
      updateSheet();
    });
  }

  // Init
  populateSelects();
  bindFilters();
  bindSheet();
  render();

  // If URL has ?ids= on load, seed favorites once (accepts en or sv IDs).
  const urlIds = extractIdsFromUrls(location.search);
  if (urlIds.length) {
    let added = 0;
    urlIds.forEach(id => {
      const ev = findEvent(id);
      if (ev && !favs.has(ev.id)) { favs.add(ev.id); added++; }
    });
    if (added) { saveFavs(); render(); }
  }
})();
