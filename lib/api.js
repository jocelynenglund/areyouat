window.AREYOUAT = window.AREYOUAT || {};

const API_BASE = window.AREYOUAT.apiBase || 'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net';

window.AREYOUAT.getPresenceToday = async function(place, passphrase) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/today`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase })
  });
  if (!res.ok) throw new Error('Failed to get presence');
  return res.json();
};

window.AREYOUAT.announcePresence = async function(place, passphrase, nickname) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/announce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase, nickname })
  });
  if (!res.ok) throw new Error('Failed to announce');
  return res.json();
};
