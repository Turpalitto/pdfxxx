import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

test.describe('public pages', () => {
  test('home page renders the premium tool catalog', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/PDF|ПДФ/i);
    await expect(
      page.getByRole('link', { name: /Все инструменты|All tools/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Выберите инструмент|Choose your tool/i }),
    ).toBeVisible();
    await expect(page.getByTestId('home-workflow-send-ready')).toBeVisible();

    const toolHeadingY = await page
      .getByRole('heading', { name: /Выберите инструмент|Choose your tool/i })
      .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    const statsY = await page
      .locator('[data-testid^="stat-"]')
      .first()
      .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    expect(toolHeadingY).toBeLessThan(statsY);
    await expectNoHorizontalOverflow(page);
  });

  test('home search and command palette navigate to matching tools', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('input-tool-search').fill('markdown');
    await expect(page.getByRole('link', { name: /PDF to Markdown/i }).first()).toBeVisible();

    await page.keyboard.press('Control+K');
    await expect(page.getByPlaceholder(/What do you need to do with a PDF/i)).toBeVisible();
    await page.getByPlaceholder(/What do you need to do with a PDF/i).fill('powerpoint');
    await page.getByText('PDF to PowerPoint').click();

    await expect(page).toHaveURL(/\/tools\/pdf-to-pptx$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/PDF to PowerPoint/i);
  });

  test('command palette opens workflow presets', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Control+K');
    await page.getByTestId('palette-workflow-send-ready').click();

    await expect(page).toHaveURL(/\/workflow$/);
    await expect(page.getByTestId('workflow-pipeline').locator('> li')).toHaveCount(3);
  });

  test('command palette shows privacy-safe recent tools', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pdfx-recent-tools', JSON.stringify(['pdf-to-excel']));
      localStorage.setItem(
        'pdfx_recent_files',
        JSON.stringify([
          {
            name: 'private-client-contract.pdf',
            size: 12345,
            lastOpened: Date.now(),
            slug: 'pdf-to-excel',
          },
        ]),
      );
    });
    await page.reload();

    await expect(page.getByTestId('home-recent-pdf-to-excel')).toBeVisible();

    await page.keyboard.press('Control+K');

    await expect(page.getByTestId('palette-recent-pdf-to-excel')).toBeVisible();
    await expect(page.getByText('private-client-contract')).toHaveCount(0);

    await page.getByTestId('palette-recent-pdf-to-excel').click();
    await expect(page).toHaveURL(/\/tools\/pdf-to-excel$/);
  });

  test('pricing page renders plans', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/PDFX/);
    await expect(page.getByText('Free').first()).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('Team').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('privacy page stays within the viewport', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Privacy Policy|Политика конфиденциальности/i,
    );
    await expectNoHorizontalOverflow(page);
  });

  test('tool pages keep the shared palette', async ({ page }) => {
    await page.goto('/tools/pdf-to-excel');

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /PDF в Excel|PDF to Excel/i,
    );
    await expect(page.getByTestId('dropzone-file-upload')).toBeVisible();

    // App is light-only (theme switching was removed); assert the stable light palette.
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(false);

    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
  test('pdf to audio explains browser speech and OCR fallback', async ({ page }) => {
    await page.goto('/tools/pdf-to-audio');

    await expect(page.getByText(/does not create an audio file/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'OCR PDF' })).toBeVisible();
    await expect(page.getByText(/If this is a scan, run OCR PDF first/i)).toBeVisible();
    await expect(page.getByText(/Download your result instantly/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('keyboard shortcuts dialog toggles with Shift+/', async ({ page }) => {
    await page.goto('/');

    // Shift+/ produces "?" on US layouts — both must open the help dialog.
    await page.keyboard.press('Shift+/');
    const dialog = page.getByRole('heading', { name: /Keyboard Shortcuts|Горячие клавиши/i });
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Ctrl+Z')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
