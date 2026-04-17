window.PRESENCE = window.PRESENCE || {};

PRESENCE.openShare = function () {
  const url = buildShareUrl();
  const sheet = document.createElement('div');
  sheet.className = 'share-sheet-backdrop';
  sheet.innerHTML = `
    <div class="share-sheet">
      <div class="section-label share-sheet__label">${I18N.t('share')}</div>
      <div class="share-sheet__title">
        <span class="italic">${I18N.t('share_title')}</span>
      </div>
      <div class="share-sheet__url">
        <div class="share-sheet__url-text">${url}</div>
        <button class="share-sheet__copy-btn" id="share-copy-btn">${I18N.t('share_copy')}</button>
      </div>
      <div class="share-sheet__targets">
        <a class="share-sheet__target" id="share-sms" href="sms:?&body=${encodeURIComponent(url)}">SMS</a>
        <a class="share-sheet__target" id="share-whatsapp" href="https://wa.me/?text=${encodeURIComponent(url)}" target="_blank" rel="noopener">WHATSAPP</a>
        <a class="share-sheet__target" id="share-email" href="mailto:?body=${encodeURIComponent(url)}">EMAIL</a>
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
    copyToClipboard(url).then(function () {
      copyBtn.textContent = I18N.t('share_copied');
      setTimeout(function () { copyBtn.textContent = I18N.t('share_copy'); }, 1600);
    });
  });

  const nativeBtn = sheet.querySelector('#share-native');
  if (navigator.share) {
    nativeBtn.addEventListener('click', function () {
      navigator.share({ title: I18N.t('app_title'), url: url }).catch(function () {});
    });
  } else {
    nativeBtn.addEventListener('click', function () {
      copyToClipboard(url).then(function () {
        nativeBtn.textContent = I18N.t('share_copied');
        setTimeout(closeShare, 900);
      });
    });
  }

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
