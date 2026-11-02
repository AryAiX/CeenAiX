import { AuthApiError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { getSignInErrorMessage } from './auth-error-messages';

const INVALID_CREDENTIALS =
  'That email and password do not match. Check them and try again.';
const EMAIL_NOT_CONFIRMED =
  'Confirm your email before signing in. Check your inbox for the confirmation link.';
const TOO_MANY_ATTEMPTS = 'Too many sign-in attempts. Wait a few minutes and try again.';
const NETWORK = 'We could not reach CeenAiX. Check your connection and try again.';

describe('getSignInErrorMessage', () => {
  it('maps invalid_credentials to a mismatch message', () => {
    const error = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');

    expect(getSignInErrorMessage(error)).toBe(INVALID_CREDENTIALS);
  });

  it('maps email_not_confirmed to the confirmation message', () => {
    const error = new AuthApiError('Email not confirmed', 400, 'email_not_confirmed');

    expect(getSignInErrorMessage(error)).toBe(EMAIL_NOT_CONFIRMED);
  });

  it('maps over_request_rate_limit to the wait message', () => {
    const error = new AuthApiError('Request rate limit reached', 429, 'over_request_rate_limit');

    expect(getSignInErrorMessage(error)).toBe(TOO_MANY_ATTEMPTS);
  });

  it('maps a Failed to fetch error to the network message', () => {
    const error = new AuthApiError('Failed to fetch', 0, undefined);

    expect(getSignInErrorMessage(error)).toBe(NETWORK);
  });

  it('returns an unrecognised error message unchanged', () => {
    const error = new AuthApiError('Something unexpected happened', 500, 'unexpected_failure');

    expect(getSignInErrorMessage(error)).toBe('Something unexpected happened');
  });

  it('leaves an already translated timeout message unchanged', () => {
    const message = 'Sign-in is taking too long. Check your connection and try again.';

    expect(getSignInErrorMessage(new Error(message))).toBe(message);
  });
});
