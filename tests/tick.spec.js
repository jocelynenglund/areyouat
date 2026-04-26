const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test('leaving badge text re-ticks when time advances', async ({ page }) => {
  const place = 'hemma';
  const pp = 'vikinghus';
  const nick = 'claude-tick-test';

  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text());
  });

  await page.goto(`/${place}`);
  await page.fill('#pp-input', pp);
  await page.click('button:has-text("fortsätt")');
  const joinBtn = page.locator('#announce-btn, #join-btn').first();
  await joinBtn.waitFor({ state: 'visible', timeout: 15000 });
  await joinBtn.click();
  await page.fill('#name-input', nick);
  await page.click('button:has-text("jag är här")');

  const selfPill = page.locator('.pill--self').filter({ hasText: nick }).first();
  await expect(selfPill).toBeVisible({ timeout: 15000 });

  // Set leaving in 15 min
  await selfPill.locator('[data-leaving-trigger]').click();
  await selfPill.locator('[data-leaving-chip="15"]').click();

  const tickEl = selfPill.locator('[data-tick-leaving][data-target-at]');
  await expect(tickEl).toBeVisible({ timeout: 15000 });

  const initialText = (await tickEl.textContent()).trim();
  const targetAt = await tickEl.getAttribute('data-target-at');
  console.log('INITIAL:', initialText, 'targetAt:', targetAt);

  // Symbols should exist
  const probe = await page.evaluate(() => ({
    eta: typeof window.PRESENCE.formatEtaTime,
    leaving: typeof window.PRESENCE.formatLeavingTime,
    tick: typeof window.PRESENCE.tickCountdowns,
  }));
  console.log('SYMBOLS:', probe);
  expect(probe.eta).toBe('function');
  expect(probe.leaving).toBe('function');
  expect(probe.tick).toBe('function');

  // Rewind data-target-at by 5 minutes and re-tick — text should drop ~5m
  await page.evaluate(() => {
    document.querySelectorAll('[data-tick-leaving]').forEach(el => {
      const t = parseInt(el.getAttribute('data-target-at'), 10);
      el.setAttribute('data-target-at', String(t - 5 * 60 * 1000));
    });
    window.PRESENCE.tickCountdowns();
  });
  const afterText = (await tickEl.textContent()).trim();
  console.log('AFTER -5min:', afterText);
  expect(afterText).not.toBe(initialText);
  expect(afterText).toMatch(/m|nu|now|out/);

  // Cleanup
  await selfPill.locator('[data-leaving-cancel]').click().catch(() => {});
  await page.waitForTimeout(300);
  await selfPill.locator('#leave-btn').click().catch(() => {});
  await page.waitForTimeout(500);
});
