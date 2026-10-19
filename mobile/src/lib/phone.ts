/** Normalizes user-typed numbers to E.164, defaulting local `05x` numbers to +971 (UAE). */
export const normalizePhone = (value: string): string => {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+971${digits.slice(1)}`;
  return digits ? `+${digits}` : '';
};
