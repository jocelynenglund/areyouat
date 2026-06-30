const { test, expect } = require('@playwright/test');

test.describe('In spirit', () => {
  test('mark in spirit from an empty board, with a note, then undo', async ({ page }) => {
    const place = 'andetest';
    const pass = 'spirit-' + Date.now();
    const name = 'Anden';
    const note = 'nästa gång!';

    await page.goto(`/${place}`);
    await page.fill('#pp-input', pass);
    await page.click('button:has-text("fortsätt")');

    // Empty board offers the "can't make it, but I'm with you" trigger.
    await expect(page.locator('.spirit-trigger-btn')).toBeVisible({ timeout: 10000 });
    await page.click('.spirit-trigger-btn');

    // Spirit prompt: name + optional note.
    await expect(page.locator('#name-input')).toBeVisible();
    await page.fill('#name-input', name);
    await page.fill('#spirit-note-input', note);
    await page.click('#spirit-submit');

    // Lands in its own band with the note attached.
    await expect(page.locator('.spirit-divider')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.spirit-pill--self')).toContainText(name);
    await expect(page.locator('.spirit-pill--self')).toContainText(note);

    // In spirit must NOT count toward the "N här" headline.
    await expect(page.locator('.scandi-count-num')).toHaveCount(0);

    // Undo removes it; board falls back to empty.
    await page.click('.spirit-undo-btn');
    await expect(page.locator('.spirit-pill--self')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.spirit-trigger-btn')).toBeVisible({ timeout: 10000 });
  });

  test('a second visitor sees the first person in spirit', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const place = 'andedelad';
    const pass = 'spirit-shared-' + Date.now();

    await p1.goto(`/${place}`);
    await p1.fill('#pp-input', pass);
    await p1.click('button:has-text("fortsätt")');
    await expect(p1.locator('.spirit-trigger-btn')).toBeVisible({ timeout: 10000 });
    await p1.click('.spirit-trigger-btn');
    await p1.fill('#name-input', 'Fjärran');
    await p1.click('#spirit-submit');
    await expect(p1.locator('.spirit-pill--self')).toContainText('Fjärran', { timeout: 10000 });

    await p2.goto(`/${place}`);
    await p2.fill('#pp-input', pass);
    await p2.click('button:has-text("fortsätt")');
    await expect(p2.locator('.spirit-pills')).toContainText('Fjärran', { timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
  });
});
