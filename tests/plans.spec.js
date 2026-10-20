const { test, expect } = require('@playwright/test');

async function enter(page, place, pass) {
  await page.goto(`/${place}`);
  await page.fill('#pp-input', pass);
  await page.click('button:has-text("fortsätt")');
}

test.describe('Plans', () => {
  test('propose a plan, a friend says på, quorum met, then call it off', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const place = 'planprov';
    const pass = 'plans-' + Date.now();

    await enter(p1, place, pass);
    await expect(p1.locator('[data-plan-new]')).toBeVisible({ timeout: 10000 });
    await p1.click('[data-plan-new]');

    // Propose screen defaults to the coming Friday 18:00.
    await p1.fill('#name-input', 'Anna');
    await p1.fill('#plan-title-input', 'Fredagsöl');
    await expect(p1.locator('#plan-time-input')).toHaveValue('18:00');
    await p1.click('#plan-min-inc'); // 0 → 2
    await p1.click('#plan-submit');

    const card1 = p1.locator('.plan-card');
    await expect(card1).toContainText('Fredagsöl', { timeout: 10000 });
    // Proposer is på by default; 1 of 2.
    await expect(card1.locator('[data-plan-rsvp="in"]')).toHaveClass(/is-mine/);
    await expect(card1.locator('.plan-quorum')).toContainText('1 till');
    // A plan alone doesn't make the room "populated".
    await expect(p1.locator('.scandi-count-num')).toHaveCount(0);

    // Friend joins the room and answers på.
    await enter(p2, place, pass);
    const card2 = p2.locator('.plan-card');
    await expect(card2).toContainText('Fredagsöl', { timeout: 10000 });
    await expect(card2).toContainText('föreslaget av Anna');
    await card2.locator('[data-plan-rsvp="in"]').click();
    await expect(p2.locator('#name-input')).toBeVisible();
    await p2.fill('#name-input', 'Erik');
    await p2.click('#plan-name-submit');
    await expect(p2.locator('.plan-quorum--met')).toBeVisible({ timeout: 10000 });

    // Anna sees it live.
    await expect(card1.locator('.plan-quorum--met')).toBeVisible({ timeout: 10000 });
    await expect(card1).toContainText('Erik');

    // Erik changes his mind to kanske — no name prompt the second time.
    await card2.locator('[data-plan-rsvp="maybe"]').click();
    await expect(card2.locator('[data-plan-rsvp="maybe"]')).toHaveClass(/is-mine/);
    await expect(card2.locator('.plan-quorum')).toContainText('1 till', { timeout: 10000 });

    // Only Anna can call it off, with a two-tap confirm.
    await expect(card2.locator('[data-plan-cancel]')).toHaveCount(0);
    await card1.locator('[data-plan-cancel]').click();
    await expect(card1.locator('[data-plan-cancel]')).toContainText('tryck igen');
    await card1.locator('[data-plan-cancel]').click();
    await expect(p1.locator('.plan-card')).toHaveCount(0, { timeout: 10000 });
    await expect(p2.locator('.plan-card')).toHaveCount(0, { timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('a half-filled plan form survives switching apps and live updates', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const place = 'planbort';
    const pass = 'plans-away-' + Date.now();

    await enter(p1, place, pass);
    await p1.click('[data-plan-new]');
    await p1.fill('#name-input', 'Anna');
    await p1.fill('#plan-title-input', 'Grillkväll');

    // Coming back from another app fires visibilitychange → background refetch.
    await p1.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    // Someone else checking in pushes a SignalR refresh.
    await enter(p2, place, pass);
    await p2.click('#announce-btn');
    await p2.fill('#name-input', 'Erik');
    await p2.keyboard.press('Enter');
    await expect(p2.locator('.pill--self')).toContainText('Erik', { timeout: 10000 });
    await p1.waitForTimeout(1500);

    await expect(p1.locator('#plan-title-input')).toHaveValue('Grillkväll');

    // Submitting still lands on a fresh board that includes Erik.
    await p1.click('#plan-submit');
    await expect(p1.locator('.plan-card')).toContainText('Grillkväll', { timeout: 10000 });
    await expect(p1.locator('#pills-host')).toContainText('Erik');

    await ctx1.close();
    await ctx2.close();
  });
});
