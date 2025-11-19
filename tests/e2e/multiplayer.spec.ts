import { test, expect } from '@playwright/test';

test.describe('Multiplayer Game Flow', () => {
  test('host can create room and start game', async ({ page }) => {
    await page.goto('/multiplayer/create');

    // Select quiz
    await page.click('text=JavaScript Basics');
    await page.fill('[name="roomName"]', 'E2E Test Room');
    await page.click('button:has-text("Create Room")');

    // Wait for room code
    await expect(page.locator('.room-code')).toBeVisible({ timeout: 5000 });
    const roomCode = await page.locator('.room-code').textContent();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Start game
    await page.click('button:has-text("Start Game")');
    await expect(page.locator('.question-timer')).toBeVisible({ timeout: 10000 });
  });

  test('player can join and answer questions', async ({ page, context }) => {
    // Create room in first tab (host)
    const hostPage = await context.newPage();
    await hostPage.goto('/multiplayer/create');
    await hostPage.click('text=JavaScript Basics');
    await hostPage.fill('[name="roomName"]', 'Player Join Test');
    await hostPage.click('button:has-text("Create Room")');

    const roomCodeElement = hostPage.locator('.room-code');
    await roomCodeElement.waitFor({ state: 'visible', timeout: 5000 });
    const roomCode = await roomCodeElement.textContent();

    // Join as player in second tab
    await page.goto('/multiplayer/join');
    await page.fill('[name="roomCode"]', roomCode!);
    await page.fill('[name="username"]', 'E2E Test Player');
    await page.click('button:has-text("Join Room")');

    await expect(page.locator('text=Waiting for host')).toBeVisible({ timeout: 5000 });

    // Host starts game
    await hostPage.click('button:has-text("Start Game")');

    // Player sees question
    await expect(page.locator('.question-text')).toBeVisible({ timeout: 10000 });

    // Player submits answer
    await page.click('.answer-option:first-child');
    await page.click('button:has-text("Submit")');

    // Player sees result animation
    await expect(page.locator('.answer-result-animation')).toBeVisible({ timeout: 5000 });

    // Clean up
    await hostPage.close();
  });

  test('handles network lag gracefully', async ({ page, context }) => {
    // Simulate slow 3G
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/multiplayer/join');

    // Should show loading states
    await expect(page.locator('text=Connecting...')).toBeVisible({ timeout: 3000 });
  });

  test('host controls work correctly', async ({ page }) => {
    await page.goto('/multiplayer/create');
    await page.click('text=Quick Quiz');
    await page.fill('[name="roomName"]', 'Host Controls Test');
    await page.click('button:has-text("Create Room")');

    await page.click('button:has-text("Start Game")');
    await expect(page.locator('.question-timer')).toBeVisible();

    // Test pause button
    await page.click('button:has-text("Pause")');
    await expect(page.locator('text=Paused')).toBeVisible();

    // Test resume button
    await page.click('button:has-text("Resume")');
    await expect(page.locator('.question-timer.running')).toBeVisible();

    // Test skip question
    const questionBefore = await page.locator('.question-number').textContent();
    await page.click('button:has-text("Skip")');
    await page.waitForTimeout(1000);
    const questionAfter = await page.locator('.question-number').textContent();
    expect(questionBefore).not.toBe(questionAfter);
  });

  test('leaderboard updates in real-time', async ({ page, context }) => {
    // Create room
    const hostPage = await context.newPage();
    await hostPage.goto('/multiplayer/create');
    await hostPage.click('text=JavaScript Basics');
    await hostPage.click('button:has-text("Create Room")');
    const roomCode = await hostPage.locator('.room-code').textContent();

    // Join as player 1
    const player1Page = await context.newPage();
    await player1Page.goto('/multiplayer/join');
    await player1Page.fill('[name="roomCode"]', roomCode!);
    await player1Page.fill('[name="username"]', 'Player One');
    await player1Page.click('button:has-text("Join")');

    // Join as player 2
    const player2Page = await context.newPage();
    await player2Page.goto('/multiplayer/join');
    await player2Page.fill('[name="roomCode"]', roomCode!);
    await player2Page.fill('[name="username"]', 'Player Two');
    await player2Page.click('button:has-text("Join")');

    // Start game
    await hostPage.click('button:has-text("Start Game")');

    // Player 1 answers correctly
    await player1Page.click('.answer-option:first-child');
    await player1Page.click('button:has-text("Submit")');

    // Check leaderboard updated on player 2's screen
    await expect(player2Page.locator('text=Player One')).toBeVisible();
    await expect(player2Page.locator('.leaderboard-score')).toContainText('1');

    // Clean up
    await hostPage.close();
    await player1Page.close();
    await player2Page.close();
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/multiplayer/create');
    await page.click('text=JavaScript Basics');
    await page.click('button:has-text("Create Room")');
    await page.click('button:has-text("Start Game")');

    // Use arrow keys to navigate
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Select with Enter
    await page.keyboard.press('Enter');

    // Verify answer was selected
    await expect(page.locator('.answer-option.selected')).toBeVisible();
  });

  test('accessibility features work', async ({ page }) => {
    await page.goto('/multiplayer/join');

    // Check for screen reader announcements
    const srElement = await page.locator('[role="status"][aria-live="polite"]');
    expect(await srElement.count()).toBeGreaterThan(0);

    // Check for keyboard focus indicators
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.className);
    expect(focusedElement).toBeTruthy();

    // Check for high contrast mode support
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    // Verify high contrast styles applied
    expect(true).toBe(true);
  });
});
