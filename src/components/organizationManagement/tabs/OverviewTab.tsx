import { MapPin, Phone, Mail, Calendar, CreditCard, CheckCircle, Clock } from 'lucide-react';
import { Organization } from '../../../types/organizationManagement';
import { format } from 'date-fns';

interface OverviewTabProps {
  organization: Organization;
}

export default function OverviewTab({ organization }: OverviewTabProps) {
  const completedItems = organization.onboardingChecklist.filter((item) => item.completed).length;
  const totalItems = organization.onboardingChecklist.length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Organization Profile</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Legal Name
            </label>
            <div className="text-sm text-white">{organization.legalName}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Trade License
            </label>
            <div className="text-sm text-white font-mono">{organization.tradeLicense}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              DHA Facility License
            </label>
            <div className="text-sm text-white font-mono">{organization.dhaLicense}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Facility Type
            </label>
            <div className="text-sm text-white">{organization.facilityType}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Location</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-teal-400 mt-0.5" />
            <div>
              <div className="text-sm text-white">{organization.address}</div>
              <div className="text-xs text-slate-400">
                {organization.city}, {organization.emirate}
              </div>
            </div>
          </div>
          <div className="h-40 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center">
            <div className="text-sm text-slate-500">Map Embed Placeholder</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">Primary Contact</h3>
          <div className="space-y-2">
            <div className="text-sm text-white font-semibold">
              {organization.primaryContact.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Phone className="w-3 h-3" />
              {organization.primaryContact.phone}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="w-3 h-3" />
              {organization.primaryContact.email}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">Technical Contact</h3>
          <div className="space-y-2">
            <div className="text-sm text-white font-semibold">
              {organization.technicalContact.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Phone className="w-3 h-3" />
              {organization.technicalContact.phone}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="w-3 h-3" />
              {organization.technicalContact.email}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Contract Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Plan
            </label>
            <div className="text-sm text-white font-semibold">{organization.contract.plan}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Payment Status
            </label>
            <div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  organization.contract.paymentStatus === 'paid'
                    ? 'bg-green-600 bg-opacity-20 text-green-400'
                    : organization.contract.paymentStatus === 'pending'
                    ? 'bg-amber-600 bg-opacity-20 text-amber-400'
                    : 'bg-rose-600 bg-opacity-20 text-rose-400'
                }`}
              >
                {organization.contract.paymentStatus}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-teal-400 mt-0.5" />
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                Contract Start
              </label>
              <div className="text-sm text-white">
                {format(organization.contract.startDate, 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-teal-400 mt-0.5" />
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                Renewal Date
              </label>
              <div className="text-sm text-white">
                {format(organization.contract.renewalDate, 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase">Onboarding Progress</h3>
          <div className="text-sm font-bold text-white">
            {organization.onboardingProgress}% Complete
          </div>
        </div>
        <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-600 to-green-500 rounded-full"
            style={{ width: `${organization.onboardingProgress}%` }}
          ></div>
        </div>
        <div className="space-y-2">
          {organization.onboardingChecklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {item.completed ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-500" />
                )}
                <span
                  className={`text-sm ${
                    item.completed ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {item.completed && item.completedDate && (
                <span className="text-xs text-slate-500">
                  {format(item.completedDate, 'MMM dd, yyyy')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
