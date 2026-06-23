import type { LabPage } from './shared/types';
import { LabShell, useLabContext } from './shared/LabShell';
import { EmptyState } from './shared/ui';

import { DashboardView } from './Dashboard';
import { LabQueuePage } from './Queue';
import { LabOrdersPage } from './Orders';
import { LabResultsPage } from './Results';
import { QualityControlView } from './QualityControl';
import { ImagingQueueView } from './ImagingQueue';
import { ImagingOrdersPage } from './ImagingOrders';
import { RadiologyReportsPage } from './RadiologyReports';
import { EquipmentPage } from './Equipment';
import { NabidhPage } from './Nabidh';
import { AnalyticsView } from './Analytics';
import { ProfilePage } from './Profile';
import { SettingsPage } from './Settings';

// ============================================================================
// Page body router
// ============================================================================

const LabPageBody = ({ page, context }: { page: LabPage; context: ReturnType<typeof useLabContext> }) => {
  if (context.loading && !context.data) {
    return <EmptyState label="Loading Lab & Radiology workspace..." />;
  }

  if (context.error) {
    return <EmptyState label={`Couldn't load the Lab & Radiology workspace: ${context.error}`} />;
  }

  switch (page) {
    case 'dashboard':
      return <DashboardView context={context} />;
    case 'queue':
      return <LabQueuePage context={context} />;
    case 'orders':
      return <LabOrdersPage context={context} />;
    case 'results':
      return <LabResultsPage context={context} />;
    case 'qc':
      return <QualityControlView context={context} />;
    case 'imaging-queue':
      return <ImagingQueueView context={context} />;
    case 'imaging-orders':
      return <ImagingOrdersPage context={context} />;
    case 'imaging-reports':
      return <RadiologyReportsPage context={context} />;
    case 'imaging-equipment':
      return <EquipmentPage data={context.data} department="radiology" />;
    case 'equipment':
      return <EquipmentPage data={context.data} department="laboratory" />;
    case 'nabidh':
      return <NabidhPage context={context} />;
    case 'analytics':
      return <AnalyticsView data={context.data} />;
    case 'profile':
      return <ProfilePage data={context.data} />;
    case 'settings':
      return <SettingsPage data={context.data} />;
    default:
      return null;
  }
};

const LabRoute = ({ page }: { page: LabPage }) => {
  const context = useLabContext();
  return (
    <LabShell page={page} context={context}>
      <LabPageBody page={page} context={context} />
    </LabShell>
  );
};

// ============================================================================
// Exports
// ============================================================================

export const LabDashboard = () => <LabRoute page="dashboard" />;
export const LabQueue = () => <LabRoute page="queue" />;
export const LabOrders = () => <LabRoute page="orders" />;
export const LabResults = () => <LabRoute page="results" />;
export const LabQualityControl = () => <LabRoute page="qc" />;
export const LabImagingQueue = () => <LabRoute page="imaging-queue" />;
export const LabImagingOrders = () => <LabRoute page="imaging-orders" />;
export const LabRadiologyReports = () => <LabRoute page="imaging-reports" />;
export const LabImagingEquipment = () => <LabRoute page="imaging-equipment" />;
export const LabEquipment = () => <LabRoute page="equipment" />;
export const LabNabidhSync = () => <LabRoute page="nabidh" />;
export const LabAnalytics = () => <LabRoute page="analytics" />;
export const LabProfile = () => <LabRoute page="profile" />;
export const LabSettings = () => <LabRoute page="settings" />;

export const LabReferrals = LabQueue;
export const LabResultEntry = LabResults;
export const LabRadiology = LabImagingQueue;
