import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Medical records', () => {
  test('renders category counts, filter and empty/list state', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/records', 'screen-records');
    await waitForLoaded(page);
    for (const category of ['condition', 'allergy', 'vaccination']) await expect(screen.getByTestId(`record-count-${category}`)).toBeVisible();
    await expect(screen.locator('[data-testid^="record-card-"]').first().or(screen.getByTestId('state-empty-records'))).toBeVisible();
    await expect(headerBack(page)).toHaveAccessibleName(/back|رجوع/i);
    await expect(headerBack(page)).not.toHaveAccessibleName(/\(tabs\)/);
    await commonScreenChecks(page, testInfo, screen, 'records');
  });

  test('add opens an action sheet with the three record types', async ({ page }) => {
    const screen = await openScreen(page, '/records', 'screen-records');
    await waitForLoaded(page);
    await page.getByTestId('btn-add-record').filter({ visible: true }).click();
    const sheet = page.getByTestId('action-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-testid^="dialog-btn-"]:not([data-testid="dialog-btn-cancel"])')).toHaveCount(3);
    await sheet.getByTestId('dialog-btn-cancel').click();
    await expect(sheet).toHaveCount(0);
  });

  test('record form validates required fields for each category', async ({ page }) => {
    for (const [category, field] of [
      ['condition', 'input-condition-name'],
      ['allergy', 'input-allergen'],
      ['vaccination', 'input-vaccine-name'],
    ] as const) {
      const form = await openScreen(page, `/record-form?category=${category}`, 'screen-record-form');
      await expect(form.getByTestId(field)).toBeVisible();
      await form.getByTestId('btn-save-record').click();
      await expect(form.getByTestId('message-danger')).toBeVisible();
    }
  });

  test('adds, edits and removes a condition', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const name = `QA condition ${testInfo.project.name} ${Date.now()}`;
    const screen = await openScreen(page, '/records', 'screen-records');
    await waitForLoaded(page);
    const form = page.getByTestId('screen-record-form');
    const leftovers = screen.locator('[data-testid^="record-card-condition-"]', { hasText: `QA condition ${testInfo.project.name}` });
    while ((await leftovers.count()) > 0) {
      await leftovers.first().click();
      await form.getByTestId('btn-remove-record').click();
      await page.getByTestId('dialog').getByTestId('dialog-btn-0').click();
      await expect(screen).toBeVisible({ timeout: 60_000 });
      await waitForLoaded(page);
    }
    await page.getByTestId('btn-add-record').filter({ visible: true }).click();
    await page.getByTestId('action-sheet').getByTestId('dialog-btn-0').click();
    await expect(form).toBeVisible();
    await form.getByTestId('input-condition-name').fill(name);
    await form.getByTestId('input-condition-notes').fill('Created by Playwright QA');
    await commonScreenChecks(page, testInfo, form, 'record-form');
    await form.getByTestId('btn-save-record').click();
    await expect(screen).toBeVisible({ timeout: 60_000 });

    const card = screen.locator('[data-testid^="record-card-condition-"]', { hasText: name });
    await expect(card).toBeVisible({ timeout: 60_000 });
    const search = screen.getByTestId('input-records-search');
    if (await search.isVisible()) {
      await search.fill(name);
      await expect(screen.locator('[data-testid^="record-card-"]')).toHaveCount(1);
      await search.fill('zzzz-no-such-record');
      await expect(screen.getByTestId('state-empty-records-search')).toBeVisible();
      await search.fill(name);
    } else {
      testInfo.annotations.push({ type: 'note', description: 'search hidden (<= 5 records, by design)' });
    }

    await card.click();
    await expect(form).toBeVisible();
    await expect(form.getByTestId('input-condition-name')).toHaveValue(name);
    await form.getByTestId('input-condition-name').fill(`${name} edited`);
    await form.getByTestId('btn-save-record').click();
    await expect(screen.locator('[data-testid^="record-card-condition-"]', { hasText: `${name} edited` })).toBeVisible({ timeout: 60_000 });

    await screen.locator('[data-testid^="record-card-condition-"]', { hasText: `${name} edited` }).click();
    await form.getByTestId('btn-remove-record').click();
    await expect(page.getByTestId('dialog')).toBeVisible();
    await page.getByTestId('dialog').getByTestId('dialog-btn-0').click();
    await expect(screen).toBeVisible({ timeout: 60_000 });
    await expect(screen.locator('[data-testid^="record-card-condition-"]', { hasText: name })).toHaveCount(0, { timeout: 60_000 });
  });

  test('shows an error state when records fail to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['medical_conditions', 'allergies', 'vaccinations']);
    const screen = await openScreen(page, '/records', 'screen-records');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
  });
});
