import { commonScreenChecks, expect, openScreen, test, tr } from '../support/fixtures';

test.describe('AI assistant (Assistant tab)', () => {
  test('renders starter, consent prompt, prompt chips and composer', async ({ page }, testInfo) => {
    const screen = await openScreen(page, '/assistant', 'screen-assistant');
    await expect(screen.getByTestId('btn-ai-consent-allow')).toBeVisible();
    await expect(screen.getByTestId('btn-ai-consent-deny')).toBeVisible();
    await expect(screen.getByTestId('prompt-chip-0')).toBeVisible();
    await expect(screen).toContainText(tr(testInfo, /998/, /998|٩٩٨/));
    const input = screen.getByTestId('input-assistant-message');
    await expect(input).toHaveAccessibleName(/\S+/);
    await expect(screen.getByTestId('btn-send-message')).toHaveAccessibleName(/\S+/);
    await expect(screen.getByTestId('btn-send-message')).toHaveAttribute('aria-disabled', 'true');
    await input.fill('Hello');
    await expect(screen.getByTestId('btn-send-message')).not.toHaveAttribute('aria-disabled', 'true');
    await commonScreenChecks(page, testInfo, screen, 'assistant');
  });

  test('consent choice updates the context indicator', async ({ page }) => {
    const screen = await openScreen(page, '/assistant', 'screen-assistant');
    const indicator = screen.getByTestId('btn-ai-context');
    const before = await indicator.innerText();
    await screen.getByTestId('btn-ai-consent-allow').click();
    await expect(screen.getByTestId('btn-ai-consent-allow')).toHaveCount(0);
    await expect(indicator).not.toHaveText(before);
    await indicator.click();
    await expect(page.getByTestId('dialog')).toBeVisible();
    await page.getByTestId('dialog-btn-cancel').click();
    await expect(page.getByTestId('dialog')).toHaveCount(0);
  });

  test('sends a message and receives an AI-generated reply', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const screen = await openScreen(page, '/assistant', 'screen-assistant');
    await screen.getByTestId('btn-ai-consent-deny').click();
    await screen.getByTestId('input-assistant-message').fill('In one short sentence, what is a normal resting heart rate?');
    await screen.getByTestId('btn-send-message').click();
    await expect(screen.getByTestId('chat-message-user')).toBeVisible();
    const reply = screen.getByTestId('chat-message-assistant').last();
    await expect(reply).toBeVisible({ timeout: 120_000 });
    await expect(reply).toContainText(tr(testInfo, 'AI-generated', 'مُنشأ بالذكاء الاصطناعي'));
    await expect(reply).toContainText(/\d/);
    await commonScreenChecks(page, testInfo, screen, 'assistant-reply');
  });

  test('history sheet opens and new chat resets the thread', async ({ page }) => {
    const screen = await openScreen(page, '/assistant', 'screen-assistant');
    await expect(screen.getByTestId('btn-assistant-history')).toHaveAccessibleName(/\S+/);
    await screen.getByTestId('btn-assistant-history').click();
    const history = page.getByTestId('screen-assistant-history');
    await expect(history).toBeVisible();
    await expect(history.getByTestId('btn-history-new-chat')).toBeVisible();
    await history.getByTestId('btn-history-new-chat').click();
    await expect(screen).toBeVisible();
    await expect(screen.getByTestId('prompt-chip-0')).toBeVisible();
  });
});
