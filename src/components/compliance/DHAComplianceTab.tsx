import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle, Download, Calendar, ExternalLink } from 'lucide-react';
import { MOCK_COMPLIANCE_REQUIREMENTS, MOCK_UPCOMING_AUDITS, ComplianceStatus } from '../../types/compliance';
import { format } from 'date-fns';

export default function DHAComplianceTab() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Data Protection']);

  const complianceScore = 98.4;
  const totalRequirements = MOCK_COMPLIANCE_REQUIREMENTS.length;
  const compliantCount = MOCK_COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'compliant').length;
  const partialCount = MOCK_COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'partial').length;
  const nonCompliantCount = MOCK_COMPLIANCE_REQUIREMENTS.filter(r => r.status === 'non-compliant').length;

  const categories = Array.from(new Set(MOCK_COMPLIANCE_REQUIREMENTS.map(r => r.category)));

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
            <CheckCircle className="w-3 h-3" />
            Compliant
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Partial
          </span>
        );
      case 'non-compliant':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-600 bg-opacity-20 border border-rose-600 rounded text-xs font-bold text-rose-400">
            <XCircle className="w-3 h-3" />
            Non-Compliant
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-600 bg-opacity-20 border border-slate-600 rounded text-xs font-bold text-slate-400">
            N/A
          </span>
        );
    }
  };

  const getGaugeColor = (score: number) => {
    if (score >= 95) return '#10b981';
    if (score >= 85) return '#f59e0b';
    return '#f43f5e';
  };

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (complianceScore / 100) * circumference;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-sm font-bold text-white uppercase mb-4 text-center">
            Overall Compliance Score
          </h3>
          <div className="flex justify-center mb-4">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="12"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke={getGaugeColor(complianceScore)}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">{complianceScore}</div>
                  <div className="text-sm text-slate-400">/100</div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{compliantCount}</div>
              <div className="text-xs text-slate-400">Compliant</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{partialCount}</div>
              <div className="text-xs text-slate-400">Partial</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-400">{nonCompliantCount}</div>
              <div className="text-xs text-slate-400">Non-Compliant</div>
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase">Upcoming Audits</h3>
            <Calendar className="w-5 h-5 text-teal-400" />
          </div>
          <div className="space-y-3">
            {MOCK_UPCOMING_AUDITS.map((audit) => (
              <div
                key={audit.id}
                className="bg-slate-900 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          audit.type === 'audit'
                            ? 'bg-violet-600 bg-opacity-20 text-violet-400'
                            : 'bg-teal-600 bg-opacity-20 text-teal-400'
                        }`}
                      >
                        {audit.type === 'audit' ? 'Audit' : 'Deadline'}
                      </span>
                      <span className="text-sm font-bold text-white">{audit.title}</span>
                    </div>
                    <div className="text-xs text-slate-400">{audit.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {format(audit.date, 'MMM dd')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(audit.date, 'yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Generate DHA Compliance Report
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          DHA Digital Health Framework Requirements
        </h3>
        <div className="space-y-2">
          {categories.map((category) => {
            const categoryRequirements = MOCK_COMPLIANCE_REQUIREMENTS.filter(
              (r) => r.category === category
            );
            const isExpanded = expandedCategories.includes(category);

            return (
              <div key={category} className="border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-sm font-bold text-white">{category}</span>
                    <span className="text-xs text-slate-500">
                      ({categoryRequirements.length} requirements)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {categoryRequirements.some((r) => r.status === 'non-compliant') && (
                      <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                    )}
                    {categoryRequirements.every((r) => r.status === 'compliant') && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700">
                    {categoryRequirements.map((req) => (
                      <div
                        key={req.id}
                        className={`p-4 border-b border-slate-700 last:border-b-0 ${
                          req.status === 'non-compliant' || req.status === 'partial'
                            ? 'bg-rose-900 bg-opacity-10'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="text-sm text-white mb-2">{req.requirement}</div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-slate-400">
                                Last verified:{' '}
                                <span className="text-white">
                                  {format(req.lastVerified, 'MMM dd, yyyy')}
                                </span>
                              </span>
                              <span className="text-slate-400">
                                Responsible:{' '}
                                <span className="text-white">{req.responsiblePerson}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(req.status)}
                            {req.evidenceLink && (
                              <button className="p-1.5 hover:bg-slate-700 rounded transition-colors">
                                <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                              </button>
                            )}
                          </div>
                        </div>

                        {(req.status === 'non-compliant' || req.status === 'partial') &&
                          req.remediationPlan && (
                            <div className="bg-slate-900 border border-rose-600 rounded-lg p-3 mt-3">
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <div className="text-xs text-slate-400 mb-1">
                                    Remediation Plan
                                  </div>
                                  <div className="text-sm text-white">
                                    {req.remediationPlan}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-400 mb-1">Assigned To</div>
                                  <div className="text-sm text-white">{req.assignedOwner}</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-xs">
                                  <span className="text-slate-400">Due Date: </span>
                                  <span className="text-rose-400 font-bold">
                                    {req.dueDate && format(req.dueDate, 'MMM dd, yyyy')}
                                  </span>
                                </div>
                                <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors">
                                  Update Status
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
