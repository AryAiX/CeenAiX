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
  deleteMessage: vi.fn(),
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
