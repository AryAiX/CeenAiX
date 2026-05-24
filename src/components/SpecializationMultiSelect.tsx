import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { Specialization } from '../types';
import { FORM_FIELD_LIMITS } from '../lib/form-field-limits';
import { getSelectedSpecializations } from '../lib/doctor-specializations';

interface SpecializationMultiSelectProps {
  label: string;
  options: Specialization[] | null | undefined;
  selectedIds: string[] | null | undefined;
  onChange: (value: string[]) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  helperText?: string | null;
  selectionMode?: 'single' | 'multiple';
}

export const SpecializationMultiSelect = ({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = 'Search specializations',
  loading = false,
  disabled = false,
  helperText = null,
  selectionMode = 'multiple',
}: SpecializationMultiSelectProps) => {
  const [query, setQuery] = useState('');
  const safeOptions = useMemo(() => options ?? [], [options]);
  const safeSelectedIds = useMemo(() => selectedIds ?? [], [selectedIds]);

  const selectedOptions = useMemo(
    () => getSelectedSpecializations(safeSelectedIds, safeOptions),
    [safeOptions, safeSelectedIds]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return safeOptions;
    }

    return safeOptions.filter((option) => {
      return (
        option.name.toLowerCase().includes(normalizedQuery) ||
        option.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [safeOptions, query]);

  const toggleSelection = (specializationId: string) => {
    if (disabled) {
      return;
    }

    if (safeSelectedIds.includes(specializationId)) {
      onChange(safeSelectedIds.filter((id) => id !== specializationId));
      return;
    }

    if (selectionMode === 'single') {
      onChange([specializationId]);
      return;
    }

    onChange([...safeSelectedIds, specializationId]);
  };

  return (
    <div className="space-y-3">
      <span className="block text-sm font-semibold text-gray-700">{label}</span>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {selectedOptions.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleSelection(option.id)}
                className="inline-flex items-center gap-2 rounded-full bg-ceenai-cyan/10 px-3 py-1.5 text-sm font-medium text-ceenai-blue transition hover:bg-ceenai-cyan/20"
              >
                <span>{option.name}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={FORM_FIELD_LIMITS.searchQuery}
            disabled={disabled || loading}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-ceenai-cyan focus:ring-4 focus:ring-ceenai-cyan/10 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={placeholder}
          />
        </div>

        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Loading specializations...
            </div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isSelected = safeSelectedIds.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleSelection(option.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-ceenai-cyan bg-ceenai-cyan/10 text-ceenai-blue'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-ceenai-cyan/40 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{option.name}</p>
                    <p className="text-xs text-gray-500">{option.category}</p>
                  </div>
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              No matching specialties found.
            </div>
          )}
        </div>
      </div>

      {helperText ? <p className="text-sm text-gray-500">{helperText}</p> : null}
    </div>
  );
};
