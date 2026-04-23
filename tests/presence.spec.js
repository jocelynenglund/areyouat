const { test, expect } = require('@playwright/test');

test.describe('Landing', () => {
  test('shows place name and passphrase input', async ({ page }) => {
    await page.goto('/bron');
    await expect(page.locator('text=/bron')).toBeVisible();
    await expect(page.locator('#pp-input')).toBeVisible();
    await expect(page.locator('button', { hasText: 'fortsätt' })).toBeVisible();
  });
});

test.describe('Empty state', () => {
  test('wrong passphrase shows ingen e här', async ({ page }) => {
    await page.goto('/bron');
    await page.fill('#pp-input', 'fel-lösenord-' + Date.now());
    await page.click('button:has-text("fortsätt")');
    await expect(page.locator('text=ingen e här')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("men jag är!")')).toBeVisible();
  });
});

test.describe('Announce flow', () => {
  const passphrase = 'playwright-test-' + Date.now();
  const place = 'testplats';
  const nickname = 'Playwright';

  test('announce presence and see it in list', async ({ page }) => {
    await page.goto(`/${place}`);

    // Enter passphrase
    await page.fill('#pp-input', passphrase);
    await page.click('button:has-text("fortsätt")');

    // Should be empty first
    await expect(page.locator('button:has-text("men jag är!")')).toBeVisible({ timeout: 10000 });

    // Click announce
    await page.click('button:has-text("men jag är!")');
    await expect(page.locator('input[type="text"]')).toBeVisible();

    // Enter nickname
    await page.fill('input[type="text"]', nickname);
    await page.click('button:has-text("jag är här!")');

    // Should see ourselves in the list
    await expect(page.locator(`text=${nickname}`)).toBeVisible({ timeout: 10000 });
  });

  test('leave then rejoin pre-fills nickname', async ({ page }) => {
    const leavePlace = 'leave-test-' + Date.now();
    const leavePass = 'leave-pass-' + Date.now();
    const leaveName = 'Återvändaren';

    await page.goto(`/${leavePlace}`);
    await page.fill('#pp-input', leavePass);
    await page.click('button:has-text("fortsätt")');
    await expect(page.locator('button:has-text("men jag är!")')).toBeVisible({ timeout: 10000 });

    // Check in
    await page.click('button:has-text("men jag är!")');
    await page.fill('input[type="text"]', leaveName);
    await page.click('button:has-text("jag är här!")');
    await expect(page.locator(`text=${leaveName}`)).toBeVisible({ timeout: 10000 });

    // Leave
    await page.click('button:has-text("lämna")');
    await expect(page.locator('button:has-text("men jag är!")')).toBeVisible({ timeout: 10000 });

    // Rejoin — name should be pre-filled
    await page.click('button:has-text("men jag är!")');
    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(leaveName);
  });

  test('setting eta via custom time picker shows pill in on-the-way band', async ({ browser }) => {
    // Regression guard: the backend used to hard-cap minutes to {5,15,30,45}, so
    // any non-preset value (eg. a custom time that translated to 60 or 137 mins)
    // silently failed and the ETA pill never appeared. This test walks the full
    // flow from the "set eta" card through the custom time picker and asserts
    // the self pill lands in the "på väg" band.
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const sharedPass = 'eta-custom-' + Date.now();
    const place = 'etacustom';

    await p1.goto(`/${place}`);
    await p1.fill('#pp-input', sharedPass);
    await p1.click('button:has-text("fortsätt")');
    await expect(p1.locator('button:has-text("men jag är!")')).toBeVisible({ timeout: 10000 });
    await p1.click('button:has-text("men jag är!")');
    await p1.fill('input[type="text"]', 'Ankommaren');
    await p1.click('button:has-text("jag är här!")');
    await expect(p1.locator('text=Ankommaren')).toBeVisible({ timeout: 10000 });

    await p2.goto(`/${place}`);
    await p2.fill('#pp-input', sharedPass);
    await p2.click('button:has-text("fortsätt")');
    await expect(p2.locator('text=Ankommaren')).toBeVisible({ timeout: 10000 });

    await p2.click('button:has-text("sätt tid")');
    await expect(p2.locator('#name-input')).toBeVisible();
    await p2.fill('#name-input', 'PåVäg');

    // Pick a custom time ~1 hour out (≈60 min, not a backend preset).
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const hh = String(future.getHours()).padStart(2, '0');
    const mm = String(future.getMinutes()).padStart(2, '0');
    await p2.fill('#eta-custom-input', `${hh}:${mm}`);
    await p2.click('#eta-custom-submit');

    await expect(p2.locator('.eta-divider')).toBeVisible({ timeout: 10000 });
    await expect(p2.locator('.eta-pill--self')).toBeVisible({ timeout: 10000 });
    await expect(p2.locator('.eta-pill--self')).toContainText('PåVäg');

    await ctx1.close();
    await ctx2.close();
  });

  test('second visitor with same passphrase sees first person', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const sharedPassphrase = 'shared-' + Date.now();
    const sharedPlace = 'delad';

    // First person announces
    await page1.goto(`/${sharedPlace}`);
    await page1.fill('#pp-input', sharedPassphrase);
    await page1.click('button:has-text("fortsätt")');
    await expect(page1.locator('button:has-text("men jag är!")')).toBeVisible({ timeout: 10000 });
    await page1.click('button:has-text("men jag är!")');
    await page1.fill('input[type="text"]', 'Förste');
    await page1.click('button:has-text("jag är här!")');
    await expect(page1.locator('text=Förste')).toBeVisible({ timeout: 10000 });

    // Second person queries same place + passphrase
    await page2.goto(`/${sharedPlace}`);
    await page2.fill('#pp-input', sharedPassphrase);
    await page2.click('button:has-text("fortsätt")');
    await expect(page2.locator('text=Förste')).toBeVisible({ timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
  });
});
