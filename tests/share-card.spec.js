const { test, expect } = require('@playwright/test');

test.describe('Share room card', () => {
  test('builds a card image and shares image + summary + link together', async ({ page }) => {
    // Stub the Web Share API so we can capture exactly what gets shared.
    await page.addInitScript(() => {
      window.__shared = null;
      navigator.canShare = () => true;
      navigator.share = (data) => {
        const f = data.files && data.files[0];
        window.__shared = {
          hasFiles: !!(data.files && data.files.length),
          fileName: f && f.name,
          fileType: f && f.type,
          text: data.text || '',
          url: data.url || ''
        };
        return Promise.resolve();
      };
    });

    const place = 'kortet';
    const pass = 'card-' + Date.now();

    await page.goto(`/${place}`);
    await page.fill('#pp-input', pass);
    await page.click('button:has-text("fortsätt")');
    await expect(page.locator('button:has-text("men jag är!")')).toBeVisible({ timeout: 10000 });

    // Put one person in the room so the card/summary have content.
    await page.click('button:has-text("men jag är!")');
    await page.fill('input[type="text"]', 'Delaren');
    await page.click('button:has-text("jag är här!")');
    await expect(page.locator('text=Delaren')).toBeVisible({ timeout: 10000 });

    // Open the share sheet — the card renders asynchronously.
    await page.click('#share-btn');
    await expect(page.locator('.share-card__img')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#share-image-btn')).toBeEnabled();

    // Text channels carry the state summary + the link.
    const smsHref = await page.locator('#share-sms').getAttribute('href');
    const smsBody = decodeURIComponent(smsHref);
    expect(smsBody).toContain('här på kortet');
    expect(smsBody).toContain(`/${place}?magicword=${pass}`);

    // The image share bundles a PNG file, the summary text, and the URL.
    await page.click('#share-image-btn');
    const shared = await page.evaluate(() => window.__shared);
    expect(shared).not.toBeNull();
    expect(shared.hasFiles).toBe(true);
    expect(shared.fileType).toBe('image/png');
    expect(shared.fileName).toBe(`${place}.png`);
    expect(shared.text).toContain('här på kortet');
    expect(shared.url).toContain(`/${place}?magicword=${pass}`);
  });
});
