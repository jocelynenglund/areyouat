window.PRESENCE = window.PRESENCE || {};

const STATUS_MAX = 30;

PRESENCE.renderStatus = function (entry, isSelf) {
  const raw = entry && entry.status ? String(entry.status) : '';
  if (isSelf) {
    if (raw) {
      return `<div class="pill-status pill-status--self" data-status-editor>\u201C${escapeHtml(raw)}\u201D</div>`;
    }
    return `<div class="pill-status pill-status--self pill-status--empty" data-status-editor>${escapeHtml(I18N.t('status_prompt'))}</div>`;
  }
  if (!raw) return '';
  return `<div class="pill-status">\u201C${escapeHtml(raw)}\u201D</div>`;
};

PRESENCE.mountStatusEditor = function () {
  const node = document.querySelector('[data-status-editor]');
  if (!node) return;
  node.addEventListener('click', function () { openEditor(node); });
};

function openEditor(node) {
  const current = node.classList.contains('pill-status--empty') ? '' : stripQuotes(node.textContent);
  const input = document.createElement('input');
  input.className = 'pill-status-input';
  input.type = 'text';
  input.maxLength = STATUS_MAX;
  input.value = current;
  input.placeholder = I18N.t('status_placeholder');
  input.setAttribute('aria-label', 'status');

  let settled = false;
  node.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  function commit() {
    if (settled) return;
    settled = true;
    const next = input.value.trim().slice(0, STATUS_MAX);
    if (next === current) {
      PRESENCE.query();
      return;
    }
    AREYOUAT.setStatus(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname, next)
      .then(function () { PRESENCE.query(); })
      .catch(function () { PRESENCE.query(); });
  }

  function revert() {
    if (settled) return;
    settled = true;
    PRESENCE.query();
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); revert(); }
  });
  input.addEventListener('blur', commit);
}

function stripQuotes(s) {
  if (!s) return '';
  return s.replace(/^[\u201C"]/, '').replace(/[\u201D"]$/, '');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
