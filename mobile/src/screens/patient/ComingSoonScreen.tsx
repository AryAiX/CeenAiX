import { Text } from 'react-native';
import { EmptyState, Screen } from '../../components/ui';

// Lightweight scaffold for patient tabs whose data binding is tracked in
// docs/mobile/checklist.md section 3 (Records, Prescriptions, Notifications,
// Lab results, Messages, Documents, AI chat). The navigation, theming, and
// shared infra are in place; the screen body lands per the checklist.
export function ComingSoonScreen({ title, body }: { title: string; body: string }): React.ReactElement {
  return (
    <Screen>
      <Text className="pb-3 pt-2 text-2xl font-bold text-slate-900">{title}</Text>
      <EmptyState title="Coming soon" body={body} />
    </Screen>
  );
}

export function RecordsScreen(): React.ReactElement {
  return (
    <ComingSoonScreen
      title="Records"
      body="Conditions, allergies, medications, and vaccinations from your health record will appear here."
    />
  );
}

export function NotificationsScreen(): React.ReactElement {
  return (
    <ComingSoonScreen
      title="Alerts"
      body="Appointment reminders, new messages, and lab-result alerts will appear here."
    />
  );
}
