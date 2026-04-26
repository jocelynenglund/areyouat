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

  const nickA = 'rt-A-' + Date.now();
  const nickB = 'rt-B-' + Date.now();

  // Seed localStorage on each context so the magic-word path lands on the
  // populated screen with the join button (no name-prompt needed). This
  // avoids the "name typing" race and isolates what we're testing: SignalR
  // push from announce-on-A to render-on-B.
  async function seedIdentity(ctx, nick) {
    await ctx.addInitScript(([key, nick, pp]) => {
      localStorage.setItem(key, JSON.stringify({ nickname: nick, passphrase: pp, checkedIn: false }));
    }, [`areyouat:${place}`, nick, pp]);
  }
  await seedIdentity(ctxA, nickA);
  await seedIdentity(ctxB, nickB);

  // Open B first; let SignalR settle.
  console.log('B: navigating');
  await b.goto(url);
  await b.waitForLoadState('networkidle');
  await b.waitForTimeout(2000);
  console.log('B: SignalR state =', await b.evaluate(() => ({
    pp: !!window.PRESENCE && PRESENCE.passphrase,
    rt: !!(window.PRESENCE && PRESENCE.realtime),
  })));

  // Open A and announce.
  console.log('A: navigating');
  await a.goto(url);
  await a.waitForLoadState('networkidle');
  console.log('A: page loaded, looking for join button');
  const aJoin = a.locator('#announce-btn, #join-btn').first();
  await aJoin.waitFor({ state: 'visible', timeout: 10000 });
  await aJoin.click();
  console.log('A: clicked join, filling name');
  await a.locator('#name-input').waitFor({ state: 'visible', timeout: 5000 });
  await a.fill('#name-input', nickA);
  await a.click('#confirm-btn');
  console.log('A: confirmed announce, waiting for self pill');
  await expect(a.locator('.pill--self').filter({ hasText: nickA }).first())
    .toBeVisible({ timeout: 10000 });
  console.log('A: self pill visible');

  // The big assertion: B sees A's pill via SignalR push, with no manual reload.
  console.log('B: waiting for A pill via realtime');
  await expect(b.locator('.pill').filter({ hasText: nickA }).first())
    .toBeVisible({ timeout: 5000 });
  console.log('B: saw A pill — pass!');

  // Cleanup: leave on A.
  await a.locator('#leave-btn').click().catch(() => {});
  await a.waitForTimeout(300);

  await browser.close();
});
