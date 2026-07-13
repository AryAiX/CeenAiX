import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDoctorPatients,
  useLabTestCatalogSearch,
  useQuery,
} from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder } from '../../test/supabase-mock';
import type { LabTestCatalog, LabTestCatalogSuggestion } from '../../types';
import { CreateLabOrder } from './CreateLabOrder';

vi.mock('../../hooks', () => ({
  useDoctorPatients: vi.fn(),
  useLabTestCatalogSearch: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const makeCatalog = (
  overrides: Partial<LabTestCatalog> & Pick<LabTestCatalog, 'id' | 'source' | 'display_name_en'>
): LabTestCatalog => ({
  source_code: null,
  loinc_class: null,
  category: null,
  display_name_ar: null,
  short_name_en: null,
  specimen: null,
  property: null,
  is_panel: false,
  is_active: true,
  is_custom: overrides.source === 'custom',
  source_updated_at: null,
  last_synced_at: null,
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
  ...overrides,
});

const makeSuggestion = (
  overrides: Partial<LabTestCatalogSuggestion> &
    Pick<LabTestCatalogSuggestion, 'id' | 'proposed_display_name_en'>
): LabTestCatalogSuggestion => ({
  lab_test_catalog_id: null,
  approved_lab_test_catalog_id: null,
  suggestion_type: 'new_lab_test',
  status: 'pending',
  proposed_source_code: null,
  proposed_display_name_ar: null,
  proposed_short_name_en: null,
  proposed_specimen: null,
  proposed_property: null,
  proposed_category: null,
  proposed_loinc_class: null,
  proposed_is_panel: false,
  review_notes: null,
  created_by: 'doctor-1',
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
  ...overrides,
});

describe('CreateLabOrder metadata persistence', () => {
  const useDoctorPatientsMock = vi.mocked(useDoctorPatients);
  const useLabTestCatalogSearchMock = vi.mocked(useLabTestCatalogSearch);
  const useQueryMock = vi.mocked(useQuery);
  const useAuthMock = vi.mocked(useAuth);
  const fromMock = vi.mocked(supabase.from);

  const labOrderBuilder = createSupabaseQueryBuilder({
    data: { id: 'lab-order-1' },
    error: null,
  });
  const labOrderItemsBuilder = createSupabaseQueryBuilder({
    data: null,
    error: null,
  });
  const notificationsBuilder = createSupabaseQueryBuilder({
    data: null,
    error: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { id: 'doctor-1' } } as never);
    useDoctorPatientsMock.mockReturnValue({
      data: [{ id: 'patient-1', name: 'Patient One' }],
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
    fromMock.mockImplementation(
      ((table: string) => {
        if (table === 'lab_orders') {
          return labOrderBuilder;
        }
        if (table === 'lab_order_items') {
          return labOrderItemsBuilder;
        }
        if (table === 'notifications') {
          return notificationsBuilder;
        }
        throw new Error(`Unexpected table ${table}`);
      }) as never
    );
  });

  const renderWithMatches = (
    catalogMatches: LabTestCatalog[],
    pendingSuggestionMatches: Array<
      LabTestCatalogSuggestion & {
        displayNameEn: string;
        displayNameAr: string | null;
        fallbackCatalog: LabTestCatalog | null;
      }
    > = []
  ) => {
    useLabTestCatalogSearchMock.mockReturnValue({
      data: {
        catalogMatches: catalogMatches.map((catalog) => ({
          ...catalog,
          displayNameEn: catalog.display_name_en,
          displayNameAr: catalog.display_name_ar,
        })),
        pendingSuggestionMatches,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    return render(
      <MemoryRouter>
        <CreateLabOrder />
      </MemoryRouter>
    );
  };

  const selectPatient = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.selectOptions(screen.getByLabelText('Patient'), 'patient-1');
  };

  const saveOrder = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /save lab order/i }));
    await waitFor(() => expect(labOrderItemsBuilder.insert).toHaveBeenCalled());
  };

  it('writes an authoritative LOINC code and specimen from a LOINC catalog selection', async () => {
    const loinc = makeCatalog({
      id: 'catalog-loinc',
      source: 'loinc',
      source_code: '58410-2',
      display_name_en: 'Complete Blood Count',
      specimen: 'Blood',
    });
    renderWithMatches([loinc]);
    const user = userEvent.setup();

    await selectPatient(user);
    await user.type(screen.getByPlaceholderText(/search by test name/i), 'Complete');
    await user.click(screen.getByRole('button', { name: /Complete Blood Count/i }));
    await saveOrder(user);

    expect(labOrderItemsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        test_code: '58410-2',
        loinc_code: '58410-2',
        specimen_type: 'Blood',
      }),
    ]);
  });

  it('keeps a custom catalog code out of loinc_code', async () => {
    const custom = makeCatalog({
      id: 'catalog-custom',
      source: 'custom',
      source_code: 'CUSTOM-CMP-1',
      display_name_en: 'Custom Metabolic Panel',
      specimen: 'Serum',
    });
    renderWithMatches([custom]);
    const user = userEvent.setup();

    await selectPatient(user);
    await user.type(screen.getByPlaceholderText(/search by test name/i), 'Custom');
    await user.click(screen.getByRole('button', { name: /Custom Metabolic Panel/i }));
    await saveOrder(user);

    expect(labOrderItemsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        test_code: 'CUSTOM-CMP-1',
        loinc_code: null,
        specimen_type: 'Serum',
      }),
    ]);
  });

  it('keeps an unresolved suggestion code only in test_code', async () => {
    const suggestion = makeSuggestion({
      id: 'suggestion-1',
      proposed_display_name_en: 'Novel Marker',
      proposed_source_code: 'SUGGESTED-42',
      proposed_specimen: 'Plasma',
    });
    renderWithMatches([], [
      {
        ...suggestion,
        displayNameEn: 'Novel Marker',
        displayNameAr: null,
        fallbackCatalog: null,
      },
    ]);
    const user = userEvent.setup();

    await selectPatient(user);
    await user.type(screen.getByPlaceholderText(/search by test name/i), 'Novel');
    await user.click(screen.getByRole('button', { name: /Novel Marker/i }));
    await saveOrder(user);

    expect(labOrderItemsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        test_code: 'SUGGESTED-42',
        loinc_code: null,
        specimen_type: 'Plasma',
      }),
    ]);
  });

  it('writes null specimen_type when catalog specimen metadata is empty', async () => {
    const loinc = makeCatalog({
      id: 'catalog-empty-specimen',
      source: 'loinc',
      source_code: '94500-6',
      display_name_en: 'Respiratory Pathogen Test',
      specimen: '   ',
    });
    renderWithMatches([loinc]);
    const user = userEvent.setup();

    await selectPatient(user);
    await user.type(screen.getByPlaceholderText(/search by test name/i), 'Respiratory');
    await user.click(screen.getByRole('button', { name: /Respiratory Pathogen Test/i }));
    await saveOrder(user);

    expect(labOrderItemsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        test_code: '94500-6',
        loinc_code: '94500-6',
        specimen_type: null,
      }),
    ]);
  });

  it('persists source-aware metadata for a mixed multi-item order', async () => {
    const loinc = makeCatalog({
      id: 'catalog-loinc',
      source: 'loinc',
      source_code: '58410-2',
      display_name_en: 'Complete Blood Count',
      specimen: 'Blood',
    });
    const custom = makeCatalog({
      id: 'catalog-custom',
      source: 'custom',
      source_code: 'CUSTOM-CMP-1',
      display_name_en: 'Custom Metabolic Panel',
      specimen: 'Serum',
    });
    renderWithMatches([loinc, custom]);
    const user = userEvent.setup();

    await selectPatient(user);
    await user.type(screen.getByPlaceholderText(/search by test name/i), 'Complete');
    await user.click(screen.getByRole('button', { name: /Complete Blood Count/i }));
    await user.click(screen.getByRole('button', { name: /^add test$/i }));
    await user.type(screen.getAllByPlaceholderText(/search by test name/i)[1], 'Custom');
    const customOptions = screen.getAllByRole('button', { name: /Custom Metabolic Panel/i });
    await user.click(customOptions[customOptions.length - 1]);
    await saveOrder(user);

    expect(labOrderItemsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        test_name: 'Complete Blood Count',
        test_code: '58410-2',
        loinc_code: '58410-2',
        specimen_type: 'Blood',
      }),
      expect.objectContaining({
        test_name: 'Custom Metabolic Panel',
        test_code: 'CUSTOM-CMP-1',
        loinc_code: null,
        specimen_type: 'Serum',
      }),
    ]);
  });
});
