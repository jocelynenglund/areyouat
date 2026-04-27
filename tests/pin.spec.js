const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

// Stockholm-ish coordinates so the pin lands somewhere recognizable in maps fallback.
const FAKE_LAT = 59.3293;
const FAKE_LNG = 18.0686;

test('drop a pin stores location and exposes open-in-maps affordance', async ({ page, context }) => {
  const place = 'pin-test';
  const pp = 'pin-spec-' + Date.now();
  const nick = 'claude-pin-test';

  const origin = new URL(process.env.PW_BASE_URL || 'https://rdp.itsybit.se').origin;
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: FAKE_LAT, longitude: FAKE_LNG });

  page.on('pageerror', e => console.log('PAGEERROR', e.message));

  await page.goto(`/${place}`);
  await page.fill('#pp-input', pp);
  await page.click('button:has-text("fortsätt")');

  const joinBtn = page.locator('#announce-btn, #join-btn').first();
  await joinBtn.waitFor({ state: 'visible', timeout: 15000 });
  await joinBtn.click();

  await page.fill('#name-input', nick);
  await page.click('button:has-text("jag är här")');

  // Empty-pin chip: a button with "drop a pin"-equivalent label.
  const dropChip = page.locator('[data-pin-action="drop"]');
  await expect(dropChip).toBeVisible({ timeout: 15000 });
  await dropChip.click();

  // After save+refresh, chip flips to the "open in maps" state with the edit affordance.
  const openChip = page.locator('[data-pin-action="open"]');
  await expect(openChip).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-pin-action="replace"]')).toBeVisible();

  // Reload — pin should still be there (server-persisted).
  await page.reload();
  await expect(page.locator('[data-pin-action="open"]')).toBeVisible({ timeout: 15000 });

  // Cleanup: leave so we don't pollute the place with stale presence.
  const leaveBtn = page.locator('#leave-btn').first();
  if (await leaveBtn.isVisible().catch(() => false)) {
    await leaveBtn.click().catch(() => {});
  }
});
