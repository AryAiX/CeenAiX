import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Check, Heart, X, ArrowLeftRight } from 'lucide-react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import {
  displayInsuranceFeature,
  displayInsurancePlanField,
  insurancePlanSlug,
} from '../../lib/insurance-display';

interface InsurancePlan {
  id: string;
  name: string;
  provider: string;
  monthlyPremium: number;
  coverageLimit: string;
  inpatientCoverage: string;
  outpatientCoverage: string;
  emergencyCare: string;
  maternityCare: string;
  dentalOptical: string;
  pharmacyCoverage: string;
  features: string[];
  popular: boolean;
}

const PLANS: InsurancePlan[] = [
  {
    id: '1',
    name: 'Basic Shield',
    provider: 'NextCare Insurance',
    monthlyPremium: 299,
    coverageLimit: 'AED 150,000',
    inpatientCoverage: 'Full coverage',
    outpatientCoverage: 'Not included',
    emergencyCare: '24/7 Coverage',
    maternityCare: 'Not included',
    dentalOptical: 'Not included',
    pharmacyCoverage: '50%',
    features: [
      'Inpatient hospitalization',
      'Emergency care 24/7',
      'Basic diagnostics',
      'GP consultations',
      'Pharmacy coverage (50%)',
    ],
    popular: false,
  },
  {
    id: '2',
    name: 'Silver Plus',
    provider: 'Oman Insurance',
    monthlyPremium: 450,
    coverageLimit: 'AED 300,000',
    inpatientCoverage: 'Full coverage',
    outpatientCoverage: 'Up to AED 10,000',
    emergencyCare: '24/7 Coverage',
    maternityCare: 'Normal delivery',
    dentalOptical: 'AED 500',
    pharmacyCoverage: '60%',
    features: [
      'Inpatient & limited outpatient',
      'Emergency services',
      'Diagnostics & imaging',
      'Specialist consultations (limited)',
      'Pharmacy coverage (60%)',
      'Normal delivery maternity',
    ],
    popular: false,
  },
  {
    id: '3',
    name: 'Gold Premium',
    provider: 'Daman Insurance',
    monthlyPremium: 599,
    coverageLimit: 'AED 500,000',
    inpatientCoverage: 'Full coverage',
    outpatientCoverage: 'Up to AED 25,000',
    emergencyCare: '24/7 Priority',
    maternityCare: 'Full coverage',
    dentalOptical: 'AED 2,000',
    pharmacyCoverage: '80%',
    features: [
      'Inpatient & outpatient care',
      'Priority emergency services',
      'Advanced diagnostics & imaging',
      'Specialist consultations',
      'Pharmacy coverage (80%)',
      'Full maternity care',
      'Dental & optical',
    ],
    popular: true,
  },
  {
    id: '4',
    name: 'Platinum Elite',
    provider: 'AXA Insurance',
    monthlyPremium: 899,
    coverageLimit: 'AED 1,000,000',
    inpatientCoverage: 'Unlimited',
    outpatientCoverage: 'Unlimited',
    emergencyCare: '24/7 VIP',
    maternityCare: 'Full coverage + complications',
    dentalOptical: 'AED 5,000',
    pharmacyCoverage: '100%',
    features: [
      'Unlimited inpatient & outpatient',
      'VIP emergency services',
      'Full diagnostics & imaging',
      'Unlimited specialist access',
      'Pharmacy coverage (100%)',
      'Comprehensive maternity',
      'Premium dental & optical',
      'International coverage',
    ],
    popular: false,
  },
  {
    id: '5',
    name: 'Diamond Executive',
    provider: 'Cigna Insurance',
    monthlyPremium: 1299,
    coverageLimit: 'AED 2,000,000',
    inpatientCoverage: 'Unlimited',
    outpatientCoverage: 'Unlimited',
    emergencyCare: '24/7 VIP + Air ambulance',
    maternityCare: 'Full coverage + IVF',
    dentalOptical: 'Unlimited',
    pharmacyCoverage: '100%',
    features: [
      'Comprehensive global coverage',
      'VIP emergency + air ambulance',
      'Premium diagnostics worldwide',
      'Concierge medical service',
      'Full pharmacy coverage',
      'Maternity + fertility treatments',
      'Premium dental, optical & preventive',
      'Wellness & mental health programs',
      'Second medical opinion globally',
    ],
    popular: false,
  },
  {
    id: '6',
    name: 'Family Wellness',
    provider: 'MetLife Insurance',
    monthlyPremium: 750,
    coverageLimit: 'AED 750,000',
    inpatientCoverage: 'Full coverage',
    outpatientCoverage: 'Up to AED 30,000',
    emergencyCare: '24/7 Coverage',
    maternityCare: 'Full coverage',
    dentalOptical: 'AED 3,000',
    pharmacyCoverage: '85%',
    features: [
      'Family-focused coverage',
      'Pediatric care included',
      'Preventive health checkups',
      'Vaccination coverage',
      'Pharmacy coverage (85%)',
      'Maternity & newborn care',
      'Dental & optical for family',
      'Wellness programs',
    ],
    popular: false,
  },
];

export const Insurance: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [showComparison, setShowComparison] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);

  const togglePlanSelection = (planId: string) => {
    setSelectedPlans((prev) => {
      if (prev.includes(planId)) {
        return prev.filter((id) => id !== planId);
      }
      if (prev.length < 3) {
        return [...prev, planId];
      }
      return prev;
    });
  };

  const selectedPlanObjects = PLANS.filter((plan) => selectedPlans.includes(plan.id));

  const planDisplay = (plan: InsurancePlan) => {
    const slug = insurancePlanSlug(plan.id) ?? plan.id;
    return {
      slug,
      name: displayInsurancePlanField(t, slug, 'name', plan.name),
      provider: displayInsurancePlanField(t, slug, 'provider', plan.provider),
      coverageLimit: displayInsurancePlanField(t, slug, 'coverageLimit', plan.coverageLimit),
      inpatientCoverage: displayInsurancePlanField(t, slug, 'inpatientCoverage', plan.inpatientCoverage),
      outpatientCoverage: displayInsurancePlanField(t, slug, 'outpatientCoverage', plan.outpatientCoverage),
      emergencyCare: displayInsurancePlanField(t, slug, 'emergencyCare', plan.emergencyCare),
      maternityCare: displayInsurancePlanField(t, slug, 'maternityCare', plan.maternityCare),
      dentalOptical: displayInsurancePlanField(t, slug, 'dentalOptical', plan.dentalOptical),
      pharmacyCoverage: displayInsurancePlanField(t, slug, 'pharmacyCoverage', plan.pharmacyCoverage),
    };
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[22rem] overflow-hidden sm:h-[26rem]"
        aria-hidden
      >
        <img
          src="https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt=""
          className="h-full w-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/80 to-gray-50" />
      </div>

      <Header />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-100 px-5 py-2.5 text-blue-700">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-semibold">{t('insurancePage.heroBadge')}</span>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-gray-900 md:text-6xl">{t('insurancePage.heroTitle')}</h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">{t('insurancePage.heroLead')}</p>
        </div>

        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <Shield className="mx-auto mb-2 h-6 w-6 text-blue-600" />
          <p className="text-sm text-blue-900">{t('insurancePage.dhaNotice')}</p>
        </div>

        <div className="mb-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all ${
              showComparison
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'border-2 border-gray-300 bg-white text-gray-700 hover:border-blue-500'
            }`}
          >
            <ArrowLeftRight className="h-5 w-5" />
            {showComparison ? t('insurancePage.compareHide') : t('insurancePage.compareShow')}
            {selectedPlans.length > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-sm font-bold text-blue-600">
                {formatLocaleDigits(selectedPlans.length, i18n.language)}
              </span>
            )}
          </button>
        </div>

        {showComparison && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white">
              <h2 className="text-center text-2xl font-bold">{t('insurancePage.comparisonTitle')}</h2>
              <p className="mt-1 text-center text-sm">{t('insurancePage.comparisonSubtitle')}</p>
            </div>

            {selectedPlans.length === 0 ? (
              <div className="p-12 text-center">
                <ArrowLeftRight className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  {t('insurancePage.comparisonEmptyTitle')}
                </h3>
                <p className="text-gray-600">{t('insurancePage.comparisonEmptyBody')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex justify-end border-b border-gray-100 px-4 py-3">
                  <button
                    type="button"
                    disabled
                    title={t('insurancePage.exportCompareComingSoon', {
                      defaultValue: 'PDF plan comparison export — coming soon',
                    })}
                    className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-80"
                  >
                    {t('insurancePage.exportCompare', { defaultValue: 'Export comparison PDF' })}
                  </button>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-start text-sm font-semibold text-gray-900">
                        {t('insurancePage.tableFeatures')}
                      </th>
                      {selectedPlanObjects.map((plan) => {
                        const d = planDisplay(plan);
                        return (
                          <th key={plan.id} className="min-w-[200px] px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-gray-900">{d.name}</span>
                              <span className="mt-1 text-xs text-gray-600">{d.provider}</span>
                              <button
                                type="button"
                                onClick={() => togglePlanSelection(plan.id)}
                                className="mt-2 flex items-center gap-1 text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                                <span className="text-xs">{t('insurancePage.remove')}</span>
                              </button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="bg-blue-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tableMonthlyPremium')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center">
                          <span className="text-2xl font-bold text-blue-600">
                            {t('insurancePage.premiumWithCurrency', {
                              amount: formatLocaleDigits(plan.monthlyPremium, i18n.language),
                            })}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tableCoverageLimit')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                          {planDisplay(plan).coverageLimit}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tableInpatient')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                          {planDisplay(plan).inpatientCoverage}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tableOutpatient')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                          {planDisplay(plan).outpatientCoverage}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tableEmergency')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                          {planDisplay(plan).emergencyCare}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tableMaternity')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                          {planDisplay(plan).maternityCare}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tableDental')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                          {planDisplay(plan).dentalOptical}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t('insurancePage.tablePharmacy')}
                      </td>
                      {selectedPlanObjects.map((plan) => (
                        <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                          {planDisplay(plan).pharmacyCoverage}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isSelected = selectedPlans.includes(plan.id);
            const slug = insurancePlanSlug(plan.id) ?? plan.id;
            const d = planDisplay(plan);

            return (
              <div
                key={plan.id}
                className={`card-hover overflow-hidden rounded-2xl bg-white shadow-lg ${
                  plan.popular ? 'ring-2 ring-blue-500' : ''
                } ${isSelected ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-2 text-center text-sm font-bold text-white">
                    {t('insurancePage.popular')}
                  </div>
                )}

                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-xl font-bold text-gray-900">{d.name}</h3>
                      <p className="text-sm text-gray-600">{d.provider}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePlanSelection(plan.id)}
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-400 hover:text-cyan-600'
                      }`}
                    >
                      {isSelected ? t('insurancePage.selected') : t('insurancePage.compare')}
                    </button>
                  </div>

                  <div className="mb-6 border-b border-gray-200 pb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">
                        {t('insurancePage.premiumWithCurrency', {
                          amount: formatLocaleDigits(plan.monthlyPremium, i18n.language),
                        })}
                      </span>
                      <span className="ms-2 text-gray-600">{t('insurancePage.perMonth')}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {t('insurancePage.coverageUpTo', { limit: d.coverageLimit })}
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="mb-3 text-sm font-semibold text-gray-900">
                      {t('insurancePage.whatsIncluded')}
                    </p>
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                          <span className="text-sm text-gray-700">
                            {displayInsuranceFeature(t, slug, index, feature)}
                          </span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="ms-7 text-sm text-gray-500">
                          {t('insurancePage.moreBenefits', {
                            count: formatLocaleDigits(plan.features.length - 5, i18n.language),
                          })}
                        </li>
                      )}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/auth/register?role=patient&reset=1')}
                    className={`w-full rounded-xl py-3 font-semibold transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:shadow-cyan-500/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('insurancePage.getStarted')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
            {t('insurancePage.benefitsTitle')}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">{t('insurancePage.benefit1Title')}</h3>
              <p className="text-sm text-gray-600">{t('insurancePage.benefit1Body')}</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">{t('insurancePage.benefit2Title')}</h3>
              <p className="text-sm text-gray-600">{t('insurancePage.benefit2Body')}</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                <Heart className="h-6 w-6 text-cyan-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">{t('insurancePage.benefit3Title')}</h3>
              <p className="text-sm text-gray-600">{t('insurancePage.benefit3Body')}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 border-t border-slate-800/20">
        <Footer />
      </div>
    </div>
  );
};
