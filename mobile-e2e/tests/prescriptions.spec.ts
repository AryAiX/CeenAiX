import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

test.describe('Prescriptions', () => {
  test('renders, segments switch and show their empty states', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/prescriptions', 'screen-prescriptions');
    await waitForLoaded(page);
    await expect(screen.getByTestId('segment-prescriptions-active')).toHaveAttribute('aria-selected', 'true');
    const hasRx = (await screen.locator('[data-testid^="prescription-card-"]').count()) > 0;
    if (!hasRx) await expect(screen.getByTestId('state-empty-prescriptions')).toBeVisible();
    await screen.getByTestId('segment-prescriptions-past').click();
    await expect(screen.getByTestId('segment-prescriptions-past')).toHaveAttribute('aria-selected', 'true');
    await expect(screen.locator('[data-testid^="prescription-card-"]').first().or(screen.getByTestId('state-empty-prescriptions'))).toBeVisible();
    await screen.getByTestId('segment-prescriptions-reported').click();
    await expect(screen.getByTestId('card-add-reported-med')).toBeVisible();
    await expect(screen.getByTestId('btn-save-reported-med')).toBeDisabled();
    if (!hasRx) testInfo.annotations.push({ type: 'note', description: 'no prescriptions in DEV: detail and pharmacy picker not reachable' });
    await commonScreenChecks(page, testInfo, screen, 'prescriptions');
  });

  test('adds and removes a self-reported medicine', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const name = `QA med ${testInfo.project.name} ${Date.now()}`;
    const screen = await openScreen(page, '/prescriptions', 'screen-prescriptions');
    await waitForLoaded(page);
    await screen.getByTestId('segment-prescriptions-reported').click();
    await waitForLoaded(page);
    const save = screen.getByTestId('btn-save-reported-med');
    await screen.getByTestId('input-reported-med-name').fill('   ');
    await expect(save).toBeDisabled();
    await screen.getByTestId('input-reported-med-name').fill(name);
    await screen.getByTestId('input-reported-med-dosage').fill('500 mg');
    await screen.getByTestId('input-reported-med-frequency').fill('Twice daily');
    await expect(save).toBeEnabled();
    await save.click();
    const row = screen.locator('[data-testid^="reported-med-"]', { hasText: name });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('input-reported-med-name')).toHaveValue('');

    const removeButton = row.locator('[data-testid^="btn-remove-reported-med-"]');
    await expect(removeButton).toHaveAccessibleName(/\S+/);
    await removeButton.click();
    const dialog = page.getByTestId('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('dialog-btn-cancel').click();
    await expect(row).toBeVisible();
    await removeButton.click();
    await dialog.getByTestId('dialog-btn-0').click();
    await expect(row).toHaveCount(0, { timeout: 60_000 });
  });

  test('back returns to the health hub', async ({ page }) => {
    const hub = await openScreen(page, '/health', 'screen-health');
    await hub.getByTestId('row-prescriptions').click();
    await expect(page.getByTestId('screen-prescriptions')).toBeVisible();
    await headerBack(page).click();
    await expect(hub).toBeVisible();
  });

  test('shows an error state with retry when prescriptions fail to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['prescriptions']);
    const screen = await openScreen(page, '/prescriptions', 'screen-prescriptions');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
  });
});
