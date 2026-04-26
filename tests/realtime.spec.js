const { test, expect, chromium } = require('@playwright/test');

test.setTimeout(120000);

// Two-tab SignalR realtime test using the ?magicword= auto-login path.
// This is the user-facing flow that was reported flaky: open two tabs with
// the magic-word URL, announce on one, the other should refresh instantly.
//
// We use separate BrowserContexts so each tab has independent localStorage
// (so they can hold different identities).
test('SignalR refresh via ?magicword= auto-login: B sees A announce within 5s', async () => {
  const place = 'hemma';
  const pp = 'vikinghus';
  const url = `https://rdp.itsybit.se/${place}?magicword=${pp}`;

  const browser = await chromium.launch();
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  for (const [name, p] of [['A', a], ['B', b]]) {
    p.on('pageerror', e => console.log(`[${name} PAGEERROR]`, e.message));
    p.on('console', m => { if (m.type() === 'error') console.log(`[${name} ERR]`, m.text()); });
  }

  // Each tab needs an identity. Set one up via the manual flow first so they
  // both have a stored nickname; subsequent navigations to ?magicword= will
  // skip the name prompt and land on the populated screen. After this setup
  // we leave on both, then re-test the live-update path.
  async function setupIdentity(page, nick) {
    await page.goto('https://rdp.itsybit.se/' + place);
    await page.fill('#pp-input', pp);
    await page.click('button:has-text("fortsätt")');
    const joinBtn = page.locator('#announce-btn, #join-btn').first();
    await joinBtn.waitFor({ state: 'visible', timeout: 15000 });
    await joinBtn.click();
    await page.fill('#name-input', nick);
    await page.click('button:has-text("jag är här")');
    await expect(page.locator('.pill--self').filter({ hasText: nick }).first()).toBeVisible({ timeout: 15000 });
    // Leave so the next reload starts from a clean populated/empty room.
    await page.locator('#leave-btn').click();
    await page.waitForTimeout(800);
  }

  const nickA = 'rt-A-' + Date.now();
  const nickB = 'rt-B-' + Date.now();
  await setupIdentity(a, nickA);
  await setupIdentity(b, nickB);

  // Now exercise the auto-login path: navigate both with ?magicword=, then
  // have A re-announce. B should refresh within a few seconds via SignalR.
  await b.goto(url);
  await b.waitForLoadState('networkidle');
  // Give the SignalR connection time to come up + JoinPlace to fire.
  await b.waitForTimeout(2000);

  await a.goto(url);
  await a.waitForLoadState('networkidle');
  await a.waitForTimeout(1000);

  // Re-announce on A by clicking the announce/join button.
  const aJoin = a.locator('#announce-btn, #join-btn').first();
  await aJoin.waitFor({ state: 'visible', timeout: 5000 });
  await aJoin.click();
  // Name is pre-filled from localStorage; just confirm.
  await a.click('#confirm-btn');
  await expect(a.locator('.pill--self').filter({ hasText: nickA }).first())
    .toBeVisible({ timeout: 10000 });

  // Without doing anything on B, expect A's pill to appear via SignalR push.
  await expect(b.locator('.pill').filter({ hasText: nickA }).first())
    .toBeVisible({ timeout: 5000 });

  // Cleanup.
  await a.locator('#leave-btn').click().catch(() => {});
  await b.locator('#leave-btn').click().catch(() => {});
  await a.waitForTimeout(300);
  await b.waitForTimeout(300);

  await browser.close();
});
