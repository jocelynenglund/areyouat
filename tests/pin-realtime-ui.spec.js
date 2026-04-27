const { test, expect, chromium } = require('@playwright/test');

test.setTimeout(60000);

// B watches a place. A drops/moves/clears a pin via the API. B's pin chip
// re-renders via SignalR push, no manual reload.
test('pin chip re-renders on receiving tab through drop → move → clear', async () => {
  const place = '__pin_visual_' + Date.now();
  const pp = 'pinvisual';
  const url = `https://rdp.itsybit.se/${place}?magicword=${pp}`;
  const apiBase = 'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net/api/areyouat';

  const browser = await chromium.launch();
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  for (const [n, p] of [['A', a], ['B', b]]) {
    p.on('pageerror', e => console.log(`[${n} PAGEERROR]`, e.message));
    p.on('console', m => { if (m.type() === 'error') console.log(`[${n} ERR]`, m.text()); });
  }

  await b.goto(url);
  await b.waitForLoadState('networkidle');
  await b.waitForFunction(() => window.PRESENCE && window.PRESENCE.realtime, null, { timeout: 8000 });
  await b.waitForTimeout(2500);
  await a.goto(url);
  await a.waitForLoadState('networkidle');
  await a.waitForFunction(() => window.PRESENCE && window.PRESENCE.realtime, null, { timeout: 8000 });
  await a.waitForTimeout(1500);

  async function postPin(lat, lng) {
    return a.evaluate(async ({ apiBase, place, pp, lat, lng }) => {
      const r = await fetch(`${apiBase}/places/${encodeURIComponent(place)}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magicword: pp, lat, lng, nickname: 'A-tester' }),
      });
      return r.status;
    }, { apiBase, place, pp, lat, lng });
  }

  // 1. Baseline: empty chip on B.
  await expect(b.locator('button.pin.pin--empty').first()).toBeVisible({ timeout: 5000 });
  console.log('1/4 B: empty (baseline)');

  // 2. Drop: A POSTs a pin → B's chip flips to set.
  expect(await postPin(59.3293, 18.0686)).toBe(200);
  await expect(b.locator('button.pin.pin--set').first()).toBeVisible({ timeout: 6000 });
  console.log('2/4 B: set after A drops');

  // 3. Move: A re-POSTs new coords → B's chip stays set (and PRESENCE.pin
  //    coords on B should reflect the new value).
  expect(await postPin(60.0000, 18.0000)).toBe(200);
  await b.waitForTimeout(1500);
  const movedPin = await b.evaluate(() => window.PRESENCE.pin);
  console.log('3/4 B PRESENCE.pin after move:', JSON.stringify(movedPin));
  expect(movedPin).toMatchObject({ lat: 60.0000, lng: 18.0000 });

  // 4. Clear: A POSTs lat:null lng:null → B's chip flips back to empty.
  expect(await postPin(null, null)).toBe(200);
  await expect(b.locator('button.pin.pin--empty').first()).toBeVisible({ timeout: 6000 });
  console.log('4/4 B: empty after A clears');

  await browser.close();
});
