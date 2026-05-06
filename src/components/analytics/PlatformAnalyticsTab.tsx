import { TrendingUp, Users, Clock, DollarSign } from 'lucide-react';

export default function PlatformAnalyticsTab() {
  const dauMauData = [
    { day: 'Mon', dau: 12847, mau: 45632 },
    { day: 'Tue', dau: 13124, mau: 45891 },
    { day: 'Wed', dau: 13456, mau: 46234 },
    { day: 'Thu', dau: 13789, mau: 46587 },
    { day: 'Fri', dau: 14123, mau: 46912 },
    { day: 'Sat', dau: 11234, mau: 47156 },
    { day: 'Sun', dau: 10567, mau: 47389 },
  ];

  const userAcquisition = [
    { portal: 'Patient Portal', count: 18234, percentage: 45 },
    { portal: 'Doctor Portal', count: 8912, percentage: 22 },
    { portal: 'Pharmacy Portal', count: 7123, percentage: 18 },
    { portal: 'Lab Portal', count: 6078, percentage: 15 },
  ];

  const featureAdoption = [
    { feature: 'Appointments', patient: 92, doctor: 87, pharmacy: 34, lab: 12 },
    { feature: 'Prescriptions', patient: 78, doctor: 95, pharmacy: 98, lab: 8 },
    { feature: 'Lab Results', patient: 67, doctor: 89, pharmacy: 23, lab: 96 },
    { feature: 'Telemedicine', patient: 45, doctor: 72, pharmacy: 5, lab: 3 },
    { feature: 'Health Records', patient: 88, doctor: 91, pharmacy: 15, lab: 18 },
    { feature: 'AI Assistant', patient: 34, doctor: 56, pharmacy: 28, lab: 31 },
  ];

  const orgSatisfaction = [
    { org: 'Mediclinic Dubai Mall', rating: 4.8, responses: 1247 },
    { org: 'NMC Royal Hospital', rating: 4.7, responses: 982 },
    { org: 'Aster Pharmacy Marina', rating: 4.6, responses: 756 },
    { org: 'Unilabs Dubai', rating: 4.5, responses: 634 },
    { org: 'HealthHub Clinic JLT', rating: 4.4, responses: 421 },
  ];

  const revenueData = [
    { month: 'Apr', subscription: 142000, transaction: 28400 },
    { month: 'May', subscription: 156000, transaction: 31200 },
    { month: 'Jun', subscription: 168000, transaction: 33600 },
    { month: 'Jul', subscription: 184000, transaction: 36800 },
    { month: 'Aug', subscription: 197000, transaction: 39400 },
    { month: 'Sep', subscription: 213000, transaction: 42600 },
  ];

  const getAdoptionColor = (value: number) => {
    if (value >= 80) return 'bg-green-600';
    if (value >= 60) return 'bg-teal-600';
    if (value >= 40) return 'bg-amber-600';
    return 'bg-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-teal-600 bg-opacity-20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase">DAU</div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">13,789</div>
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400 font-bold">7.3%</span>
            <span className="text-slate-500">vs last week</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-violet-600 bg-opacity-20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase">MAU</div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">47,389</div>
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400 font-bold">3.8%</span>
            <span className="text-slate-500">vs last month</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-600 bg-opacity-20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase">
              Avg Session
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">12m 34s</div>
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400 font-bold">1.2m</span>
            <span className="text-slate-500">vs last week</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-600 bg-opacity-20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase">MRR</div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">$213K</div>
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400 font-bold">8.1%</span>
            <span className="text-slate-500">vs last month</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Active Users (90 Days)
          </h3>
          <div className="flex items-end gap-2 h-48">
            {dauMauData.map((data, idx) => {
              const maxValue = Math.max(...dauMauData.map((d) => d.mau));
              const dauHeight = (data.dau / maxValue) * 100;
              const mauHeight = (data.mau / maxValue) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-1">
                    <div
                      className="w-full bg-violet-600 rounded-t"
                      style={{ height: `${mauHeight * 1.6}px` }}
                      title={`MAU: ${data.mau.toLocaleString()}`}
                    ></div>
                    <div
                      className="w-full bg-teal-600"
                      style={{ height: `${dauHeight * 1.6}px` }}
                      title={`DAU: ${data.dau.toLocaleString()}`}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-500 mt-1">{data.day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-teal-600 rounded"></div>
              <span className="text-xs text-slate-400">DAU</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-violet-600 rounded"></div>
              <span className="text-xs text-slate-400">MAU</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            User Acquisition by Portal
          </h3>
          <div className="space-y-3">
            {userAcquisition.map((portal) => (
              <div key={portal.portal}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">{portal.portal}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {portal.count.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400">{portal.percentage}%</div>
                  </div>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600"
                    style={{ width: `${portal.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          Feature Adoption Heatmap
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Feature
                </th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Patient
                </th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Doctor
                </th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Pharmacy
                </th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Lab
                </th>
              </tr>
            </thead>
            <tbody>
              {featureAdoption.map((feature) => (
                <tr key={feature.feature} className="border-b border-slate-700">
                  <td className="px-3 py-2 text-sm text-white">{feature.feature}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold text-white ${getAdoptionColor(
                          feature.patient
                        )}`}
                      >
                        {feature.patient}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold text-white ${getAdoptionColor(
                          feature.doctor
                        )}`}
                      >
                        {feature.doctor}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold text-white ${getAdoptionColor(
                          feature.pharmacy
                        )}`}
                      >
                        {feature.pharmacy}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold text-white ${getAdoptionColor(
                          feature.lab
                        )}`}
                      >
                        {feature.lab}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Key Platform Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Appointment Completion</span>
              <span className="text-lg font-bold text-white">87.3%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Prescription Fulfillment</span>
              <span className="text-lg font-bold text-white">92.1%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Lab Result TAT (avg)</span>
              <span className="text-lg font-bold text-white">18.4h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">No-Show Rate</span>
              <span className="text-lg font-bold text-rose-400">8.7%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Churn Rate</span>
              <span className="text-lg font-bold text-amber-400">2.4%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Patient Satisfaction by Organization
          </h3>
          <div className="space-y-3">
            {orgSatisfaction.map((org, idx) => (
              <div key={org.org} className="flex items-center gap-3">
                <div className="w-8 text-center">
                  <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{org.org}</span>
                    <span className="text-sm font-bold text-teal-400">
                      {org.rating}
                      <span className="text-xs text-slate-500 ml-1">/5.0</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600"
                        style={{ width: `${(org.rating / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {org.responses} reviews
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          Revenue Analytics (6 Months)
        </h3>
        <div className="flex items-end gap-3 h-48 mb-4">
          {revenueData.map((data, idx) => {
            const total = data.subscription + data.transaction;
            const maxValue = Math.max(
              ...revenueData.map((d) => d.subscription + d.transaction)
            );
            const subscriptionHeight = (data.subscription / maxValue) * 100;
            const transactionHeight = (data.transaction / maxValue) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse gap-px">
                  <div
                    className="w-full bg-teal-600 rounded-b"
                    style={{ height: `${subscriptionHeight * 1.6}px` }}
                  ></div>
                  <div
                    className="w-full bg-violet-600 rounded-t"
                    style={{ height: `${transactionHeight * 1.6}px` }}
                  ></div>
                </div>
                <div className="text-xs font-bold text-white mt-2">
                  ${(total / 1000).toFixed(0)}K
                </div>
                <span className="text-xs text-slate-500">{data.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-600 rounded"></div>
            <span className="text-xs text-slate-400">Subscription Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-violet-600 rounded"></div>
            <span className="text-xs text-slate-400">Transaction Revenue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
