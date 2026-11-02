import { isAuthApiError } from '@supabase/supabase-js';
import i18n from 'i18next';

interface OtpRequestErrorOptions {
  isSignUp: boolean;
}

export const getOtpRequestErrorMessage = (
  message: string,
  { isSignUp }: OtpRequestErrorOptions
) => {
  const normalizedMessage = (message ?? '').trim().toLowerCase();

  if (!isSignUp && normalizedMessage.includes('signups not allowed for otp')) {
    return i18n.t('auth.errors.otpUnknownPhone', {
      defaultValue:
        'We could not sign you in with that phone number. Use the exact phone number linked to your account, including country code.',
    });
  }

  return message;
};

export const getOtpVerificationErrorMessage = (message: string) => {
  const normalizedMessage = (message ?? '').trim().toLowerCase();

  if (normalizedMessage === 'failed to fetch') {
    return i18n.t('auth.errors.otpNetwork', {
      defaultValue: 'We could not verify the code right now. Please request a fresh code and try again.',
    });
  }

  if (normalizedMessage.includes('token has expired or is invalid')) {
    return i18n.t('auth.errors.otpExpired', {
      defaultValue: 'That code is no longer valid. Request a new code and enter the latest message only.',
    });
  }

  return message;
};

export const getSignInErrorMessage = (error: Error): string => {
  if (isAuthApiError(error)) {
    if (error.code === 'invalid_credentials') {
      return i18n.t('auth.login.errors.invalidCredentials', {
        defaultValue: 'That email and password do not match. Check them and try again.',
      });
    }

    if (error.code === 'email_not_confirmed') {
      return i18n.t('auth.login.errors.emailNotConfirmed', {
        defaultValue: 'Confirm your email before signing in. Check your inbox for the confirmation link.',
      });
    }

    if (error.code === 'over_request_rate_limit') {
      return i18n.t('auth.login.errors.tooManyAttempts', {
        defaultValue: 'Too many sign-in attempts. Wait a few minutes and try again.',
      });
    }
  }

  if (error.message.trim().toLowerCase() === 'failed to fetch') {
    return i18n.t('auth.login.errors.network', {
      defaultValue: 'We could not reach CeenAiX. Check your connection and try again.',
    });
  }

  return error.message;
};
