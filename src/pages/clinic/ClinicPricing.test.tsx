import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicPricing from './ClinicPricing';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const SERVICES = [
  { id: 's1', name_en: 'General Consultation', category: 'consultation', default_duration_min: 30, default_price: 300, description_en: '', is_active: true },
  { id: 's2', name_en: 'Old Lab Test', category: 'Lab', default_duration_min: 15, default_price: 120, description_en: '', is_active: true },
];

/** facility_services: the first call loads the list, later calls answer with `saveResult`. */
const setup = (saveResult: { data: unknown; error: unknown }) => {
  const saveBuilders: MockSupabaseQueryBuilder<unknown>[] = [];
  let serviceCalls = 0;
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'clinic_portal_members') return createSupabaseQueryBuilder({ data: { facility_id: 'facility-1' }, error: null });
    if (table === 'facility_services') {
      serviceCalls += 1;
      if (serviceCalls === 1) return createSupabaseQueryBuilder({ data: SERVICES, error: null });
      const builder = createSupabaseQueryBuilder(saveResult);
      saveBuilders.push(builder);
      return builder;
    }
    return createSupabaseQueryBuilder({ data: [], error: null });
  }) as never);
  render(<ClinicPricing />);
  return saveBuilders;
};

const openAddForm = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Add Service/ }));
  return document.body.querySelector('form') as HTMLFormElement;
};

const fill = (form: HTMLElement, values: { name?: string; duration?: string; price?: string; category?: string }) => {
  if (values.name !== undefined) fireEvent.change(within(form).getByLabelText('Service Name'), { target: { value: values.name } });
  if (values.category !== undefined) fireEvent.change(within(form).getByLabelText('Category'), { target: { value: values.category } });
  if (values.duration !== undefined) fireEvent.change(within(form).getByLabelText('Duration (minutes)'), { target: { value: values.duration } });
  if (values.price !== undefined) fireEvent.change(within(form).getByLabelText('Price (AED)'), { target: { value: values.price } });
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-user-1' } } as never);
});

afterEach(() => {
  vi.mocked(supabase.from).mockReset();
  vi.restoreAllMocks();
});

describe('ClinicPricing Add / Edit Service form (QA-214)', () => {
  it('refuses an empty name and an empty price instead of saving a blank AED 0 service', async () => {
    const saves = setup({ data: null, error: null });
    const form = await openAddForm();
    fill(form, { duration: '0' });
    fireEvent.submit(form);

    expect(await within(form).findByText('Enter a service name.')).toBeInTheDocument();
    expect(within(form).getByText('Enter a price (0 for a free service).')).toBeInTheDocument();
    expect(within(form).getByText('Enter a whole number of minutes from 5 to 480.')).toBeInTheDocument();
    expect(within(form).getByLabelText('Service Name')).toHaveAttribute('aria-invalid', 'true');
    expect(saves).toHaveLength(0);
    expect(document.body.querySelector('form')).toBeInTheDocument();
  });

  it('refuses a negative price and a name another service already uses', async () => {
    const saves = setup({ data: null, error: null });
    const form = await openAddForm();
    fill(form, { name: 'general consultation', price: '-50' });
    fireEvent.submit(form);

    expect(await within(form).findByText('Another service already uses this name.')).toBeInTheDocument();
    expect(within(form).getByText('Enter a price from 0 to 100,000 AED, with up to 2 decimals.')).toBeInTheDocument();
    expect(saves).toHaveLength(0);
  });

  it('saves once, in lowercase category, shows the new service first and closes the form', async () => {
    const saved = { id: 's-new', name_en: 'Echo', category: 'procedure', default_duration_min: 45, default_price: 400, description_en: '', is_active: true };
    const saves = setup({ data: saved, error: null });
    const form = await openAddForm();
    fill(form, { name: ' Echo ', category: 'procedure', duration: '45', price: '400' });
    fireEvent.submit(form);
    fireEvent.submit(form); // double click

    await waitFor(() => expect(document.body.querySelector('form')).not.toBeInTheDocument());
    expect(saves).toHaveLength(1);
    expect(saves[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({ name_en: 'Echo', category: 'procedure', default_duration_min: 45, default_price: 400, facility_id: 'facility-1' })
    );
    const names = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(names[0]).toBe('Echo');
  });

  it('keeps the form open with what was typed and shows a plain message when the save fails', async () => {
    setup({ data: null, error: { code: '23514', message: 'new row violates check constraint "facility_services_values_chk"' } });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const form = await openAddForm();
    fill(form, { name: 'Echo', price: '400' });
    fireEvent.submit(form);

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'The service was not saved because a value is out of range. Check the name, price and duration.'
    );
    expect(screen.queryByText(/facility_services_values_chk/)).not.toBeInTheDocument();
    expect(within(form).getByLabelText('Service Name')).toHaveValue('Echo');
    expect(within(form).getByRole('button', { name: /Add Service/ })).toBeEnabled();
  });

  it('edits a service saved with an old capitalised category and stores it in lowercase', async () => {
    const saves = setup({ data: { ...SERVICES[1], category: 'lab', default_price: 150 }, error: null });
    const card = (await screen.findByText('Old Lab Test')).closest('div.rounded-2xl') as HTMLElement;
    expect(within(card).getByText('Lab')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: /Edit/ }));

    const form = document.body.querySelector('form') as HTMLFormElement;
    expect(within(form).getByLabelText('Category')).toHaveValue('lab');
    fill(form, { price: '150' });
    fireEvent.submit(form);

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].update).toHaveBeenCalledWith(expect.objectContaining({ category: 'lab', default_price: 150 }));
    expect(saves[0].eq).toHaveBeenCalledWith('id', 's2');
    await waitFor(() => expect(document.body.querySelector('form')).not.toBeInTheDocument());
  });

  it('filters by category even when the old page saved it capitalised', async () => {
    setup({ data: null, error: null });
    await screen.findByText('Old Lab Test');
    fireEvent.click(screen.getByRole('button', { name: 'Lab' }));
    expect(screen.getByText('Old Lab Test')).toBeInTheDocument();
    expect(screen.queryByText('General Consultation')).not.toBeInTheDocument();
  });
});
