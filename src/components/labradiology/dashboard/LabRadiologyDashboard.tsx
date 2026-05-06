import React, { useState } from 'react';
import CriticalBanner from './CriticalBanner';
import { LabKpiRow, RadKpiRow } from './KpiRows';
import LabQueuePanel from './LabQueuePanel';
import ImagingQueuePanel from './ImagingQueuePanel';
import SharedRightPanel from './SharedRightPanel';
import { LabSample, ImagingStudy } from '../../../data/diagnosticsData';
import { DeptFilter } from '../LabRadiologyTopBar';
import LabSampleDetail from '../panels/LabSampleDetail';
import StudyDetail from '../panels/StudyDetail';

interface LabRadiologyDashboardProps {
  deptFilter: DeptFilter;
}

const LabRadiologyDashboard: React.FC<LabRadiologyDashboardProps> = ({ deptFilter }) => {
  const [selectedSample, setSelectedSample] = useState<LabSample | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);

  const showLab = deptFilter === 'all' || deptFilter === 'lab';
  const showRad = deptFilter === 'all' || deptFilter === 'radiology';

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: '#F8FAFC' }}>
      <CriticalBanner />

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-4">
          {/* KPI Rows */}
          {showLab && <LabKpiRow />}
          {showRad && <RadKpiRow />}

          {/* 3-column main layout */}
          <div className="grid gap-4" style={{ gridTemplateColumns: showLab && showRad ? '1fr 1fr 280px' : showLab ? '1fr 280px' : showRad ? '1fr 280px' : '1fr' }}>
            {showLab && (
              <div style={{ height: 'calc(100vh - 340px)', minHeight: 500 }}>
                <LabQueuePanel onSelectSample={s => { setSelectedSample(s); setSelectedStudy(null); }} />
              </div>
            )}
            {showRad && (
              <div style={{ height: 'calc(100vh - 340px)', minHeight: 500 }}>
                <ImagingQueuePanel onSelectStudy={s => { setSelectedStudy(s); setSelectedSample(null); }} />
              </div>
            )}
            <SharedRightPanel />
          </div>
        </div>
      </div>

      {/* Detail Panels */}
      {selectedSample && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedSample(null)} />
          <LabSampleDetail sample={selectedSample} onClose={() => setSelectedSample(null)} />
        </>
      )}
      {selectedStudy && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedStudy(null)} />
          <StudyDetail study={selectedStudy} onClose={() => setSelectedStudy(null)} />
        </>
      )}
    </div>
  );
};

export default LabRadiologyDashboard;
