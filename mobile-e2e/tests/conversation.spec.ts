import type { Locator, Page } from '@playwright/test';
import { commonScreenChecks, expect, isRtlProject, openScreen, test, waitForLoaded } from '../support/fixtures';

async function openFirstConversation(page: Page): Promise<Locator> {
  const list = await openScreen(page, '/messages', 'screen-messages');
  await waitForLoaded(page);
  const first = list.locator('[data-testid^="conversation-card-"]').first();
  test.skip((await first.count()) === 0, 'smoke patient has no conversations');
  await first.click();
  const screen = page.getByTestId('screen-conversation');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.locator('[data-testid^="chat-message-"]').first().or(screen.getByTestId('state-empty-thread'))).toBeVisible({ timeout: 60_000 });
  return screen;
}

async function longPress(page: Page, target: Locator): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error('message bubble has no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}

test.describe('Conversation', () => {
  test('renders the thread with accessible composer and back returns', async ({ page }, testInfo) => {
    const screen = await openFirstConversation(page);
    await expect(screen.getByTestId('input-message')).toHaveAccessibleName(/\S+/);
    await expect(screen.getByTestId('btn-send-message')).toHaveAccessibleName(/\S+/);
    await commonScreenChecks(page, testInfo, screen, 'conversation');
    await page.goBack();
    await expect(page.getByTestId('screen-messages')).toBeVisible();
  });

  test('send, edit and delete (with undo) an own message', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const screen = await openFirstConversation(page);
    const body = `QA automated message (${testInfo.project.name}) ${Date.now()}.`;
    const input = screen.getByTestId('input-message');
    await input.fill('   ');
    await expect(screen.getByTestId('btn-send-message')).toBeDisabled();

    await input.fill(body);
    await screen.getByTestId('btn-send-message').click();
    const own = screen.getByTestId('chat-message-own').filter({ hasText: body });
    await expect(own).toBeVisible({ timeout: 60_000 });
    await expect(input).toHaveValue('');

    if (isRtlProject(testInfo)) {
      const direction = await own.getByText(body).evaluate((el) => getComputedStyle(el).direction);
      expect(direction, 'MB-009: English message text should be LTR inside the Arabic UI').toBe('ltr');
    }

    await longPress(page, own);
    const dialog = page.getByTestId('dialog').or(page.getByTestId('action-sheet'));
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('dialog-btn-0').click();
    await expect(input).toHaveValue(body);
    await expect(screen.getByTestId('btn-cancel-edit')).toBeVisible();
    const edited = `${body} edited`;
    await input.fill(edited);
    await screen.getByTestId('btn-send-message').click();
    const editedBubble = screen.getByTestId('chat-message-own').filter({ hasText: edited });
    await expect(editedBubble).toBeVisible({ timeout: 60_000 });

    await longPress(page, editedBubble);
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('dialog-btn-1').click();
    await expect(screen.getByTestId('btn-undo-delete')).toBeVisible();
    await screen.getByTestId('btn-undo-delete').click();
    await expect(editedBubble).toBeVisible();

    await longPress(page, editedBubble);
    await dialog.getByTestId('dialog-btn-1').click();
    await expect(editedBubble).toHaveCount(0, { timeout: 60_000 });
    await page.reload();
    await expect(page.getByTestId('screen-conversation')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('chat-message-own').filter({ hasText: edited })).toHaveCount(0, { timeout: 30_000 });
  });

  test('unknown conversation id shows a not-found state without a composer (MB-011)', async ({ page }) => {
    const screen = await openScreen(page, '/conversation/00000000-0000-4000-8000-000000000000', 'screen-conversation');
    await expect(screen.getByTestId('state-empty-thread').or(screen.getByTestId('state-error')).or(screen.getByTestId('state-empty-conversation')).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('state-route-error')).toHaveCount(0);
    await expect(screen.getByTestId('state-empty-thread'), 'MB-011: an unknown thread must not look like an empty, writable thread').toHaveCount(0);
    await expect(screen.getByTestId('input-message'), 'MB-011: no composer for an unknown conversation').toHaveCount(0);
  });
});
