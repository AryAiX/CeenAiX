import { useState, useMemo } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import StatsSummary from '../components/organizationManagement/StatsSummary';
import FilterPanel from '../components/organizationManagement/FilterPanel';
import OrganizationCard from '../components/organizationManagement/OrganizationCard';
import OrganizationDetailDrawer from '../components/organizationManagement/OrganizationDetailDrawer';
import { MOCK_ORGANIZATIONS } from '../types/organizationManagement';
import type { Organization, OrganizationFilters } from '../types/organizationManagement';

export default function OrganizationManagement() {
  const [activeSection, setActiveSection] = useState('organizations');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [filters, setFilters] = useState<OrganizationFilters>({
    search: '',
    types: [],
    statuses: [],
    emirates: [],
    insuranceNetwork: null,
    nabidhConnected: null,
  });

  const filteredOrganizations = useMemo(() => {
    return MOCK_ORGANIZATIONS.filter((org) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          org.name.toLowerCase().includes(searchLower) ||
          org.dhaLicense.toLowerCase().includes(searchLower) ||
          org.city.toLowerCase().includes(searchLower) ||
          org.emirate.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.types.length > 0 && !filters.types.includes(org.type)) {
        return false;
      }

      if (filters.statuses.length > 0 && !filters.statuses.includes(org.status)) {
        return false;
      }

      if (filters.emirates.length > 0 && !filters.emirates.includes(org.emirate)) {
        return false;
      }

      if (
        filters.insuranceNetwork !== null &&
        org.insuranceNetworkParticipation !== filters.insuranceNetwork
      ) {
        return false;
      }

      if (filters.nabidhConnected !== null && org.nabidhConnected !== filters.nabidhConnected) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const stats = useMemo(() => {
    const orgs = filteredOrganizations;
    return {
      hospitals: orgs.filter((o) => o.type === 'hospital').length,
      clinics: orgs.filter((o) => o.type === 'clinic').length,
      pharmacies: orgs.filter((o) => o.type === 'pharmacy').length,
      laboratories: orgs.filter((o) => o.type === 'laboratory').length,
      total: orgs.length,
    };
  }, [filteredOrganizations]);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="flex-1 flex flex-col">
        <AdminTopBar />

        <div className="flex-1 flex">
          <FilterPanel filters={filters} onFiltersChange={setFilters} />

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Organization Management</h1>
              <div className="text-sm text-slate-400">
                Manage all healthcare organizations on the CeenAiX platform
              </div>
            </div>

            <StatsSummary stats={stats} />

            {filteredOrganizations.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
                <div className="text-slate-400 mb-2">No organizations found</div>
                <div className="text-sm text-slate-500">
                  Try adjusting your filters or search criteria
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredOrganizations.map((org) => (
                  <OrganizationCard
                    key={org.id}
                    organization={org}
                    onView={() => setSelectedOrg(org)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOrg && (
        <OrganizationDetailDrawer
          organization={selectedOrg}
          onClose={() => setSelectedOrg(null)}
        />
      )}
    </div>
  );
}
