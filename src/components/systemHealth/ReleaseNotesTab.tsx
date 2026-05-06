import { useState } from 'react';
import { Package, CheckCircle, Clock, Calendar, AlertTriangle, Upload, RotateCcw } from 'lucide-react';
import { MOCK_RELEASES } from '../../types/systemHealth';
import { format } from 'date-fns';

export default function ReleaseNotesTab() {
  const [showConfirmDeploy, setShowConfirmDeploy] = useState(false);
  const [deployTarget, setDeployTarget] = useState<'staging' | 'production' | null>(null);

  const handleDeploy = (target: 'staging' | 'production') => {
    setDeployTarget(target);
    setShowConfirmDeploy(true);
  };

  const confirmDeploy = () => {
    setShowConfirmDeploy(false);
    setDeployTarget(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
            <CheckCircle className="w-3 h-3" />
            Deployed
          </span>
        );
      case 'staging':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400">
            <Clock className="w-3 h-3" />
            Staging
          </span>
        );
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-600 bg-opacity-20 border border-violet-600 rounded text-xs font-bold text-violet-400">
            <Calendar className="w-3 h-3" />
            Planned
          </span>
        );
      default:
        return null;
    }
  };

  const deployedReleases = MOCK_RELEASES.filter(r => r.status === 'deployed');
  const plannedReleases = MOCK_RELEASES.filter(r => r.status === 'planned');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-teal-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Current Version</div>
          </div>
          <div className="text-3xl font-bold text-white">v3.2.1</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Deployed Releases</div>
          </div>
          <div className="text-3xl font-bold text-white">{deployedReleases.length}</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Upcoming Releases</div>
          </div>
          <div className="text-3xl font-bold text-white">{plannedReleases.length}</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Last Deployed</div>
          </div>
          <div className="text-sm font-bold text-white">
            {format(deployedReleases[0].deploymentDate, 'MMM dd, yyyy')}
          </div>
        </div>
      </div>

      {showConfirmDeploy && (
        <div className="bg-rose-900 bg-opacity-20 border border-rose-600 rounded-lg p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Confirm Deployment</h3>
              <div className="text-sm text-rose-300 mb-3">
                You are about to deploy to <span className="font-bold">{deployTarget}</span>. This
                action will affect live users. Please confirm that you want to proceed.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={confirmDeploy}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded transition-colors"
                >
                  Confirm Deploy
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDeploy(false);
                    setDeployTarget(null);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Version History</h3>
        <div className="space-y-4">
          {deployedReleases.map((release, idx) => (
            <div
              key={release.version}
              className={`border rounded-lg p-5 ${
                idx === 0
                  ? 'border-teal-600 bg-teal-900 bg-opacity-10'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-white">{release.version}</h4>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 bg-teal-600 rounded text-xs font-bold text-white">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Deployed: {format(release.deploymentDate, 'MMM dd, yyyy')}</span>
                      <span>•</span>
                      {getStatusBadge(release.status)}
                    </div>
                  </div>
                </div>
                {release.canRollback && (
                  <button className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rollback
                  </button>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">Changelog</h5>
                <ul className="space-y-2">
                  {release.changelog.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Upcoming Releases</h3>
        <div className="space-y-4">
          {plannedReleases.map((release) => (
            <div key={release.version} className="border border-violet-600 bg-violet-900 bg-opacity-10 rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-800 border border-violet-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-white">{release.version}</h4>
                      {getStatusBadge(release.status)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Planned: {format(release.deploymentDate, 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeploy('staging')}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Deploy to Staging
                  </button>
                  <button
                    onClick={() => handleDeploy('production')}
                    className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Deploy to Production
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-violet-800 rounded-lg p-4">
                <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Planned Features
                </h5>
                <ul className="space-y-2">
                  {release.changelog.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm">
                      <Clock className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-900 bg-opacity-20 border border-amber-600 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-amber-300 mb-1">Deployment Safeguards</div>
            <div className="text-xs text-amber-400">
              All production deployments require confirmation and include automatic rollback
              capability. Staging deployments are tested automatically before production rollout.
              Database migrations are executed separately and can be reverted independently.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
