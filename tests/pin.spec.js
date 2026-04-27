const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

const FAKE_LAT = 59.3293;
const FAKE_LNG = 18.0686;

test('drop a pin, open the sheet, all four actions wired up', async ({ page, context }) => {
  const place = 'pin-test';
  const pp = 'pin-spec-' + Date.now();
  const nick = 'claude-pin-test';

  const origin = new URL(process.env.PW_BASE_URL || 'https://rdp.itsybit.se').origin;
  await context.grantPermissions(['geolocation', 'clipboard-read', 'clipboard-write'], { origin });
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

  // Empty state: drop chip is visible
  const dropChip = page.locator('[data-pin-action="drop"]');
  await expect(dropChip).toBeVisible({ timeout: 15000 });
  await dropChip.click();

  // Pin saved → chip flips to icon-only "menu" state
  const menuChip = page.locator('[data-pin-action="menu"]');
  await expect(menuChip).toBeVisible({ timeout: 15000 });

  // Open sheet
  await menuChip.click();
  const sheet = page.locator('.pin-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-sheet-action="open"]')).toBeVisible();
  await expect(sheet.locator('[data-sheet-action="move"]')).toBeVisible();
  await expect(sheet.locator('[data-sheet-action="copy"]')).toBeVisible();
  await expect(sheet.locator('[data-sheet-action="remove"]')).toBeVisible();

  // Header includes nickname
  await expect(sheet.locator('.pin-sheet__title')).toContainText(nick);

  // Copy → "copied" flash
  await sheet.locator('[data-sheet-action="copy"]').click();
  await expect(sheet.locator('[data-sheet-action="copy"] .pin-sheet__action-label')).toContainText(/copied|kopierat/i);

  // Remove → first tap arms confirm, second tap removes
  const removeBtn = sheet.locator('[data-sheet-action="remove"]');
  await removeBtn.click();
  await expect(removeBtn).toHaveClass(/pin-sheet__action--confirming/);
  await removeBtn.click();

  // Sheet closes, chip flips back to empty state
  await expect(page.locator('[data-pin-action="drop"]')).toBeVisible({ timeout: 15000 });

  // Reload — empty state persists (pin was actually removed)
  await page.reload();
  await expect(page.locator('[data-pin-action="drop"]')).toBeVisible({ timeout: 15000 });

  const leaveBtn = page.locator('#leave-btn').first();
  if (await leaveBtn.isVisible().catch(() => false)) {
    await leaveBtn.click().catch(() => {});
  }
});
