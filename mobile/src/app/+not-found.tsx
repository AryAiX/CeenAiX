import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

// Unknown or currently-guarded paths (e.g. `/` while signed out on web, stale deep links)
// fall back to the entry point for the current auth state.
export default function NotFoundScreen(): React.ReactElement {
  const { session, isPatient, isRecovering, profile } = useAuth();
  if (!session) return <Redirect href="/sign-in" />;
  if (isRecovering) return <Redirect href="/reset-password" />;
  if (!isPatient) return <Redirect href="/patient-only" />;
  if (profile && !profile.profile_completed) return <Redirect href="/onboarding" />;
  return <Redirect href="/" />;
}
