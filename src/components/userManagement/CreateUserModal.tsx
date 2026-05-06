import { X, User, Briefcase, Mail } from 'lucide-react';
import { useState } from 'react';
import { UserRole, ROLE_LABELS, CreateUserData } from '../../types/userManagement';

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (data: CreateUserData) => void;
}

export default function CreateUserModal({ onClose, onCreate }: CreateUserModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateUserData>>({
    sendInvitation: true,
  });

  const roles: UserRole[] = [
    'patient',
    'doctor',
    'nurse',
    'pharmacist',
    'lab_technician',
    'pharmacy_admin',
    'lab_admin',
    'org_admin',
    'super_admin',
  ];

  const clinicianRoles: UserRole[] = ['doctor', 'nurse', 'pharmacist', 'lab_technician'];
  const isClinician = formData.role && clinicianRoles.includes(formData.role);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    onCreate(formData as CreateUserData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Create New User</h2>
            <div className="text-sm text-slate-400">Step {step} of 3</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <User className="w-4 h-4" />
            </div>
            <span
              className={`text-sm font-bold ${
                step >= 1 ? 'text-white' : 'text-slate-500'
              }`}
            >
              Basic Info
            </span>
          </div>
          <div className="flex-1 h-px bg-slate-700 mx-3"></div>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <Briefcase className="w-4 h-4" />
            </div>
            <span
              className={`text-sm font-bold ${
                step >= 2 ? 'text-white' : 'text-slate-500'
              }`}
            >
              Role Details
            </span>
          </div>
          <div className="flex-1 h-px bg-slate-700 mx-3"></div>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <Mail className="w-4 h-4" />
            </div>
            <span
              className={`text-sm font-bold ${
                step >= 3 ? 'text-white' : 'text-slate-500'
              }`}
            >
              Invitation
            </span>
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
                  placeholder="+971 50 123 4567"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Role *
                </label>
                <select
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Organization
                </label>
                <select
                  value={formData.organizationId || ''}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">Select an organization</option>
                  <option value="org-1">Mediclinic Dubai Mall</option>
                  <option value="org-2">Aster Pharmacy Marina</option>
                  <option value="org-3">NMC Royal Hospital</option>
                  <option value="org-5">Unilabs Dubai</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Emirates ID
                </label>
                <input
                  type="text"
                  value={formData.emiratesId || ''}
                  onChange={(e) => setFormData({ ...formData, emiratesId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600 font-mono"
                  placeholder="784-YYYY-XXXXXXX-X"
                />
              </div>

              {isClinician && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                      DHA License Number *
                    </label>
                    <input
                      type="text"
                      value={formData.dhaLicenseNumber || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, dhaLicenseNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600 font-mono"
                      placeholder="DHA-XX-YYYY-XXXXX"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                      DHA License Document
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, dhaLicenseDocument: file });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-600"
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      Upload DHA license certificate (PDF, JPG, PNG)
                    </div>
                  </div>
                </>
              )}

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="text-sm font-semibold text-white mb-2">Role Summary</div>
                <div className="text-xs text-slate-400">
                  <span className="text-white font-bold">{formData.role ? ROLE_LABELS[formData.role] : 'No role selected'}</span>
                  {isClinician && (
                    <div className="mt-2 text-amber-400">
                      This is a clinical role. DHA license verification is required.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="text-sm font-bold text-white uppercase mb-4">Review User Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white font-semibold">
                      {formData.firstName} {formData.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Role:</span>
                    <span className="text-white">{formData.role ? ROLE_LABELS[formData.role] : 'N/A'}</span>
                  </div>
                  {formData.dhaLicenseNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">DHA License:</span>
                      <span className="text-white font-mono">{formData.dhaLicenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sendInvitation}
                    onChange={(e) =>
                      setFormData({ ...formData, sendInvitation: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 bg-slate-900 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      Send invitation email
                    </div>
                    <div className="text-xs text-slate-400">
                      User will receive an email with a temporary password and instructions to activate
                      their account.
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-teal-900 bg-opacity-20 border border-teal-600 rounded-lg p-4">
                <div className="text-xs text-teal-400">
                  The user will be created with pending verification status. Once they verify their
                  email and complete the onboarding process, their account will be activated.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={step === 3 ? handleSubmit : handleNext}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {step === 3 ? 'Create User' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
