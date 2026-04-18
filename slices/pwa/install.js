(function () {
  const segment = window.location.pathname.replace(/^\//, '').split('/')[0] || '';
  if (!segment || segment === 'about') return;

  const place = segment;
  const manifest = {
    id: '/' + place,
    name: 'är du på? – ' + place,
    short_name: place,
    description: 'see who\'s at ' + place + ' right now',
    start_url: '/' + place,
    scope: '/' + place,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAFAF7',
    theme_color: '#FAFAF7',
    icons: [
      { src: '/icons/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const blobUrl = URL.createObjectURL(blob);

  let link = document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = blobUrl;

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.setAttribute('content', place);
})();
