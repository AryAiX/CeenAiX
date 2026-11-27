import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({
    children,
    title,
    subtitle,
    navItems,
  }: {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    navItems?: Array<{ href: string; badge?: number }>;
  }) => (
    <div>
      <header data-testid="shell-header">
        <span>{title}</span>
        <span>{subtitle}</span>
      </header>
      <nav hidden>
        {navItems?.map((navItem) => (
          <span key={navItem.href} data-testid={`badge-${navItem.href}`}>
            {navItem.badge ?? ''}
          </span>
        ))}
      </nav>
      {children}
    </div>
  ),
}));
vi.mock('../../components/MessagesWorkspace', () => ({
  MessagesWorkspace: ({ role }: { role: string }) => <div data-testid="workspace">{role}</div>,
}));
vi.mock('../../hooks', () => ({
  usePharmacyPrescriptionQueue: vi.fn(),
  usePharmacyUnreadMessages: vi.fn(),
}));

import { usePharmacyPrescriptionQueue, usePharmacyUnreadMessages } from '../../hooks';
import { PharmacyMessages } from './Messages';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/pharmacy/messages']}>
      <PharmacyMessages />
    </MemoryRouter>
  );

describe('PharmacyMessages menu badges (QA-275)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: {
        queue: [
          { id: 't1', prescriptionId: 'rx-1', workflowStatus: 'new', quantity: 1, isDispensed: false },
          { id: 't2', prescriptionId: 'rx-1', workflowStatus: 'new', quantity: 1, isDispensed: false },
          { id: 't3', prescriptionId: 'rx-2', workflowStatus: 'picked_up', quantity: 1, isDispensed: true },
        ],
        // The old demo table: not real messages, and ignored.
        messages: [{ unreadCount: 9 }],
        pendingPrescriptions: 3,
        lowStockAlerts: 2,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it('shows the real unread messages and the same prescription count as the other pages', () => {
    vi.mocked(usePharmacyUnreadMessages).mockReturnValue(4);
    renderPage();

    expect(screen.getByTestId('badge-/pharmacy/messages')).toHaveTextContent('4');
    expect(screen.getByTestId('badge-/pharmacy/dispensing')).toHaveTextContent('1');
    expect(screen.getByTestId('badge-/pharmacy/inventory')).toHaveTextContent('2');
    expect(screen.getByTestId('workspace')).toHaveTextContent('pharmacy');
  });

  it('shows no Messages badge when nothing is unread', () => {
    vi.mocked(usePharmacyUnreadMessages).mockReturnValue(0);
    renderPage();

    expect(screen.getByTestId('badge-/pharmacy/messages')).toHaveTextContent('');
  });
});

describe('PharmacyMessages header (QA-276, QA-277)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePharmacyUnreadMessages).mockReturnValue(undefined);
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() } as never);
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('makes no "Encrypted" claim and has no decorative chips', () => {
    renderPage();

    expect(screen.queryByText(/Encrypted/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Patient Communications')).not.toBeInTheDocument();
  });

  it('shows one heading, in the top bar, with one subtitle', () => {
    renderPage();

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByText('Messages')).toHaveLength(1);
    const header = screen.getByTestId('shell-header');
    expect(header).toHaveTextContent('Messages');
    expect(header).toHaveTextContent('Conversations with patients and care teams');
    expect(screen.queryByText(/Communicate with patients/)).not.toBeInTheDocument();
  });

  it('shows the heading in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderPage();

    const header = screen.getByTestId('shell-header');
    expect(header).toHaveTextContent('الرسائل');
    expect(header).toHaveTextContent('المحادثات مع المرضى وفرق الرعاية');
    expect((header.textContent ?? '').match(/[A-Za-z]+/g)).toBeNull();
  });
});
