const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test('check leaving.js network response', async ({ page }) => {
  const reqs = [];
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('leaving.js') || u.includes('eta.js') || u.includes('bellSvg')) {
      reqs.push({ url: u, status: r.status(), len: (await r.body()).length });
    }
  });

  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text());
  });

  await page.goto('/hemma');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  console.log('NET', JSON.stringify(reqs, null, 2));

  const inspect = await page.evaluate(() => ({
    hasLeaving: typeof window.PRESENCE.renderLeavingBadge,
    hasBell: typeof window.PRESENCE.bellSvg,
    chipsConst: typeof CHIPS !== 'undefined' ? 'def' : 'undef',
  }));
  console.log('INSPECT', JSON.stringify(inspect, null, 2));
});
