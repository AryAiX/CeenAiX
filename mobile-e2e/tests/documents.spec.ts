import { commonScreenChecks, expect, failTables, headerBack, openScreen, test, waitForLoaded } from '../support/fixtures';

const UPLOAD_PROJECT = 'iphone-14';

test.describe('Documents', () => {
  test('renders my uploads and care documents segments', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/documents', 'screen-documents');
    await waitForLoaded(page);
    await expect(screen.getByTestId('segment-documents-mine')).toHaveAttribute('aria-selected', 'true');
    await expect(screen.locator('[data-testid^="document-card-"]').first().or(screen.getByTestId('state-empty-documents'))).toBeVisible();
    await screen.getByTestId('segment-documents-care').click();
    await expect(screen.getByTestId('segment-documents-care')).toHaveAttribute('aria-selected', 'true');
    await expect(screen.locator('[data-testid^="care-document-card-"]').first().or(screen.getByTestId('state-empty-care-documents'))).toBeVisible();
    await screen.getByTestId('segment-documents-mine').click();
    await commonScreenChecks(page, testInfo, screen, 'documents');
  });

  test('upload screen: file picker rows, save gating, oversized file rejected, back', async ({ page }, testInfo) => {
    const docs = await openScreen(page, '/documents', 'screen-documents');
    await waitForLoaded(page);
    await page.getByTestId('btn-upload-document').filter({ visible: true }).click();
    const screen = page.getByTestId('screen-document-upload');
    await expect(screen).toBeVisible();
    await expect(screen.getByTestId('btn-pick-camera')).toHaveCount(0);
    await expect(screen.getByTestId('btn-pick-library')).toBeVisible();
    await expect(screen.getByTestId('btn-save-document')).toBeDisabled();

    const chooser = page.waitForEvent('filechooser');
    await screen.getByTestId('btn-pick-files').click();
    await (await chooser).setFiles({ name: 'too-big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(30 * 1024 * 1024, 1) });
    await expect(screen.getByTestId('message-danger')).toBeVisible();
    await expect(screen.getByTestId('btn-save-document')).toBeDisabled();
    await commonScreenChecks(page, testInfo, screen, 'document-upload');
    await page.goBack();
    await expect(docs).toBeVisible();
  });

  test('uploads a real PDF to the vault and tries to remove it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== UPLOAD_PROJECT, `real upload runs once, on ${UPLOAD_PROJECT}`);
    test.setTimeout(240_000);
    const title = `QA e2e upload ${Date.now()}`;
    const docs = await openScreen(page, '/documents', 'screen-documents');
    await waitForLoaded(page);
    await page.getByTestId('btn-upload-document').filter({ visible: true }).click();
    const screen = page.getByTestId('screen-document-upload');
    const chooser = page.waitForEvent('filechooser');
    await screen.getByTestId('btn-pick-files').click();
    await (await chooser).setFiles({ name: 'qa-e2e.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% CeenAiX QA e2e upload\n%%EOF\n') });
    await expect(screen.getByTestId('card-selected-file')).toBeVisible();
    await expect(screen.getByTestId('input-document-title')).toHaveValue('qa-e2e');
    await screen.getByTestId('input-document-title').fill(title);
    await screen.getByTestId('input-document-description').fill('Created by Playwright QA');
    await screen.getByTestId('btn-save-document').click();
    await expect(docs).toBeVisible({ timeout: 90_000 });
    const card = docs.locator('[data-testid^="document-card-"]', { hasText: title });
    await expect(card).toBeVisible({ timeout: 60_000 });

    await card.locator('[data-testid^="btn-remove-document-"]').click();
    await expect(page.getByTestId('dialog')).toBeVisible();
    await page.getByTestId('dialog').getByTestId('dialog-btn-0').click();
    await expect(card, 'MB-013: removing a vault document should soft-delete it').toHaveCount(0, { timeout: 60_000 });
  });

  test('shows an error state with retry when the vault fails to load', async ({ page, consoleGuard }) => {
    await failTables(page, consoleGuard, ['patient_document_files']);
    const screen = await openScreen(page, '/documents', 'screen-documents');
    await expect(screen.getByTestId('state-error')).toBeVisible({ timeout: 60_000 });
    await expect(screen.getByTestId('btn-retry')).toBeVisible();
  });
});
