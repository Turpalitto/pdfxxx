import { expect, test } from '@playwright/test';

test.describe('workflow page', () => {
  test('renders the chain builder and shared palette', async ({ page }) => {
    await page.goto('/workflow');

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Build a chain of tools|Соберите цепочку из инструментов/i,
    );

    // Upload dropzone is the shared FileUpload component.
    await expect(page.getByTestId('dropzone-file-upload')).toBeVisible();

    // App is light-only — assert the stable light palette like the other pages.
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(false);
  });

  test('adding a palette step builds the pipeline', async ({ page }) => {
    await page.goto('/workflow');

    const pipeline = page.getByTestId('workflow-pipeline');
    await expect(pipeline).toHaveCount(0);

    // Add two chainable steps from the palette.
    await page.getByTestId('workflow-add-compress').click();
    await page.getByTestId('workflow-add-watermark').click();

    await expect(pipeline).toBeVisible();
    await expect(pipeline.locator('> li')).toHaveCount(2);

    // Run stays disabled until a file is uploaded.
    await expect(page.getByTestId('workflow-run')).toBeDisabled();
  });

  test('saves and restores a chain without uploaded files', async ({ page }) => {
    await page.goto('/workflow');
    await page.evaluate(() => localStorage.removeItem('pdfx.workflow.savedChains.v1'));
    await page.reload();

    await page.getByTestId('workflow-add-compress').click();
    await page.getByTestId('workflow-add-watermark').click();
    await page.getByTestId('workflow-save-name').fill('Court filing');
    await page.getByTestId('workflow-save-chain').click();

    await expect(page.getByTestId('workflow-saved-chain')).toContainText('Court filing');

    await page.reload();
    await expect(page.getByTestId('workflow-saved-chain')).toContainText('Court filing');

    await page.getByTestId('workflow-load-chain').click();
    await expect(page.getByTestId('workflow-pipeline').locator('> li')).toHaveCount(2);
    await expect(page.getByTestId('workflow-run')).toBeDisabled();

    const stored = await page.evaluate(() => localStorage.getItem('pdfx.workflow.savedChains.v1'));
    expect(stored).not.toContain('client-only');
    expect(stored).not.toContain('fileName');
  });

  test('loads a chain from a #chain= share link', async ({ page }) => {
    const encoded =
      'eyJ2IjoxLCJzdGVwcyI6W3sicyI6ImNvbXByZXNzIiwibyI6eyJsZXZlbCI6ImhpZ2gifX0seyJzIjoid2F0ZXJtYXJrIiwibyI6eyJ0ZXh0IjoiRFJBRlQifX1dfQ';
    await page.goto(`/workflow#chain=${encoded}`);

    const pipeline = page.getByTestId('workflow-pipeline');
    await expect(pipeline).toBeVisible();
    await expect(pipeline.locator('> li')).toHaveCount(2);
    await expect(page.getByTestId('workflow-shared-note')).toContainText(/loaded from a link/i);

    // Hash is stripped so a refresh does not re-apply the chain.
    expect(await page.evaluate(() => window.location.hash)).toBe('');

    // Share button copies a link for the current chain.
    await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
    await page.getByTestId('button-share-chain').click();
    await expect(page.getByTestId('button-share-chain')).toContainText(/copied/i);

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('/workflow#chain=');
    const payload = copied.split('#chain=')[1] ?? '';
    expect(atob(payload)).toContain('compress');
    expect(atob(payload)).toContain('watermark');
  });

  test('shows a note for a malformed share link', async ({ page }) => {
    await page.goto('/workflow#chain=not-a-real-payload');

    await expect(page.getByTestId('workflow-shared-note')).toContainText(/malformed/i);
    await expect(page.getByTestId('workflow-pipeline')).toHaveCount(0);
  });
});
