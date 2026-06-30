window.PRESENCE = window.PRESENCE || {};

PRESENCE.openShare = function () {
  const url = buildShareUrl();
  const state = (PRESENCE.readTodayCache && PRESENCE.readTodayCache()) || {};
  const summary = buildSummary(state);
  const shareBody = summary ? summary + '\n\n' + url : url;

  const sheet = document.createElement('div');
  sheet.className = 'share-sheet-backdrop';
  sheet.innerHTML = `
    <div class="share-sheet">
      <div class="section-label share-sheet__label">${I18N.t('share')}</div>
      <div class="share-sheet__title">
        <span class="italic">${I18N.t('share_title')}</span>
      </div>

      <div class="share-card" id="share-card">
        <div class="share-card__loading">${I18N.t('share_card_building')}</div>
      </div>

      <div class="share-sheet__url">
        <div class="share-sheet__url-text">${url}</div>
        <button class="share-sheet__copy-btn" id="share-copy-btn">${I18N.t('share_copy')}</button>
      </div>

      <button class="share-sheet__image-btn" id="share-image-btn" disabled>${I18N.t('share_card_action')}</button>

      <div class="share-sheet__targets">
        <a class="share-sheet__target" id="share-sms" href="sms:?&body=${encodeURIComponent(shareBody)}">SMS</a>
        <a class="share-sheet__target" id="share-whatsapp" href="https://wa.me/?text=${encodeURIComponent(shareBody)}" target="_blank" rel="noopener">WHATSAPP</a>
        <a class="share-sheet__target" id="share-email" href="mailto:?body=${encodeURIComponent(shareBody)}">EMAIL</a>
        <button class="share-sheet__target" id="share-native">MORE</button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);

  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) closeShare();
  });

  const copyBtn = sheet.querySelector('#share-copy-btn');
  copyBtn.addEventListener('click', function () {
    copyToClipboard(shareBody).then(function () {
      copyBtn.textContent = I18N.t('share_copied');
      setTimeout(function () { copyBtn.textContent = I18N.t('share_copy'); }, 1600);
    });
  });

  // Render the room-state card off-thread, then wire up image sharing once the
  // PNG blob exists. Until then the image button stays disabled and the card
  // area shows a building hint.
  let cardFile = null;
  const cardHost = sheet.querySelector('#share-card');
  const imageBtn = sheet.querySelector('#share-image-btn');

  renderRoomCard(state, url).then(function (blob) {
    if (!blob || !cardHost.isConnected) return;
    const objUrl = URL.createObjectURL(blob);
    cardHost.innerHTML = `<img class="share-card__img" alt="" src="${objUrl}">`;
    cardFile = new File([blob], shareFileName(), { type: 'image/png' });
    imageBtn.disabled = false;
  }).catch(function () {
    // Card failed (e.g. no canvas / font issue) — drop the card affordance,
    // text sharing still works fine.
    if (cardHost.isConnected) cardHost.remove();
    imageBtn.remove();
  });

  function shareImage() {
    if (cardFile && navigator.canShare && navigator.canShare({ files: [cardFile] })) {
      navigator.share({ files: [cardFile], text: summary, url: url }).catch(function () {});
    } else if (cardFile) {
      // Desktop / no file-share: download the PNG so it can be attached manually.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(cardFile);
      a.download = cardFile.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }
  imageBtn.addEventListener('click', shareImage);

  const nativeBtn = sheet.querySelector('#share-native');
  nativeBtn.addEventListener('click', function () {
    // Prefer sharing the card + text + link together; fall back to text+url,
    // then to copy.
    if (cardFile && navigator.canShare && navigator.canShare({ files: [cardFile] })) {
      navigator.share({ files: [cardFile], text: summary, url: url }).catch(function () {});
    } else if (navigator.share) {
      navigator.share({ title: I18N.t('app_title'), text: summary, url: url }).catch(function () {});
    } else {
      copyToClipboard(shareBody).then(function () {
        nativeBtn.textContent = I18N.t('share_copied');
        setTimeout(closeShare, 900);
      });
    }
  });

  function closeShare() {
    sheet.remove();
  }
  PRESENCE._closeShare = closeShare;
};

function buildShareUrl() {
  const origin = window.location.origin;
  const place = encodeURIComponent(PRESENCE.place || '');
  const mw = encodeURIComponent(PRESENCE.passphrase || '');
  return `${origin}/${place}?magicword=${mw}`;
}

function shareFileName() {
  const place = (PRESENCE.place || 'arduppa').replace(/[^a-z0-9_-]/gi, '') || 'arduppa';
  return place + '.png';
}

// Plain-text snapshot of the room — travels in the share payload's `text` and
// is prepended to SMS/WhatsApp/email bodies and the copy action.
function buildSummary(state) {
  const place = PRESENCE.place || '';
  const here = (state.entries || []).length;
  const etas = (state.etas || []).length;
  const spirits = (state.spirits || []).length;
  const lines = [];
  if (here > 0) {
    lines.push(I18N.t('summary_here_at', { n: here, place: place }));
    const names = (state.entries || []).map(function (e) { return e.nickname; }).slice(0, 6).join(' · ');
    if (names) lines.push(names);
  } else {
    lines.push(I18N.t('card_nobody_here'));
  }
  if (etas > 0) lines.push('→ ' + I18N.t('summary_on_the_way', { n: etas }));
  if (spirits > 0) lines.push('💙 ' + I18N.t('summary_in_spirit', { n: spirits }));
  return lines.join('\n');
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

// ---- Room-state share card (canvas → PNG) -------------------------------
// Zero-dependency "screen grab": a designed card drawn with the app's own
// fonts and palette (read live from CSS custom properties, so it matches the
// active theme), rather than a literal DOM screenshot (which would need an
// extra library this project forbids).

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (_) { return fallback; }
}

function ensureCardFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load('italic 130px "Instrument Serif"'),
    document.fonts.load('400 130px "Instrument Serif"'),
    document.fonts.load('500 32px "Inter Tight"'),
    document.fonts.load('600 64px "Inter Tight"'),
    document.fonts.load('400 28px "JetBrains Mono"')
  ]).then(function () { return document.fonts.ready; }).catch(function () {});
}

function canvasToBlob(canvas) {
  return new Promise(function (resolve) {
    if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
    else resolve(null);
  });
}

function renderRoomCard(state, url) {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('no 2d context'));

  return ensureCardFonts().then(function () {
    const bg = cssVar('--bg', '#FAFAF7');
    const ink = cssVar('--ink', '#1A1A18');
    const inkSoft = cssVar('--ink-soft', '#86867E');
    const inkFaint = cssVar('--ink-faint', '#C4C4BC');
    const pillBg = cssVar('--accent-soft', '#EDEDE6');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const M = 84;
    const maxW = W - M * 2;
    let y = 150;

    // Brand label, letter-spaced.
    ctx.fillStyle = inkSoft;
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.font = '500 28px "Inter Tight"';
    ctx.fillText((I18N.t('app_title') || 'är du på?').toUpperCase(), M, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // Place name, big serif italic.
    y += 150;
    ctx.fillStyle = ink;
    ctx.font = 'italic 132px "Instrument Serif"';
    ctx.fillText(truncToWidth(ctx, '/' + (PRESENCE.place || ''), maxW), M, y);

    // Headline count.
    const here = (state.entries || []).length;
    y += 120;
    ctx.fillStyle = ink;
    ctx.font = '400 96px "Instrument Serif"';
    if (here > 0) {
      const num = String(here);
      ctx.fillText(num, M, y);
      const numW = ctx.measureText(num).width;
      ctx.fillStyle = inkSoft;
      ctx.font = '400 56px "Instrument Serif"';
      ctx.fillText('  ' + I18N.t('share_card_here'), M + numW, y);
    } else {
      ctx.fillStyle = inkSoft;
      ctx.font = 'italic 56px "Instrument Serif"';
      ctx.fillText(I18N.t('card_nobody_here'), M, y);
    }

    // Rule.
    y += 52;
    ctx.strokeStyle = inkFaint;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(W - M, y);
    ctx.stroke();
    y += 70;

    // Present names as pills.
    if (here > 0) {
      const names = (state.entries || []).map(function (e) { return e.nickname; });
      y = drawPills(ctx, names, M, y, maxW, { bg: pillBg, ink: ink, max: 9 });
      y += 24;
    }

    // On the way.
    const etas = (state.etas || []);
    if (etas.length > 0) {
      ctx.fillStyle = inkSoft;
      ctx.font = '500 34px "Inter Tight"';
      const etaNames = etas.map(function (e) { return e.nickname; }).slice(0, 5).join(', ');
      const line = '→ ' + I18N.t('summary_on_the_way', { n: etas.length }) + (etaNames ? ': ' + etaNames : '');
      ctx.fillText(truncToWidth(ctx, line, maxW), M, y + 36);
      y += 76;
    }

    // In spirit.
    const spirits = (state.spirits || []);
    if (spirits.length > 0) {
      ctx.fillStyle = inkSoft;
      ctx.font = '500 34px "Inter Tight"';
      const sNames = spirits.map(function (e) { return e.nickname; }).slice(0, 5).join(', ');
      const line = '💙 ' + I18N.t('summary_in_spirit', { n: spirits.length }) + (sNames ? ': ' + sNames : '');
      ctx.fillText(truncToWidth(ctx, line, maxW), M, y + 36);
      y += 76;
    }

    // Footer: the link in mono, pinned near the bottom.
    ctx.fillStyle = inkSoft;
    ctx.font = '400 30px "JetBrains Mono"';
    const shortUrl = url.replace(/^https?:\/\//, '');
    ctx.fillText(truncToWidth(ctx, shortUrl, maxW), M, H - 90);

    return canvasToBlob(canvas);
  });
}

function truncToWidth(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

// Flow names left-to-right into rounded pills, wrapping rows. Caps at `max`
// names and appends a "+N" overflow pill so the card never runs off the edge.
function drawPills(ctx, names, x, startY, maxW, opts) {
  const padX = 28;
  const h = 70;
  const gap = 18;
  const rowGap = 18;
  ctx.font = '500 34px "Inter Tight"';

  const overflow = names.length - opts.max;
  const shown = overflow > 0 ? names.slice(0, opts.max) : names;
  const chips = shown.slice();
  if (overflow > 0) chips.push('+' + overflow);

  let cx = x;
  let cy = startY;
  for (let i = 0; i < chips.length; i++) {
    const label = chips[i];
    const w = Math.ceil(ctx.measureText(label).width) + padX * 2;
    if (cx + w > x + maxW && cx > x) {
      cx = x;
      cy += h + rowGap;
    }
    roundRect(ctx, cx, cy, w, h, 8);
    ctx.fillStyle = opts.bg;
    ctx.fill();
    ctx.fillStyle = opts.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx + padX, cy + h / 2 + 2);
    ctx.textBaseline = 'alphabetic';
    cx += w + gap;
  }
  return cy + h;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
