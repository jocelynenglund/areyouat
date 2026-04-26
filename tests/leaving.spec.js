const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test('self pill shows leaving affordance, chip sets leaving, cancel clears it', async ({ page }) => {
  const place = 'hemma';
  const pp = 'vikinghus';
  const nick = 'claude-leaving-test';

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

  const selfPill = page.locator(`.pill--self`).filter({ hasText: nick }).first();
  await expect(selfPill).toBeVisible({ timeout: 15000 });

  const trigger = selfPill.locator('[data-leaving-trigger]');
  await expect(trigger).toBeVisible();
  console.log('TRIGGER:', (await trigger.textContent()).trim());

  await trigger.click();
  const chip15 = selfPill.locator('[data-leaving-chip="15"]');
  await expect(chip15).toBeVisible();
  await chip15.click();

  const badge = selfPill.locator('.leaving-badge--self');
  await expect(badge).toBeVisible({ timeout: 15000 });
  const badgeText = (await badge.textContent()).trim();
  console.log('BADGE:', badgeText);
  expect(badgeText).toMatch(/m/);

  await selfPill.locator('[data-leaving-cancel]').click();
  await expect(selfPill.locator('[data-leaving-trigger]')).toBeVisible({ timeout: 15000 });

  // Cleanup: leave the place
  await selfPill.locator('#leave-btn').click().catch(() => {});
  await page.waitForTimeout(800);
});
