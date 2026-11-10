import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: {} }));

import { buildAiChatTranscript, shareOrCopyText } from './ai-chat-actions';

const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

const setNavigator = (key: 'share' | 'clipboard', value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });

afterEach(() => {
  if (originalShare) Object.defineProperty(navigator, 'share', originalShare);
  else delete (navigator as unknown as Record<string, unknown>).share;
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete (navigator as unknown as Record<string, unknown>).clipboard;
});

describe('shareOrCopyText', () => {
  it('uses the share sheet when the phone has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator('share', share);
    await expect(shareOrCopyText('hello', 'Title')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Title', text: 'hello' });
  });

  it('treats closing the share sheet as cancelled, not as an error', async () => {
    setNavigator('share', vi.fn().mockRejectedValue(Object.assign(new Error('closed'), { name: 'AbortError' })));
    await expect(shareOrCopyText('hello')).resolves.toBe('cancelled');
  });

  it('copies the text when sharing is not available', async () => {
    setNavigator('share', undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator('clipboard', { writeText });
    await expect(shareOrCopyText('hello')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hello');
  });
});

describe('buildAiChatTranscript', () => {
  it('lists each message with who said it and ends with the disclaimer', () => {
    const text = buildAiChatTranscript(
      [
        { role: 'user', content: 'Question?', createdAt: '2026-03-21T09:29:00Z' },
        { role: 'system', content: 'hidden', createdAt: '2026-03-21T09:29:30Z' },
        { role: 'assistant', content: ' Answer. ', createdAt: '2026-03-21T09:30:00Z' },
      ],
      {
        title: 'Chat',
        exportedOn: 'Exported today',
        you: 'You',
        assistant: 'Ceen Agent',
        disclaimer: 'Check with your care team.',
        formatTime: () => '09:30',
      }
    );
    expect(text).toBe(
      ['Chat', 'Exported today', '', 'You (09:30):', 'Question?', '', 'Ceen Agent (09:30):', 'Answer.', '', 'Check with your care team.'].join('\n')
    );
  });
});
