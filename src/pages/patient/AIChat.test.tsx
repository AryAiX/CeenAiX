import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePatientDashboard, usePatientPreVisitAssessments } from '../../hooks';
import { usePatientAiChat } from '../../hooks/use-patient-ai-chat';
import { useQuery } from '../../hooks/use-query';
import { invokeAiChat, uploadAiChatAttachment } from '../../lib/ai';
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
    await user.type(screen.getByPlaceholderText(/Ask a question or add context/i), 'Summarize my history');
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
});
