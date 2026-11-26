import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { useDoctorPatients, useMessagingHub } from '../hooks';
import { useClinicMessageDoctors, useClinicMessagePatients } from '../hooks/use-clinic-message-contacts';
import { useAuth } from '../lib/auth-context';
import { MessagesWorkspace } from './MessagesWorkspace';

vi.mock('../hooks', () => ({ useMessagingHub: vi.fn(), useDoctorPatients: vi.fn() }));
vi.mock('../hooks/use-patient-care-team', () => ({
  usePatientCareTeam: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/use-clinic-message-contacts', () => ({
  MIN_PATIENT_SEARCH_LENGTH: 2,
  useClinicMessageDoctors: vi.fn(),
  useClinicMessagePatients: vi.fn(),
}));

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

const hub = (messages: Array<{ id: string; sender_id: string; body: string; edited_at?: string | null }>) => ({
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

const renderAs = (role: 'patient' | 'doctor' | 'pharmacy' | 'clinic', path: string) =>
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
  vi.mocked(useDoctorPatients).mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() } as never);
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

describe('MessagesWorkspace new conversation for doctors (QA-155)', () => {
  const setup = (patients: Array<{ id: string; name: string }>) => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' } } as never);
    const state = hub([{ id: 'm1', sender_id: 'other-1', body: 'Hello' }]);
    state.ensureDirectConversation.mockResolvedValue({ conversationId: 'conv-new' });
    vi.mocked(useMessagingHub).mockReturnValue(state as never);
    vi.mocked(useDoctorPatients).mockImplementation(
      (userId) => ({ data: userId ? patients : [], loading: false, error: null, refetch: vi.fn() }) as never
    );
    return state;
  };

  it('opens the existing conversation with a patient', async () => {
    setup([{ id: 'other-1', name: 'Other Person' }, { id: 'patient-2', name: 'Second Patient' }]);
    renderAs('doctor', '/doctor/messages/conv-1');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.messages.newMessage') }));
    const dialog = screen.getByRole('dialog', { name: i18n.t('doctor.messages.pickerTitle') });
    expect(within(dialog).getByText(i18n.t('doctor.messages.openExisting'))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /Other Person/ }));
    expect(landedAt).toBe('');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts a new conversation with a patient who has none yet', async () => {
    const state = setup([{ id: 'patient-2', name: 'Second Patient' }]);
    renderAs('doctor', '/doctor/messages/conv-1');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.messages.newMessage') }));
    await userEvent.click(screen.getByRole('button', { name: /Second Patient/ }));
    expect(state.ensureDirectConversation).toHaveBeenCalledWith('patient-2', expect.any(String));
  });

  it('filters the patient list by name', async () => {
    setup([{ id: 'p1', name: 'Amal Hassan' }, { id: 'p2', name: 'Omar Khalid' }]);
    renderAs('doctor', '/doctor/messages/conv-1');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.messages.newMessage') }));
    await userEvent.type(screen.getByPlaceholderText(i18n.t('doctor.messages.pickerSearch')), 'omar');
    expect(screen.getByRole('button', { name: /Omar Khalid/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Amal Hassan/ })).not.toBeInTheDocument();
  });

  it('only loads the patients while the picker is open', async () => {
    setup([{ id: 'p1', name: 'Amal Hassan' }]);
    vi.mocked(useDoctorPatients).mockClear();
    renderAs('doctor', '/doctor/messages/conv-1');
    expect(vi.mocked(useDoctorPatients).mock.calls.every(([userId]) => userId == null)).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.messages.newMessage') }));
    expect(vi.mocked(useDoctorPatients)).toHaveBeenLastCalledWith('doctor-1');
  });

  it('keeps the care-team picker for patients', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'patient-1' } } as never);
    vi.mocked(useMessagingHub).mockReturnValue(hub([{ id: 'm1', sender_id: 'other-1', body: 'Hello' }]) as never);
    renderAs('patient', '/patient/messages/conv-1');
    await userEvent.click(screen.getByTestId('messages-new-conversation'));
    expect(screen.getByTestId('care-team-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('patient-picker')).not.toBeInTheDocument();
  });
});

describe('MessagesWorkspace edited label (QA-156)', () => {
  it('shows "Edited" on changed messages, for the sender and the other person', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' } } as never);
    vi.mocked(useMessagingHub).mockReturnValue(
      hub([
        { id: 'mine', sender_id: 'doctor-1', body: 'Take 2 tablets', edited_at: '2026-11-19T09:05:00Z' },
        { id: 'theirs', sender_id: 'other-1', body: 'OK, thanks', edited_at: '2026-11-19T09:06:00Z' },
        { id: 'plain', sender_id: 'other-1', body: 'See you', edited_at: null },
      ]) as never
    );
    renderAs('doctor', '/doctor/messages/conv-1');
    expect(screen.getAllByText(i18n.t('messaging.edited'))).toHaveLength(2);
  });

  it('shows it in Arabic too', async () => {
    await i18n.changeLanguage('ar');
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'patient-1' } } as never);
    vi.mocked(useMessagingHub).mockReturnValue(
      hub([{ id: 'm', sender_id: 'other-1', body: 'تم التعديل', edited_at: '2026-11-19T09:05:00Z' }]) as never
    );
    renderAs('patient', '/patient/messages/conv-1');
    expect(screen.getByText('معدّلة')).toBeInTheDocument();
  });
});

describe('MessagesWorkspace labels for pharmacy and clinic (QA-157)', () => {
  it.each(['pharmacy', 'clinic'] as const)('shows real %s text in Arabic, not label names', async (role) => {
    await i18n.changeLanguage('ar');
    vi.mocked(useAuth).mockReturnValue({ user: { id: `${role}-1` } } as never);
    vi.mocked(useMessagingHub).mockReturnValue(hub([{ id: 'm1', sender_id: 'other-1', body: 'مرحبا' }]) as never);
    const { container } = renderAs(role, `/${role}/messages/conv-1`);
    expect(container.textContent ?? '').not.toMatch(/\b(pharmacy|clinic)\.messages\./);
    expect(screen.getByPlaceholderText(i18n.t(`${role}.messages.searchPlaceholder`))).toBeInTheDocument();
    expect(i18n.t(`${role}.messages.searchPlaceholder`)).not.toContain(`${role}.messages`);
  });
});

describe('MessagesWorkspace new conversation for clinics (QA-218)', () => {
  const setup = (
    doctors: Array<{ id: string; name: string }>,
    patients: (query: string) => Array<{ id: string; name: string }> = () => [],
    conversations = [conversation]
  ) => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-1' } } as never);
    const state = { ...hub([]), conversations, activeConversation: null, activeConversationId: null };
    state.ensureDirectConversation.mockResolvedValue({ conversationId: 'conv-new' });
    vi.mocked(useMessagingHub).mockReturnValue(state as never);
    vi.mocked(useClinicMessageDoctors).mockImplementation(
      (userId) => ({ data: userId ? doctors : [], loading: false, error: false }) as never
    );
    vi.mocked(useClinicMessagePatients).mockImplementation(
      (query) => ({ data: query.trim().length >= 2 ? patients(query) : [], loading: false, error: false }) as never
    );
    return state;
  };

  const renderClinicList = () =>
    render(
      <MemoryRouter initialEntries={['/clinic/messages']}>
        <Routes>
          <Route path="/clinic/messages" element={<MessagesWorkspace role="clinic" />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows a New message button on an empty Messages page', async () => {
    setup([{ id: 'doctor-1', name: 'Sara Ali' }], () => [], []);
    renderClinicList();
    await userEvent.click(screen.getByTestId('messages-empty-new-conversation'));
    const dialog = screen.getByRole('dialog', { name: 'Start a conversation' });
    expect(within(dialog).getByRole('button', { name: /Dr\. Sara Ali/ })).toBeInTheDocument();
    expect(within(dialog).getByText('Type at least 2 letters of a name or phone number to find a patient.')).toBeInTheDocument();
  });

  it('starts a conversation with one of the clinic\'s doctors', async () => {
    const state = setup([{ id: 'doctor-1', name: 'Sara Ali' }]);
    renderClinicList();
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    await userEvent.click(screen.getByRole('button', { name: /Dr\. Sara Ali/ }));
    expect(state.ensureDirectConversation).toHaveBeenCalledWith('doctor-1', expect.any(String));
    expect(landedAt).toBe('/clinic/messages/conv-new');
  });

  it('finds a patient by search and starts a conversation', async () => {
    const state = setup([], (query) => (query.toLowerCase().includes('am') ? [{ id: 'patient-9', name: 'Amal Hassan' }] : []));
    renderClinicList();
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    const dialog = screen.getByRole('dialog', { name: 'Start a conversation' });
    expect(within(dialog).getByText('No doctors are linked to your clinic yet.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('searchbox', { name: 'Search doctors and patients' }), 'am');
    await userEvent.click(within(dialog).getByRole('button', { name: /Amal Hassan/ }));
    expect(state.ensureDirectConversation).toHaveBeenCalledWith('patient-9', expect.any(String));
  });

  it('opens the existing conversation instead of starting a new one', async () => {
    const state = setup([{ id: 'other-1', name: 'Other Person' }]);
    renderClinicList();
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    const dialog = screen.getByRole('dialog', { name: 'Start a conversation' });
    expect(within(dialog).getByText('Open existing conversation')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /Other Person/ }));
    expect(state.ensureDirectConversation).not.toHaveBeenCalled();
    expect(landedAt).toBe('/clinic/messages/conv-1');
  });

  it('shows a plain message when the conversation cannot be started', async () => {
    const state = setup([{ id: 'doctor-1', name: 'Sara Ali' }]);
    state.ensureDirectConversation.mockResolvedValue({ conversationId: null });
    renderClinicList();
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    await userEvent.click(screen.getByRole('button', { name: /Dr\. Sara Ali/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This conversation could not be started. Please try again.');
  });

  it('only loads the doctors while the picker is open, and closes with Escape', async () => {
    setup([{ id: 'doctor-1', name: 'Sara Ali' }]);
    vi.mocked(useClinicMessageDoctors).mockClear();
    renderClinicList();
    expect(vi.mocked(useClinicMessageDoctors)).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    expect(vi.mocked(useClinicMessageDoctors)).toHaveBeenLastCalledWith('clinic-1');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('works in Arabic, right to left', async () => {
    await i18n.changeLanguage('ar');
    setup([{ id: 'doctor-1', name: 'Sara Ali' }]);
    renderClinicList();
    await userEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    const dialog = screen.getByRole('dialog', { name: 'بدء محادثة' });
    expect(dialog).toHaveAttribute('dir', 'rtl');
    expect(within(dialog).getByRole('button', { name: /د\. Sara Ali/ })).toBeInTheDocument();
  });
});

describe('MessagesWorkspace draft from a link (QA-274)', () => {
  const draftText = 'Regarding Hydrocortisone 1% cream & Zinc #2 + B: ';

  const renderFromLink = (role: 'pharmacy' | 'patient', path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={`/${role}/messages`} element={<MessagesWorkspace role={role} />} />
          <Route path={`/${role}/messages/:conversationId`} element={<MessagesWorkspace role={role} />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );

  it.each([
    ['pharmacy', `/pharmacy/messages?patient=patient-1&draft=${encodeURIComponent(draftText)}`],
    ['patient', `/patient/messages?doctor=doctor-1&draft=${encodeURIComponent(draftText)}`],
  ] as const)('keeps the whole %s draft, with %%, & , # and +, and does not crash', async (role, path) => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: `${role}-user` } } as never);
    const state = hub([]);
    state.ensureDirectConversation.mockResolvedValue({ conversationId: 'conv-1' });
    vi.mocked(useMessagingHub).mockReturnValue(state as never);

    renderFromLink(role, path);

    await waitFor(() => expect(document.getElementById(`${role}-message-draft`)).toHaveValue(draftText));
    expect(landedAt).toBe('');
    expect(state.ensureDirectConversation).toHaveBeenCalledTimes(1);
  });
});
