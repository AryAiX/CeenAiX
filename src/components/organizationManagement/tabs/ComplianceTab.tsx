import { Shield, AlertCircle, CheckCircle, Database, Clock } from 'lucide-react';
import { Organization } from '../../../types/organizationManagement';
import { format } from 'date-fns';

interface ComplianceTabProps {
  organization: Organization;
}

export default function ComplianceTab({ organization }: ComplianceTabProps) {
  const { compliance } = organization;

  const complianceChecklist = [
    {
      id: '1',
      category: 'Facility License',
      item: 'Valid DHA facility license uploaded',
      status: 'compliant' as const,
      lastChecked: new Date(),
    },
    {
      id: '2',
      category: 'Staff Credentials',
      item: 'All clinicians have valid DHA licenses',
      status: 'compliant' as const,
      lastChecked: new Date(),
    },
    {
      id: '3',
      category: 'Data Security',
      item: 'Data encryption in transit and at rest',
      status: 'compliant' as const,
      lastChecked: new Date(),
    },
    {
      id: '4',
      category: 'Privacy',
      item: 'Patient consent forms implemented',
      status: 'compliant' as const,
      lastChecked: new Date(),
    },
    {
      id: '5',
      category: 'NABIDH',
      item: 'NABIDH integration and daily sync',
      status: 'compliant' as const,
      lastChecked: new Date(),
    },
    {
      id: '6',
      category: 'Audit Trail',
      item: 'Complete audit logs maintained',
      status: 'compliant' as const,
      lastChecked: new Date(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-teal-400" />
            <h4 className="text-sm font-bold text-white uppercase">DHA Compliance Score</h4>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{compliance.dhaScore}/100</div>
          <div className="relative h-3 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-600 to-green-500 rounded-full"
              style={{ width: `${compliance.dhaScore}%` }}
            ></div>
          </div>
          {compliance.dhaScore >= 95 ? (
            <div className="mt-3 px-3 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400 inline-block">
              Excellent Compliance
            </div>
          ) : compliance.dhaScore >= 80 ? (
            <div className="mt-3 px-3 py-1 bg-teal-600 bg-opacity-20 border border-teal-600 rounded text-xs font-bold text-teal-400 inline-block">
              Good Compliance
            </div>
          ) : (
            <div className="mt-3 px-3 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400 inline-block">
              Needs Improvement
            </div>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-violet-400" />
            <h4 className="text-sm font-bold text-white uppercase">NABIDH Submission</h4>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {compliance.nabidhSubmissionRate}%
          </div>
          <div className="text-sm text-slate-400">
            Data submission success rate to NABIDH
          </div>
          {compliance.nabidhSubmissionRate >= 99 ? (
            <div className="mt-3 px-3 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400 inline-block">
              Excellent
            </div>
          ) : (
            <div className="mt-3 px-3 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400 inline-block">
              Needs Attention
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h4 className="text-sm font-bold text-white uppercase mb-4">Data Retention Policy</h4>
        <div className="flex items-center gap-3">
          {compliance.dataRetentionPolicyStatus === 'compliant' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm font-semibold text-white">Policy Compliant</div>
                <div className="text-xs text-slate-400">
                  Data retention policy meets DHA requirements
                </div>
              </div>
            </>
          ) : compliance.dataRetentionPolicyStatus === 'pending' ? (
            <>
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">Pending Review</div>
                <div className="text-xs text-slate-400">
                  Data retention policy awaiting approval
                </div>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <div>
                <div className="text-sm font-semibold text-white">Non-Compliant</div>
                <div className="text-xs text-slate-400">
                  Data retention policy requires immediate attention
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {compliance.outstandingItems.length > 0 && (
        <div className="bg-slate-800 border border-amber-600 border-opacity-30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white uppercase">Outstanding Items</h4>
            <span className="ml-auto px-2 py-1 bg-amber-600 bg-opacity-20 rounded text-xs font-bold text-amber-400">
              {compliance.outstandingItems.length} items
            </span>
          </div>
          <div className="space-y-3">
            {compliance.outstandingItems.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-slate-900 border border-slate-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      item.status === 'compliant'
                        ? 'bg-green-600 bg-opacity-20 text-green-400'
                        : item.status === 'pending'
                        ? 'bg-amber-600 bg-opacity-20 text-amber-400'
                        : 'bg-rose-600 bg-opacity-20 text-rose-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mb-2">{item.description}</div>
                {item.dueDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    Due: {format(item.dueDate, 'MMM dd, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h4 className="text-sm font-bold text-white uppercase mb-4">DHA Compliance Checklist</h4>
        <div className="space-y-2">
          {complianceChecklist.map((check) => (
            <div
              key={check.id}
              className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {check.status === 'compliant' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                <div>
                  <div className="text-sm text-white">{check.item}</div>
                  <div className="text-xs text-slate-500">{check.category}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Last checked: {format(check.lastChecked, 'MMM dd, yyyy')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors">
          Download Compliance Report
        </button>
        <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
          Schedule DHA Audit
        </button>
      </div>
    </div>
  );
}
