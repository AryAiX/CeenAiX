import { Monitor, CheckCircle, XCircle } from 'lucide-react';
import { Organization } from '../../../types/organizationManagement';

interface PortalsAccessTabProps {
  organization: Organization;
}

export default function PortalsAccessTab({ organization }: PortalsAccessTabProps) {
  const portals = [
    {
      id: 'doctor',
      name: 'Doctor Portal',
      description: 'Clinical workspace for physicians',
      enabled: true,
      features: [
        { id: 'consultation', name: 'Patient Consultation', enabled: true },
        { id: 'prescribing', name: 'E-Prescribing', enabled: true },
        { id: 'lab-orders', name: 'Lab Orders', enabled: true },
        { id: 'telemedicine', name: 'Telemedicine', enabled: true },
        { id: 'ai-assistant', name: 'AI Clinical Assistant', enabled: true },
      ],
    },
    {
      id: 'pharmacy',
      name: 'Pharmacy Portal',
      description: 'Prescription dispensing and inventory',
      enabled: organization.type === 'pharmacy' || organization.type === 'hospital',
      features: [
        { id: 'dispensing', name: 'Prescription Dispensing', enabled: true },
        { id: 'inventory', name: 'Inventory Management', enabled: true },
        { id: 'drug-interactions', name: 'Drug Interaction Alerts', enabled: true },
        { id: 'insurance', name: 'Insurance Verification', enabled: true },
      ],
    },
    {
      id: 'laboratory',
      name: 'Laboratory Portal',
      description: 'Lab test management and results',
      enabled: organization.type === 'laboratory' || organization.type === 'hospital',
      features: [
        { id: 'sample-management', name: 'Sample Management', enabled: true },
        { id: 'result-entry', name: 'Result Entry', enabled: true },
        { id: 'critical-values', name: 'Critical Value Alerts', enabled: true },
        { id: 'tat-monitoring', name: 'TAT Monitoring', enabled: true },
      ],
    },
    {
      id: 'patient',
      name: 'Patient Portal',
      description: 'Self-service portal for patients',
      enabled: true,
      features: [
        { id: 'health-records', name: 'Health Records Access', enabled: true },
        { id: 'appointments', name: 'Appointment Booking', enabled: true },
        { id: 'prescriptions', name: 'Prescription Refills', enabled: true },
        { id: 'ai-health', name: 'AI Health Assistant', enabled: true },
      ],
    },
    {
      id: 'admin',
      name: 'Organization Admin',
      description: 'Organization management and settings',
      enabled: true,
      features: [
        { id: 'user-management', name: 'User Management', enabled: true },
        { id: 'reporting', name: 'Reporting & Analytics', enabled: true },
        { id: 'billing', name: 'Billing Management', enabled: false },
        { id: 'compliance', name: 'Compliance Dashboard', enabled: true },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Portal Access Configuration</h3>
        <div className="text-sm text-slate-400">
          Configure which portals and features are available to this organization
        </div>
      </div>

      <div className="space-y-4">
        {portals.map((portal) => (
          <div
            key={portal.id}
            className={`bg-slate-800 border rounded-lg overflow-hidden ${
              portal.enabled ? 'border-slate-700' : 'border-slate-700 opacity-60'
            }`}
          >
            <div className="p-4 bg-slate-900 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-teal-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{portal.name}</h4>
                    <div className="text-xs text-slate-400">{portal.description}</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={portal.enabled}
                    onChange={() => {}}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>

            {portal.enabled && (
              <div className="p-4">
                <div className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Available Features
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {portal.features.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {feature.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-500" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.enabled ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {feature.name}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feature.enabled}
                          onChange={() => {}}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors">
          Reset to Default
        </button>
        <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
