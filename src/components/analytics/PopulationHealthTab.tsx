import { useState } from 'react';
import { Download, MapPin } from 'lucide-react';
import { HEALTH_CONDITIONS, EMIRATES } from '../../types/analytics';

export default function PopulationHealthTab() {
  const [selectedCondition, setSelectedCondition] = useState('diabetes');
  const [selectedMonth, setSelectedMonth] = useState(11);

  const months = [
    'Jan 2025',
    'Feb 2025',
    'Mar 2025',
    'Apr 2025',
    'May 2025',
    'Jun 2025',
    'Jul 2025',
    'Aug 2025',
    'Sep 2025',
    'Oct 2025',
    'Nov 2025',
    'Dec 2025',
  ];

  const emirateData = [
    { name: 'Dubai', prevalence: 8.7, lat: 25.2048, lng: 55.2708 },
    { name: 'Abu Dhabi', prevalence: 7.9, lat: 24.4539, lng: 54.3773 },
    { name: 'Sharjah', prevalence: 9.2, lat: 25.3463, lng: 55.4209 },
    { name: 'Ajman', prevalence: 8.1, lat: 25.4052, lng: 55.5136 },
    { name: 'Ras Al Khaimah', prevalence: 7.3, lat: 25.7889, lng: 55.9433 },
    { name: 'Fujairah', prevalence: 6.8, lat: 25.1288, lng: 56.3265 },
    { name: 'Umm Al Quwain', prevalence: 7.6, lat: 25.5647, lng: 55.5552 },
  ];

  const getPrevalenceColor = (prevalence: number) => {
    if (prevalence < 7) return 'bg-teal-600';
    if (prevalence < 8) return 'bg-teal-500';
    if (prevalence < 9) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const agePyramid = [
    { age: '0-10', male: 12, female: 11 },
    { age: '11-20', male: 15, female: 14 },
    { age: '21-30', male: 18, female: 17 },
    { age: '31-40', male: 22, female: 21 },
    { age: '41-50', male: 25, female: 24 },
    { age: '51-60', male: 28, female: 27 },
    { age: '61-70', male: 32, female: 31 },
    { age: '71+', male: 24, female: 26 },
  ];

  const trendData = [
    { month: 'Apr', incidence: 6.2, hospitalization: 3.1, screening: 67 },
    { month: 'May', incidence: 6.5, hospitalization: 3.3, screening: 69 },
    { month: 'Jun', incidence: 6.8, hospitalization: 3.4, screening: 71 },
    { month: 'Jul', incidence: 7.1, hospitalization: 3.5, screening: 74 },
    { month: 'Aug', incidence: 7.3, hospitalization: 3.6, screening: 76 },
    { month: 'Sep', incidence: 7.5, hospitalization: 3.7, screening: 78 },
    { month: 'Oct', incidence: 7.8, hospitalization: 3.8, screening: 81 },
    { month: 'Nov', incidence: 8.0, hospitalization: 3.9, screening: 83 },
    { month: 'Dec', incidence: 8.2, hospitalization: 4.0, screening: 85 },
    { month: 'Jan', incidence: 8.4, hospitalization: 4.1, screening: 87 },
    { month: 'Feb', incidence: 8.6, hospitalization: 4.2, screening: 88 },
    { month: 'Mar', incidence: 8.7, hospitalization: 4.3, screening: 90 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
            Health Condition
          </label>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-600"
          >
            {HEALTH_CONDITIONS.map((condition) => (
              <option key={condition.id} value={condition.id}>
                {condition.name}
                {condition.isDhaReportable && ' (DHA Reportable)'}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-7">
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            Generate DHA Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            UAE Prevalence Heat Map
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {emirateData.map((emirate) => (
              <div
                key={emirate.name}
                className="bg-slate-900 rounded-lg p-4 border border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-semibold text-white">
                      {emirate.name}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold text-white ${getPrevalenceColor(
                      emirate.prevalence
                    )}`}
                  >
                    {emirate.prevalence}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getPrevalenceColor(emirate.prevalence)}`}
                    style={{ width: `${(emirate.prevalence / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Time Slider
              </span>
              <span className="text-xs text-white">{months[selectedMonth]}</span>
            </div>
            <input
              type="range"
              min="0"
              max="11"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-500">Jan 2025</span>
              <span className="text-xs text-slate-500">Dec 2025</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Demographics
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                Gender Split
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white">Male</span>
                    <span className="text-teal-400 font-bold">52%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600" style={{ width: '52%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white">Female</span>
                    <span className="text-violet-400 font-bold">48%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600" style={{ width: '48%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                Nationality Distribution
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white">UAE National</span>
                  <span className="text-white font-bold">31%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white">South Asian</span>
                  <span className="text-white font-bold">38%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white">Arab</span>
                  <span className="text-white font-bold">18%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white">Western</span>
                  <span className="text-white font-bold">8%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white">Other</span>
                  <span className="text-white font-bold">5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Age Pyramid</h3>
        <div className="space-y-1">
          {agePyramid.map((group) => (
            <div key={group.age} className="flex items-center gap-2">
              <div className="flex-1 flex justify-end">
                <div className="text-right pr-3 w-24">
                  <div
                    className="h-6 bg-teal-600 rounded-l"
                    style={{ width: `${(group.male / 35) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-16 text-center">
                <span className="text-xs text-white font-bold">{group.age}</span>
              </div>
              <div className="flex-1">
                <div className="pl-3 w-24">
                  <div
                    className="h-6 bg-violet-600 rounded-r"
                    style={{ width: `${(group.female / 35) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-600 rounded"></div>
            <span className="text-xs text-slate-400">Male</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-violet-600 rounded"></div>
            <span className="text-xs text-slate-400">Female</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          12-Month Trends
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">
              Incidence Rate (per 1,000)
            </div>
            <div className="flex items-end gap-1 h-32">
              {trendData.map((data, idx) => {
                const maxValue = Math.max(...trendData.map((d) => d.incidence));
                const height = (data.incidence / maxValue) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-teal-600 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-slate-500 mt-1">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">
              Hospitalization Rate (%)
            </div>
            <div className="flex items-end gap-1 h-32">
              {trendData.map((data, idx) => {
                const maxValue = Math.max(...trendData.map((d) => d.hospitalization));
                const height = (data.hospitalization / maxValue) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-amber-600 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-slate-500 mt-1">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">
              Screening Completion (%)
            </div>
            <div className="flex items-end gap-1 h-32">
              {trendData.map((data, idx) => {
                const maxValue = 100;
                const height = (data.screening / maxValue) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-violet-600 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-slate-500 mt-1">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
