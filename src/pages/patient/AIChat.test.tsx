import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePatientDashboard, usePatientPreVisitAssessments } from '../../hooks';
import { usePatientAiChat } from '../../hooks/use-patient-ai-chat';
import { useQuery } from '../../hooks/use-query';
import { invokeAiChat, uploadAiChatAttachment } from '../../lib/ai';
import {
  buildAiChatTranscript,
  fetchAiChatMessageFeedback,
  setAiChatMessageFeedback,
  shareOrCopyText,
} from '../../lib/ai-chat-actions';
import { useAuth } from '../../lib/auth-context';
import { PatientAIChat } from './AIChat';

vi.mock('../../components/Navigation', () => ({
  Navigation: () => <div data-testid="patient-navigation" />,
}));

vi.mock('../../components/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  ),
}));

vi.mock('../../hooks/use-patient-ai-chat', () => ({
  usePatientAiChat: vi.fn(),
}));

vi.mock('../../hooks/use-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../../hooks', () => ({
  usePatientPreVisitAssessments: vi.fn(),
  usePatientDashboard: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(''), vi.fn()],
}));

vi.mock('../../lib/ai', () => ({
  invokeAiChat: vi.fn(),
  uploadAiChatAttachment: vi.fn(),
}));

vi.mock('../../lib/ai-chat-actions', () => ({
  fetchAiChatMessageFeedback: vi.fn(),
  setAiChatMessageFeedback: vi.fn(),
  copyText: vi.fn(),
  shareOrCopyText: vi.fn(),
  buildAiChatTranscript: vi.fn(),
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/canonical-record-updates', () => ({
  applyCanonicalUpdateRequests: vi.fn(),
  dismissCanonicalUpdateRequests: vi.fn(),
  fetchCanonicalUpdateRequests: vi.fn(),
  formatCanonicalValueForReview: (value: { value?: string | null; values?: string[]; name?: string | null; phone?: string | null }) =>
    Array.isArray(value.values)
      ? value.values.join(', ')
      : value.name || value.phone
        ? [value.name, value.phone].filter(Boolean).join(' • ')
        : value.value ?? 'None provided',
}));

describe('PatientAIChat', () => {
  const usePatientAiChatMock = vi.mocked(usePatientAiChat);
  const usePatientPreVisitAssessmentsMock = vi.mocked(usePatientPreVisitAssessments);
  const usePatientDashboardMock = vi.mocked(usePatientDashboard);
  const invokeAiChatMock = vi.mocked(invokeAiChat);
  const uploadAiChatAttachmentMock = vi.mocked(uploadAiChatAttachment);
  const useAuthMock = vi.mocked(useAuth);
  const useQueryMock = vi.mocked(useQuery);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { id: 'patient-1', email: 'parnia@example.com' },
      profile: { first_name: 'Parnia', full_name: 'Parnia Karimi' },
    } as never);
    usePatientPreVisitAssessmentsMock.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    usePatientDashboardMock.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    useQueryMock.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(fetchAiChatMessageFeedback).mockResolvedValue({});
    vi.mocked(setAiChatMessageFeedback).mockResolvedValue(undefined);
    vi.mocked(shareOrCopyText).mockResolvedValue('copied');
    vi.mocked(buildAiChatTranscript).mockReturnValue('TRANSCRIPT');
    uploadAiChatAttachmentMock.mockResolvedValue({
      type: 'uploaded_file',
      bucket: 'medical-files',
      path: 'patient-1/ai-chat/file.png',
      fileName: 'file.png',
      mimeType: 'image/png',
      size: 100,
    });
  });

  it('renders patient context counts and saved chat history', () => {
    usePatientAiChatMock.mockReturnValue({
      data: {
        sessionId: null,
        sessions: [
          {
            id: 'session-1',
            startedAt: '2026-03-21T09:00:00Z',
            lastMessageAt: '2026-03-21T09:00:00Z',
            preview: 'Your blood pressure history shows repeated follow-up visits.',
          },
        ],
        messages: [],
        contextSummary: {
          conditionsCount: 2,
          allergiesCount: 1,
          activeMedicationCount: 2,
          recentAppointmentsCount: 2,
          labResultCount: 1,
        },
        nextAppointment: {
          id: 'appointment-1',
          scheduledAt: '2026-03-22T09:00:00Z',
          chiefComplaint: 'Headache',
          doctorName: 'Doctor 1',
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PatientAIChat />);

    expect(screen.getAllByText('CeenAiX AI').length).toBeGreaterThan(0);
    expect(screen.getByText('Your Personal Health Assistant')).toBeInTheDocument();
    expect(screen.getByText(/Hi Parnia!/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attach file' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Explain my medications/i })
    ).toBeInTheDocument();
  });

  it('sends a new question and appends the assistant reply', async () => {
    const refetch = vi.fn();

    usePatientAiChatMock.mockReturnValue({
      data: {
        sessionId: null,
        sessions: [],
        messages: [],
        contextSummary: {
          conditionsCount: 2,
          allergiesCount: 1,
          activeMedicationCount: 1,
          recentAppointmentsCount: 2,
          labResultCount: 2,
        },
        nextAppointment: {
          id: 'appointment-1',
          scheduledAt: '2026-03-22T09:00:00Z',
          chiefComplaint: 'Cholesterol review',
          doctorName: 'Doctor 1',
        },
      },
      loading: false,
      error: null,
      refetch,
    });
    invokeAiChatMock.mockResolvedValue({
      sessionId: 'session-2',
      assistantMessage: {
        id: 'assistant-1',
        content: 'Your record shows hypertension and type 2 diabetes. Keep asking your doctor about blood pressure and glucose follow-up.',
        createdAt: '2026-03-21T10:15:00Z',
        attachments: [
          {
            type: 'response_metadata',
            intent: 'history_summary',
            usedPatientContext: true,
            mode: 'chat',
            recommendedSpecialty: null,
            evidence: [
              {
                sourceType: 'condition',
                sourceId: 'condition-1',
                title: 'Hypertension',
                excerpt: 'Active condition',
                eventDate: '2024-09-14',
                tags: ['hypertension'],
                score: 32,
                whyRelevant: 'Matched hypertension',
              },
            ],
            suggestedActions: [
              {
                type: 'navigate',
                label: 'Book an appointment',
                href: '/patient/appointments/book?reason=Summarize%20my%20history',
              },
            ],
            nextAppointmentId: null,
            nextAppointmentLabel: null,
          },
        ],
      },
      contextSummary: {
        conditionsCount: 2,
        allergiesCount: 1,
        activeMedicationCount: 1,
        recentAppointmentsCount: 2,
        labResultCount: 2,
      },
    });

    render(<PatientAIChat />);

    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: /Review my health history/i })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/Ask about your health/i), 'Summarize my history');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(invokeAiChatMock).toHaveBeenCalledWith({
        message: 'Summarize my history',
        sessionId: null,
        attachments: [],
        usePatientContext: true,
        mode: 'chat',
      });
    });

    expect(screen.getByText('Summarize my history')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Your record shows hypertension and type 2 diabetes. Keep asking your doctor about blood pressure and glucose follow-up.'
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Used: Hypertension')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book an appointment' })).toBeInTheDocument();
    // The first send creates a new session; the patient chat now refetches
    // its session list so the brand-new session shows up in the sidebar.
    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
  });

  it('shows pending chat-derived record updates for the active session', async () => {
    usePatientAiChatMock.mockReturnValue({
      data: {
        sessionId: 'session-1',
        sessions: [
          {
            id: 'session-1',
            startedAt: '2026-03-21T09:00:00Z',
            lastMessageAt: '2026-03-21T09:30:00Z',
            preview: 'I moved to Abu Dhabi.',
          },
        ],
        messages: [
          {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Thanks, I noted that for review.',
            createdAt: '2026-03-21T09:30:00Z',
            attachments: [],
          },
        ],
        contextSummary: {
          conditionsCount: 0,
          allergiesCount: 0,
          activeMedicationCount: 0,
          recentAppointmentsCount: 0,
          labResultCount: 0,
        },
        nextAppointment: null,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 'update-1',
          patientId: 'patient-1',
          sourceKind: 'ai_chat_message',
          sourceRecordId: 'message-1',
          targetField: 'profile.address',
          displayLabel: 'Address',
          applyStrategy: 'user_profile_scalar',
          currentValue: { value: 'Dubai Marina' },
          proposedValue: { value: 'Abu Dhabi' },
          status: 'pending',
          requiresDoctorReview: false,
          metadata: {
            sessionId: 'session-1',
            messagePreview: 'I moved to Abu Dhabi.',
          },
          confirmedAt: null,
          appliedAt: null,
          dismissedAt: null,
          createdAt: '2026-03-21T09:30:00Z',
          updatedAt: '2026-03-21T09:30:00Z',
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<PatientAIChat />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Chats/i }));
    await user.click(screen.getByTitle('I moved to Abu Dhabi.'));

    expect(await screen.findByText('Review updates from this chat')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Dubai Marina')).toBeInTheDocument();
    expect(screen.getByText('Abu Dhabi')).toBeInTheDocument();
  });
  it('rates a saved reply, asks the last question again and exports the chat (QA-074)', async () => {
    const userMessageId = '0a000000-0000-4000-8000-000000000001';
    const assistantMessageId = '0b000000-0000-4000-8000-000000000002';
    const savedMessages = [
      {
        id: userMessageId,
        role: 'user' as const,
        content: 'What does my HbA1c mean?',
        createdAt: '2026-03-21T09:29:00Z',
        attachments: [],
      },
      {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: 'HbA1c shows your average blood sugar over about three months.',
        createdAt: '2026-03-21T09:30:00Z',
        attachments: [],
      },
    ];
    const chatData = (messages: typeof savedMessages) => ({
      data: {
        sessionId: 'session-1',
        sessions: [
          {
            id: 'session-1',
            startedAt: '2026-03-21T09:00:00Z',
            lastMessageAt: '2026-03-21T09:30:00Z',
            preview: 'What does my HbA1c mean?',
          },
        ],
        messages,
        contextSummary: {
          conditionsCount: 0,
          allergiesCount: 0,
          activeMedicationCount: 0,
          recentAppointmentsCount: 0,
          labResultCount: 0,
        },
        nextAppointment: null,
      },
      loading: false,
      error: null,
      refetch,
    });
    // After sending, the real page reloads the chat; here the reload returns the new question and answer.
    const refetch = vi.fn(async () => {
      usePatientAiChatMock.mockReturnValue(
        chatData([
          ...savedMessages,
          { ...savedMessages[0], id: '0d000000-0000-4000-8000-000000000004', createdAt: '2026-03-21T09:31:00Z' },
          { ...savedMessages[1], id: '0c000000-0000-4000-8000-000000000003', content: 'A fresh answer.', createdAt: '2026-03-21T09:31:30Z' },
        ])
      );
    });
    usePatientAiChatMock.mockReturnValue(chatData(savedMessages));
    invokeAiChatMock.mockResolvedValue({
      sessionId: 'session-1',
      assistantMessage: {
        id: '0c000000-0000-4000-8000-000000000003',
        content: 'A fresh answer.',
        createdAt: '2026-03-21T09:31:00Z',
        attachments: [],
      },
      contextSummary: {
        conditionsCount: 0,
        allergiesCount: 0,
        activeMedicationCount: 0,
        recentAppointmentsCount: 0,
        labResultCount: 0,
      },
    });

    render(<PatientAIChat />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Chats/i }));
    await user.click(screen.getByTitle('What does my HbA1c mean?'));
    expect(await screen.findByText(/average blood sugar/)).toBeInTheDocument();

    // No "Coming soon" placeholders and no microphone or AI settings buttons any more.
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voice input' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AI settings' })).not.toBeInTheDocument();

    const helpful = screen.getByRole('button', { name: 'Helpful' });
    await user.click(helpful);
    await waitFor(() => expect(setAiChatMessageFeedback).toHaveBeenCalledWith(assistantMessageId, 1));
    expect(helpful).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Thanks for your feedback')).toBeInTheDocument();

    await user.click(helpful);
    await waitFor(() => expect(setAiChatMessageFeedback).toHaveBeenLastCalledWith(assistantMessageId, null));
    expect(helpful).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() =>
      expect(shareOrCopyText).toHaveBeenCalledWith(expect.stringContaining('average blood sugar'), expect.any(String))
    );

    await user.click(screen.getByRole('button', { name: 'Export chat' }));
    await waitFor(() => expect(buildAiChatTranscript).toHaveBeenCalled());
    expect(vi.mocked(buildAiChatTranscript).mock.calls[0][0]).toHaveLength(2);
    expect(shareOrCopyText).toHaveBeenLastCalledWith('TRANSCRIPT', expect.any(String));
    expect(await screen.findByText(/Conversation copied/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ask again' }));
    await waitFor(() =>
      expect(invokeAiChatMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'What does my HbA1c mean?', sessionId: 'session-1' })
      )
    );
    expect(await screen.findByText('A fresh answer.')).toBeInTheDocument();
  });
});
