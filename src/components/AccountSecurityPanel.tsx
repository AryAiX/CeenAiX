import { useState } from 'react';
import { AlertTriangle, KeyRound, ShieldAlert, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../lib/form-field-limits';
import { supabase } from '../lib/supabase';

const DELETE_TOKEN = 'DELETE';

interface AccountSecurityPanelProps {
  tone?: 'patient' | 'doctor';
}

export const AccountSecurityPanel = ({ tone = 'patient' }: AccountSecurityPanelProps) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { updatePassword, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const headerClass =
    tone === 'doctor'
      ? 'bg-gradient-to-r from-teal-600 to-emerald-600'
      : 'bg-gradient-to-r from-blue-600 to-cyan-600';
  const focusClass =
    tone === 'doctor'
      ? 'focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20'
      : 'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20';
  const primaryButtonClass =
    tone === 'doctor'
      ? 'bg-teal-600 hover:bg-teal-700'
      : 'bg-blue-600 hover:bg-blue-700';

  const handlePasswordUpdate = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (password.length < 8) {
      setPasswordError(t('accountSecurity.errorPasswordShort'));
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError(t('accountSecurity.errorPasswordMismatch'));
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updatePassword(password);
    setIsUpdatingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setPasswordMessage(t('accountSecurity.successPasswordUpdated'));
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);

    if (deleteConfirmation !== DELETE_TOKEN) {
      setDeleteError(t('accountSecurity.errorTypeDelete'));
      return;
    }

    if (!confirmDeleteOpen) {
      setConfirmDeleteOpen(true);
      return;
    }

    setIsDeletingAccount(true);
    const { error } = await supabase.rpc('delete_current_user_account');

    if (error) {
      setDeleteError(error.message);
      setIsDeletingAccount(false);
      return;
    }

    await signOut();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100/50 bg-white shadow-xl">
      <div className={`p-6 ${headerClass}`}>
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-white">{t('accountSecurity.title')}</h3>
            <p className="mt-1 text-sm text-white/85">{t('accountSecurity.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <KeyRound className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{t('accountSecurity.changePasswordTitle')}</h4>
              <p className="text-sm text-gray-600">{t('accountSecurity.changePasswordLead')}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {t('accountSecurity.newPassword')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                maxLength={FORM_FIELD_LIMITS.password}
                className={`w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all ${focusClass}`}
                placeholder={t('accountSecurity.newPasswordPlaceholder')}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {t('accountSecurity.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                maxLength={FORM_FIELD_LIMITS.password}
                className={`w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all ${focusClass}`}
                placeholder={t('accountSecurity.confirmPasswordPlaceholder')}
              />
            </div>
          </div>

          {passwordError ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {passwordError}
            </div>
          ) : null}

          {passwordMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {passwordMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handlePasswordUpdate}
            disabled={isUpdatingPassword}
            className={`mt-5 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${primaryButtonClass}`}
          >
            {isUpdatingPassword ? t('accountSecurity.updatingPassword') : t('accountSecurity.updatePassword')}
          </button>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{t('accountSecurity.deleteTitle')}</h4>
              <p className="text-sm text-gray-600">{t('accountSecurity.deleteLead')}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t('accountSecurity.deleteWarningPrefix')}
                <span className="font-bold">{DELETE_TOKEN}</span>
                {t('accountSecurity.deleteWarningSuffix')}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t('accountSecurity.confirmationLabel')}
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(event) => {
                setDeleteConfirmation(event.target.value);
                setConfirmDeleteOpen(false);
              }}
              maxLength={FORM_FIELD_LIMITS.shortText}
              className={`w-full rounded-xl border-2 border-red-200 bg-white px-4 py-3 transition-all ${focusClass}`}
              placeholder={t('accountSecurity.deleteInputPlaceholder')}
            />
          </div>

          {deleteError ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700"
            >
              {deleteError}
            </div>
          ) : null}

          {confirmDeleteOpen ? (
            <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t('accountSecurity.confirmDeleteDialog')}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeletingAccount
              ? t('accountSecurity.deletingAccount')
              : confirmDeleteOpen
                ? t('accountSecurity.confirmDeleteButton', { defaultValue: 'Confirm permanent deletion' })
                : t('accountSecurity.deleteButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
