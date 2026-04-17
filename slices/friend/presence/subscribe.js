window.PRESENCE = window.PRESENCE || {};

PRESENCE.initBell = async function (bellBtn) {
  const storageKey = PRESENCE.storageKey + ':subscribed';
  const isSubscribed = localStorage.getItem(storageKey) === 'true';

  updateBell(bellBtn, isSubscribed);

  bellBtn.addEventListener('click', async function () {
    try {
      if (localStorage.getItem(storageKey) === 'true') {
        await unsubscribe(storageKey);
        updateBell(bellBtn, false);
      } else {
        await subscribe(storageKey);
        updateBell(bellBtn, true);
      }
    } catch (e) {
      console.warn('Push subscription failed', e);
    }
  });
};

async function subscribe(storageKey) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission denied');

  const reg = await navigator.serviceWorker.ready;

  const keyRes = await fetch(
    'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net/api/areyouat/vapid-public-key'
  );
  const { publicKey } = await keyRes.json();

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  await fetch(
    `https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net/api/areyouat/places/${encodeURIComponent(PRESENCE.place)}/subscribe`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magicword: PRESENCE.passphrase, subscription: subscription.toJSON() })
    }
  );

  localStorage.setItem(storageKey, 'true');
  localStorage.setItem(storageKey + ':endpoint', subscription.endpoint);
}

async function unsubscribe(storageKey) {
  const endpoint = localStorage.getItem(storageKey + ':endpoint');
  if (endpoint) {
    await fetch(
      `https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net/api/areyouat/places/${encodeURIComponent(PRESENCE.place)}/unsubscribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magicword: PRESENCE.passphrase, endpoint })
      }
    );
  }
  localStorage.removeItem(storageKey);
  localStorage.removeItem(storageKey + ':endpoint');
}

function updateBell(btn, subscribed) {
  btn.textContent = subscribed ? '🔔' : '🔕';
  btn.title = subscribed ? I18N.t('bell_on') : I18N.t('bell_off');
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
