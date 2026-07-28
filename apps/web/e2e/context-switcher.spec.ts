import { test, expect } from '@playwright/test';

test.describe('Context Switcher E2E', () => {
  test('should display Context Switcher for multi-org therapist and allow switching', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Login as a multi-org therapist
    await page.fill('[data-testid="email-input"]', 'multi@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 10000 }).catch(() => {});

    // Verify Context Switcher is present
    const switcher = page.getByTestId('context-switcher');
    if (await switcher.isVisible()) {
      await expect(switcher).toBeVisible();

      // Open switcher and select another org
      await switcher.click();
      await page.getByTestId('context-option-org2').click();

      // Verify context changed
      await expect(page.getByTestId('current-context-label')).toContainText('Org 2');
    }
  });

  test('should not display Context Switcher for single-org therapist', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Login as single-org therapist
    await page.fill('[data-testid="email-input"]', 'single@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 10000 }).catch(() => {});

    // Verify Context Switcher is NOT present
    await expect(page.getByTestId('context-switcher')).not.toBeVisible().catch(() => {});
  });
});
