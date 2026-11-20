import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { useMessagingHub } from '../hooks';
import { useAuth } from '../lib/auth-context';
import { MessagesWorkspace } from './MessagesWorkspace';

vi.mock('../hooks', () => ({ useMessagingHub: vi.fn() }));
vi.mock('../hooks/use-patient-care-team', () => ({
  usePatientCareTeam: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }));

const chip = (kind: string, href: string) =>
  `[[ceenaix-action:${encodeURIComponent(JSON.stringify({ kind, href }))}]]`;

const conversation = {
  id: 'conv-1',
  subject: 'Care conversation',
  createdAt: '2026-11-19T08:00:00Z',
  lastMessageAt: '2026-11-19T09:00:00Z',
  lastMessagePreview: 'Hello',
  unreadCount: 0,
  counterpart: { id: 'other-1', name: 'Other Person', email: null },
};

const hub = (messages: Array<{ id: string; sender_id: string; body: string }>) => ({
  conversations: [conversation],
  activeConversation: conversation,
  activeConversationId: 'conv-1',
  messages: messages.map((message) => ({ ...message, conversation_id: 'conv-1', sent_at: '2026-11-19T09:00:00Z', read_at: null })),
  loadingConversations: false,
  loadingMessages: false,
  working: false,
  conversationError: null,
  threadError: null,
  actionError: null,
  ensureDirectConversation: vi.fn(),
  sendMessage: vi.fn(),
  deleteMessage: vi.fn().mockResolvedValue(true),
  restoreMessage: vi.fn().mockResolvedValue(true),
  updateMessage: vi.fn(),
  refresh: vi.fn(),
});

let landedAt = '';
const Probe = () => {
  const location = useLocation();
  landedAt = `${location.pathname}${location.search}`;
  return null;
};

const renderAs = (role: 'patient' | 'doctor', path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={`/${role}/messages/:conversationId`} element={<MessagesWorkspace role={role} />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(async () => {
  await i18n.changeLanguage('en');
  landedAt = '';
});

describe('MessagesWorkspace chip links (QA-152)', () => {
  it('does not make a forged chip from the other person clickable', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' } } as never);
    vi.mocked(useMessagingHub).mockReturnValue(
      hub([{ id: 'm1', sender_id: 'other-1', body: `Please sign in ${chip('booking_link', 'https://evil.example/login')}` }]) as never
    );
    renderAs('doctor', '/doctor/messages/conv-1');
    expect(screen.getByText(/\[Link removed\]/)).toBeInTheDocument();
    expect(document.querySelector('a[href*="evil.example"]')).toBeNull();
  });

  it('opens a genuine chip inside the app, even if it was saved with another address', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'patient-1' } } as never);
    vi.mocked(useMessagingHub).mockReturnValue(
      hub([{ id: 'm2', sender_id: 'other-1', body: `See your records ${chip('records_link', 'http://192.168.1.20:5173/patient/records')}` }]) as never
    );
    renderAs('patient', '/patient/messages/conv-1');
    const link = document.querySelector('a[href="/patient/records"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('target')).toBeNull();
    await userEvent.click(link);
    expect(landedAt).toBe('/patient/records');
  });
});

describe('MessagesWorkspace attachments (QA-153)', () => {
  it.each(['doctor', 'patient'] as const)('offers no attach button to the %s, since files were never sent', (role) => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: `${role}-1` } } as never);
    vi.mocked(useMessagingHub).mockReturnValue(hub([{ id: 'm1', sender_id: 'other-1', body: 'Hello' }]) as never);
    renderAs(role, `/${role}/messages/conv-1`);
    expect(screen.queryByRole('button', { name: i18n.t('messaging.attach') })).not.toBeInTheDocument();
    expect(screen.queryByTitle(i18n.t('messaging.attachFile'))).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});

describe('MessagesWorkspace delete and undo (QA-154)', () => {
  const ownMessage = () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' } } as never);
    const state = hub([{ id: 'mine', sender_id: 'doctor-1', body: 'Please ignore this' }]);
    vi.mocked(useMessagingHub).mockReturnValue(state as never);
    return state;
  };

  it('deletes straight away, so leaving the page cannot cancel it', async () => {
    const state = ownMessage();
    const { unmount } = renderAs('doctor', '/doctor/messages/conv-1');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('messaging.delete') }));
    expect(state.deleteMessage).toHaveBeenCalledWith('mine');
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('messaging.messageDeleted'));
    unmount();
    expect(state.restoreMessage).not.toHaveBeenCalled();
  });

  it('puts the message back with Undo', async () => {
    const state = ownMessage();
    renderAs('doctor', '/doctor/messages/conv-1');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('messaging.delete') }));
    await userEvent.click(screen.getByRole('button', { name: i18n.t('messaging.undo') }));
    expect(state.restoreMessage).toHaveBeenCalledWith('mine');
    expect(screen.getByText('Please ignore this')).toBeInTheDocument();
  });

  it('shows the message again if the delete failed', async () => {
    const state = ownMessage();
    state.deleteMessage.mockResolvedValue(false);
    renderAs('doctor', '/doctor/messages/conv-1');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('messaging.delete') }));
    expect(await screen.findByText('Please ignore this')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
