import { Navigate, useParams } from 'react-router-dom';

export const DoctorConsultationRedirect = () => {
  const { appointmentId } = useParams();
  return <Navigate to={appointmentId ? `/doctor/appointments/${appointmentId}` : '/doctor/appointments'} replace />;
};
