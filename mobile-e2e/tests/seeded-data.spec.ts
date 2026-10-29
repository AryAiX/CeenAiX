import { expect, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

const LAB_ORDER_ID = '22222222-3333-4333-8444-000000000921';
const PRESCRIPTION_ID = '22222222-3333-4333-8444-000000000911';

test.describe('Seeded DEV data (main dc86283)', () => {
  test('MB-013: upload a vault document and remove it, leaving nothing behind', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const title = `QA seeded-check ${testInfo.project.name} ${Date.now()}`;
    const docs = await openScreen(page, '/documents', 'screen-documents');
    await waitForLoaded(page);
    await page.getByTestId('btn-upload-document').filter({ visible: true }).click();
    const screen = page.getByTestId('screen-document-upload');
    await expect(screen).toBeVisible();
    const chooser = page.waitForEvent('filechooser');
    await screen.getByTestId('btn-pick-files').click();
    await (await chooser).setFiles({ name: 'qa-seeded.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% CeenAiX QA seeded check\n%%EOF\n') });
    await expect(screen.getByTestId('card-selected-file')).toBeVisible();
    await screen.getByTestId('input-document-title').fill(title);
    await screen.getByTestId('btn-save-document').click();
    await expect(docs).toBeVisible({ timeout: 90_000 });
    const card = docs.locator('[data-testid^="document-card-"]', { hasText: title });
    await expect(card).toBeVisible({ timeout: 60_000 });

    await card.locator('[data-testid^="btn-remove-document-"]').click();
    await expect(page.getByTestId('dialog')).toBeVisible();
    await page.getByTestId('dialog').getByTestId('dialog-btn-0').click();
    await expect(card).toHaveCount(0, { timeout: 60_000 });
    await expect(docs.getByTestId('message-danger')).toHaveCount(0);

    // Persisted: still gone after a full reload.
    await page.reload();
    await expect(page.getByTestId('screen-documents')).toBeVisible({ timeout: 60_000 });
    await waitForLoaded(page);
    await expect(page.locator('[data-testid^="document-card-"]', { hasText: title })).toHaveCount(0);
    await expect(page.locator('[data-testid^="document-card-"]', { hasText: /^QA /i })).toHaveCount(0);
  });

  test('lab result detail for the seeded order shows HbA1c', async ({ page }) => {
    const list = await openScreen(page, '/lab-results', 'screen-lab-results');
    await waitForLoaded(page);
    const card = list.getByTestId(`lab-order-card-${LAB_ORDER_ID}`);
    await expect(card).toBeVisible();
    await card.click();
    const detail = page.getByTestId('screen-lab-result-detail').filter({ visible: true });
    await expect(detail).toBeVisible();
    await expect(detail.getByText(/HbA1c/i).first()).toBeVisible();
    await expect(detail.getByTestId('state-empty-lab-result')).toHaveCount(0);
    await expect(detail.getByTestId('btn-explain-with-ai')).toBeVisible();
    await headerBack(page).click();
    await expect(list).toBeVisible();
  });

  test('prescription detail shows Amoxicillin and the pharmacy picker lists QA Al Noor Pharmacy (no assignment)', async ({ page }) => {
    const list = await openScreen(page, '/prescriptions', 'screen-prescriptions');
    await waitForLoaded(page);
    const card = list.getByTestId(`prescription-card-${PRESCRIPTION_ID}`);
    await expect(card).toBeVisible();
    await card.click();
    const detail = page.getByTestId('screen-prescription-detail').filter({ visible: true });
    await expect(detail).toBeVisible();
    await expect(detail.getByText(/Amoxicillin/i).first()).toBeVisible();
    await detail.getByTestId('btn-send-to-pharmacy').click();
    const picker = page.getByTestId('screen-pharmacy-picker');
    await expect(picker).toBeVisible();
    await waitForLoaded(page);
    await expect(picker.getByText('QA Al Noor Pharmacy')).toBeVisible();
    await expect(picker.locator('[data-testid^="pharmacy-card-"]', { hasText: 'QA Al Noor Pharmacy' })).toBeVisible();
    // Do not assign: assigning a pharmacy updates the prescription and cannot be undone from the app.
    await picker.getByTestId('btn-close-sheet').click();
    await expect(picker).toHaveCount(0);
    await expect(detail).toBeVisible();
    await expect(detail.getByTestId('btn-send-to-pharmacy')).toBeVisible();
  });

  test('imaging list and detail show the MRI Brain study', async ({ page }) => {
    const list = await openScreen(page, '/imaging', 'screen-imaging');
    await waitForLoaded(page);
    const card = list.locator('[data-testid^="imaging-card-"]', { hasText: /MRI.*Brain|Brain.*MRI/i }).first();
    await expect(card).toBeVisible();
    await card.click();
    const detail = page.getByTestId('screen-imaging-detail').filter({ visible: true });
    await expect(detail).toBeVisible();
    await expect(detail.getByText(/Brain/i).first()).toBeVisible();
    await expect(detail.getByText('IMG-22222222')).toBeVisible();
    await headerBack(page).click();
    await expect(list).toBeVisible();
  });
});
