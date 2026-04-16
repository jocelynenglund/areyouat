const { test, expect } = require('@playwright/test');

test.describe('Landing', () => {
  test('shows place name and passphrase input', async ({ page }) => {
    await page.goto('/bron');
    await expect(page.locator('text=/bron')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button', { hasText: 'fortsätt' })).toBeVisible();
  });
});

test.describe('Empty state', () => {
  test('wrong passphrase shows ingen e här', async ({ page }) => {
    await page.goto('/bron');
    await page.fill('input[type="password"]', 'fel-lösenord-' + Date.now());
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
    await page.fill('input[type="password"]', passphrase);
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

  test('second visitor with same passphrase sees first person', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const sharedPassphrase = 'shared-' + Date.now();
    const sharedPlace = 'delad';

    // First person announces
    await page1.goto(`/${sharedPlace}`);
    await page1.fill('input[type="password"]', sharedPassphrase);
    await page1.click('button:has-text("fortsätt")');
    await expect(page1.locator('button:has-text("men jag är!")')).toBeVisible({ timeout: 10000 });
    await page1.click('button:has-text("men jag är!")');
    await page1.fill('input[type="text"]', 'Förste');
    await page1.click('button:has-text("jag är här!")');
    await expect(page1.locator('text=Förste')).toBeVisible({ timeout: 10000 });

    // Second person queries same place + passphrase
    await page2.goto(`/${sharedPlace}`);
    await page2.fill('input[type="password"]', sharedPassphrase);
    await page2.click('button:has-text("fortsätt")');
    await expect(page2.locator('text=Förste')).toBeVisible({ timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
  });
});
