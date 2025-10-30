import { test, expect } from '@playwright/test';

test.describe('Planning Poker Smoke Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear storage before each test
    await context.clearCookies();
    // Clear localStorage by navigating to page and clearing
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await expect(page.locator('[data-testid="join-page"]')).toBeVisible();
  });

  test('two players can join and vote', async ({ page, context }) => {
    // Page 1: Join as host
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'Alice');
    await page.check('[data-testid="host-checkbox"]');
    await page.click('[data-testid="join-button"]');
    
    // Wait for join to complete and host view to render
    await expect(page.locator('[data-testid="join-page"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('[data-testid="game-page"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="host-controls"]')).toBeVisible({ timeout: 10000 });
    
    // Page 2: Join as player in new tab
    const browserInstance = context.browser();
    if (!browserInstance) {
      throw new Error('Browser instance is required for multi-user scenario');
    }
    const playerContext = await browserInstance.newContext();
    try {
      const page2 = await playerContext.newPage();
      await page2.goto('/');
      await page2.uncheck('[data-testid="host-checkbox"]');
      await page2.fill('[data-testid="username-input"]', 'Bob');
      await page2.click('[data-testid="join-button"]');

      // Wait for Bob to join
      await expect(page2.locator('[data-testid="join-page"]')).toBeHidden({ timeout: 10000 });
      await expect(page2.locator('[data-testid="game-page"]')).toBeVisible({ timeout: 10000 });

      // Alice votes 5
      await page.click('button:has-text("5")');
      await page.waitForTimeout(300);

      // Bob votes 3
      await page2.click('button:has-text("3")');
      await page2.waitForTimeout(300);

      // Alice reveals
      await page.click('button:has-text("REVEAL")');
      await page.waitForTimeout(500);

      // Both should see results with usernames
      await expect(page.locator('[data-testid="vote-username"]', { hasText: 'Alice' })).toBeVisible();
      await expect(page.locator('[data-testid="vote-username"]', { hasText: 'Bob' })).toBeVisible();
      await expect(page2.locator('[data-testid="vote-username"]', { hasText: 'Alice' })).toBeVisible();
      await expect(page2.locator('[data-testid="vote-username"]', { hasText: 'Bob' })).toBeVisible();

      // Alice clears
      await page.click('button:has-text("CLEAR")');
      await page.waitForTimeout(300);
    } finally {
      await playerContext.close();
    }
  });

  test('duplicate username is rejected', async ({ page, context }) => {
    // Join as Alice
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'Alice');
    await page.click('[data-testid="join-button"]');
    
    // Wait for join to complete
    await expect(page.locator('[data-testid="join-page"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('[data-testid="game-page"]')).toBeVisible({ timeout: 10000 });
    
    // Try to join as Alice again in new tab
    const browserInstance = context.browser();
    if (!browserInstance) {
      throw new Error('Browser instance is required for multi-user scenario');
    }
    const otherContext = await browserInstance.newContext();
    try {
      const page2 = await otherContext.newPage();
      await page2.goto('/');
      await page2.uncheck('[data-testid="host-checkbox"]');
      await page2.fill('[data-testid="username-input"]', 'Alice');
      await page2.click('[data-testid="join-button"]');

      // Should see error message
      await expect(page2.locator('text=username is already taken')).toBeVisible({ timeout: 3000 });
    } finally {
      await otherContext.close();
    }
  });

  test('second host is rejected', async ({ page, context }) => {
    // Join as host
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'Alice');
    await page.check('[data-testid="host-checkbox"]');
    await page.click('[data-testid="join-button"]');
    
    // Wait for join to complete - check for HOST badge in header
    await expect(page.locator('[data-testid="join-page"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('[data-testid="game-page"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="host-controls"]')).toBeVisible({ timeout: 10000 });
    
    // Try to join as host again
    const browserInstance = context.browser();
    if (!browserInstance) {
      throw new Error('Browser instance is required for multi-user scenario');
    }
    const secondHostContext = await browserInstance.newContext();
    try {
      const page2 = await secondHostContext.newPage();
      await page2.goto('/');
      await page2.fill('[data-testid="username-input"]', 'Bob');
      await page2.check('[data-testid="host-checkbox"]');
      await page2.click('[data-testid="join-button"]');

      // Should see error
      await expect(page2.locator('text=a host is already in this session')).toBeVisible({ timeout: 3000 });
    } finally {
      await secondHostContext.close();
    }
  });

  test('username validation shows error for short username', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'a');
    
    // Error message should appear for short username
    await expect(page.locator('text=Username must be at least 2 characters')).toBeVisible({ timeout: 1000 });
    
    // Join button should be disabled
    const joinButton = page.locator('[data-testid="join-button"]');
    await expect(joinButton).toBeDisabled();
    
    // Should still be on join page (not joined)
    await expect(page.locator('[data-testid="join-page"]')).toBeVisible();
  });

  test('player can leave session', async ({ page }) => {
    // Join as player
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'Charlie');
    await page.click('[data-testid="join-button"]');
    
    // Wait for join
    await expect(page.locator('[data-testid="join-page"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('[data-testid="game-page"]')).toBeVisible({ timeout: 10000 });
    
    // Leave session
    await page.click('[data-testid="leave-button"]');
    
    // Should return to join page
    await expect(page.locator('[data-testid="join-page"]')).toBeVisible({ timeout: 3000 });
  });
});

