window.BRAND = (function () {
  function mark(opts) {
    opts = opts || {};
    const size = opts.size || 22;
    return `
      <svg class="brand-svg" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
        <circle class="brand-ring brand-ring--outer" cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
        <circle class="brand-ring brand-ring--inner" cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
        <circle class="mark-core" cx="16" cy="16" r="4" fill="currentColor"/>
      </svg>
    `;
  }

  function hydrate() {
    document.querySelectorAll('[data-brand-mark]').forEach(function (el) {
      const size = parseInt(el.getAttribute('data-brand-mark'), 10) || undefined;
      el.innerHTML = mark(size ? { size: size } : {});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }

  return { mark: mark, hydrate: hydrate };
})();
