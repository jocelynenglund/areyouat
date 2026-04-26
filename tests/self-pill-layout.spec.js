const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

// Verifies the new two-row self-pill layout:
//   row 1: name · DU · LÄMNA · bell  (no NU pill-time)
//   row 2: status note + leaving affordance
// Also confirms only one of (trigger, chips) is visible at a time when the
// user taps the "ska gå om…" trigger.
test('self pill renders two rows; trigger and chips are mutually exclusive', async ({ page }) => {
  const place = 'hemma';
  const pp = 'vikinghus';
  const nick = 'claude-self-pill-' + Date.now().toString(36);

  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text());
  });

  await page.goto(`/${place}?magicword=${pp}`);

  const joinBtn = page.locator('#announce-btn, #join-btn').first();
  await joinBtn.waitFor({ state: 'visible', timeout: 15000 });
  await joinBtn.click();

  await page.fill('#name-input', nick);
  await page.click('button:has-text("jag är här")');

  const selfPill = page.locator('.pill--self').filter({ hasText: nick }).first();
  await expect(selfPill).toBeVisible({ timeout: 15000 });

  // Two-row structure exists.
  await expect(selfPill.locator('.pill-self-row--primary')).toBeVisible();
  await expect(selfPill.locator('.pill-self-row--secondary')).toBeVisible();

  // Row 1: name, DU badge, leave btn, bell — but NO pill-time on self.
  await expect(selfPill.locator('.pill-self-row--primary .pill-name')).toBeVisible();
  await expect(selfPill.locator('.pill-self-row--primary .pill-you')).toBeVisible();
  await expect(selfPill.locator('.pill-self-row--primary #leave-btn')).toBeVisible();
  await expect(selfPill.locator('.pill-self-row--primary #bell-btn')).toBeVisible();
  await expect(selfPill.locator('.pill-time')).toHaveCount(0);

  // Row 2: leaving affordance + status editor.
  await expect(selfPill.locator('.pill-self-row--secondary [data-leaving-trigger]')).toBeVisible();
  await expect(selfPill.locator('.pill-self-row--secondary [data-status-editor]')).toBeVisible();

  // Trigger and chips are mutually exclusive.
  const trigger = selfPill.locator('[data-leaving-trigger]');
  const chips = selfPill.locator('[data-leaving-chips]');

  // Initial: trigger visible, chips hidden.
  await expect(trigger).toBeVisible();
  await expect(chips).toBeHidden();

  // After tapping trigger: chips visible, trigger hidden.
  await trigger.click();
  await expect(chips).toBeVisible();
  await expect(trigger).toBeHidden();

  // Snapshot the self pill bbox for the report.
  const box = await selfPill.boundingBox();
  console.log('SELF_PILL_BBOX', JSON.stringify(box));

  // Cleanup: leave so we don't litter the prod presence list.
  await selfPill.locator('#leave-btn').click().catch(() => {});
  await page.waitForTimeout(500);
});
