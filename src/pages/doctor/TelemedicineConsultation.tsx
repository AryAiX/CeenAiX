import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { LiveKitConsultationRoom } from '../../components/telemedicine/LiveKitConsultationRoom';
import { useDoctorAppointmentDetail } from '../../hooks';
import { useAuth } from '../../lib/auth-context';

export const DoctorTelemedicineConsultation = () => {
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const { user, profile } = useAuth();
  const { data, loading, error } = useDoctorAppointmentDetail(user?.id, appointmentId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[520px] rounded-3xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-5 w-5" />
          <span>Video visit unavailable</span>
        </div>
        <p className="mt-2 text-sm">
          {error ?? 'We could not find a video appointment linked to your account.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/doctor/appointments')}
          className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
        >
          Back to appointments
        </button>
      </div>
    );
  }

  return (
    <LiveKitConsultationRoom
      role="doctor"
      appointment={data.appointment}
      participantName={profile?.full_name ?? user?.email ?? 'Doctor'}
      counterpartName={data.patientProfile?.full_name ?? 'the patient'}
      onBack={() => navigate(`/doctor/appointments/${data.appointment.id}`)}
    />
  );
};
