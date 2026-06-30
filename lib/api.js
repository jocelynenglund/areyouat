window.AREYOUAT = window.AREYOUAT || {};

// When served from localhost (dev / playwright), talk to the local
// event-store-api. Anywhere else (prod, deployed site), talk to Azure.
// Override either by setting window.AREYOUAT.apiBase before this script loads.
const API_BASE = window.AREYOUAT.apiBase
  ?? ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5199'
      : 'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net');
window.AREYOUAT.apiBase = API_BASE;

window.AREYOUAT.getPresenceToday = async function(place, passphrase) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/today`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase })
  });
  if (!res.ok) throw new Error('Failed to get presence');
  return res.json();
};

window.AREYOUAT.announcePresence = async function(place, passphrase, nickname) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/announce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname })
  });
  if (!res.ok) throw new Error('Failed to announce');
  return res.json();
};

window.AREYOUAT.leavePresence = async function(place, passphrase, nickname) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname })
  });
  if (!res.ok) throw new Error('Failed to leave');
};

window.AREYOUAT.setEta = async function(place, passphrase, nickname, minutes) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/eta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname, minutes })
  });
  if (!res.ok) throw new Error('Failed to set eta');
  return res.json();
};

window.AREYOUAT.cancelEta = async function(place, passphrase, nickname) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/eta/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname })
  });
  if (!res.ok) throw new Error('Failed to cancel eta');
  return res.json();
};

window.AREYOUAT.setSpirit = async function(place, passphrase, nickname, note) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/spirit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname, note: note || null })
  });
  if (!res.ok) throw new Error('Failed to set spirit');
  return res.json();
};

window.AREYOUAT.cancelSpirit = async function(place, passphrase, nickname) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/spirit/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname })
  });
  if (!res.ok) throw new Error('Failed to cancel spirit');
  return res.json();
};

window.AREYOUAT.setLeaving = async function(place, passphrase, nickname, minutes) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/leaving`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname, minutes })
  });
  if (!res.ok) throw new Error('Failed to set leaving');
  return res.json();
};

window.AREYOUAT.cancelLeaving = async function(place, passphrase, nickname) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/leaving/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname })
  });
  if (!res.ok) throw new Error('Failed to cancel leaving');
  return res.json();
};

window.AREYOUAT.getEvents = async function(place, passphrase) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase })
  });
  if (!res.ok) throw new Error('Failed to get events');
  return res.json();
};

window.AREYOUAT.setPlacePin = async function(place, passphrase, lat, lng, nickname) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, lat, lng, nickname: nickname || null })
  });
  if (!res.ok) throw new Error('Failed to set pin');
  return res.json();
};

window.AREYOUAT.setStatus = async function(place, passphrase, nickname, status) {
  const res = await fetch(`${API_BASE}/api/areyouat/places/${encodeURIComponent(place)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magicword: passphrase, nickname, status })
  });
  if (!res.ok) throw new Error('Failed to set status');
  return res.json();
};
