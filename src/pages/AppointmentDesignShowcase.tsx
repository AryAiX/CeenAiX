import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, Star, Phone, MessageSquare, Navigation, CheckCircle, FileText, Bell, AlertCircle } from 'lucide-react';

export const AppointmentDesignShowcase: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<'modern' | 'minimal' | 'bold'>('modern');

  const upcomingAppointments = [
    {
      id: 1,
      doctorName: 'Dr. Sarah Ahmed',
      specialty: 'General Medicine',
      date: 'March 5, 2026',
      time: '10:00 AM',
      type: 'in-person',
      location: 'Dubai Healthcare City, Building 27',
      reason: 'Annual Checkup - Full physical examination',
      image: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'confirmed'
    },
    {
      id: 2,
      doctorName: 'Dr. Mohammed Hassan',
      specialty: 'Cardiology',
      date: 'March 8, 2026',
      time: '2:30 PM',
      type: 'video',
      location: 'Video Consultation',
      reason: 'Follow-up: Blood pressure monitoring',
      image: 'https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'pending'
    },
    {
      id: 3,
      doctorName: 'Dr. Fatima Al-Rashid',
      specialty: 'Dermatology',
      date: 'March 12, 2026',
      time: '9:15 AM',
      type: 'in-person',
      location: 'Mediclinic City Hospital',
      reason: 'Skin consultation - Acne treatment review',
      image: 'https://images.pexels.com/photos/5452274/pexels-photo-5452274.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'confirmed'
    }
  ];

  const pastAppointments = [
    {
      id: 4,
      doctorName: 'Dr. Ahmed Khalil',
      specialty: 'Orthopedics',
      date: 'February 20, 2026',
      time: '11:00 AM',
      type: 'in-person',
      location: 'NMC Royal Hospital',
      reason: 'Knee pain evaluation and X-ray',
      rating: 5,
      image: 'https://images.pexels.com/photos/5452237/pexels-photo-5452237.jpeg?auto=compress&cs=tinysrgb&w=400',
      prescription: true,
      notes: 'Follow-up in 2 weeks'
    },
    {
      id: 5,
      doctorName: 'Dr. Sarah Ahmed',
      specialty: 'General Medicine',
      date: 'February 15, 2026',
      time: '3:30 PM',
      type: 'in-person',
      location: 'Dubai Healthcare City, Building 27',
      reason: 'Flu symptoms and persistent cough',
      rating: 5,
      image: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=400',
      prescription: true,
      notes: 'Complete antibiotic course'
    },
    {
      id: 6,
      doctorName: 'Dr. Mohammed Hassan',
      specialty: 'Cardiology',
      date: 'January 28, 2026',
      time: '10:45 AM',
      type: 'video',
      location: 'Video Consultation',
      reason: 'Heart health consultation and ECG review',
      rating: 4,
      image: 'https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=400',
      prescription: false,
      notes: 'Regular monitoring recommended'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight sm:text-5xl">Appointment Design Gallery</h1>
          <p className="text-xl text-gray-400">Explore three distinct card design styles</p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
            <button
              onClick={() => setSelectedStyle('modern')}
              className={`px-4 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base rounded-xl font-semibold transition-all duration-300 ${
                selectedStyle === 'modern'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-xl scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Modern Style
            </button>
            <button
              onClick={() => setSelectedStyle('minimal')}
              className={`px-4 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base rounded-xl font-semibold transition-all duration-300 ${
                selectedStyle === 'minimal'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Minimal Style
            </button>
            <button
              onClick={() => setSelectedStyle('bold')}
              className={`px-4 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base rounded-xl font-semibold transition-all duration-300 ${
                selectedStyle === 'bold'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Bold Style
            </button>
          </div>
        </div>

        <div className="space-y-16">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white sm:text-4xl">Upcoming Appointments</h2>
                <p className="text-gray-400 mt-2 text-lg">Your scheduled consultations</p>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/20 backdrop-blur-lg px-5 py-2 rounded-full border border-blue-500/30">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-sm font-semibold">{upcomingAppointments.length} Scheduled</span>
              </div>
            </div>

            <div className="grid gap-6">
              {upcomingAppointments.map((appointment) => {
                if (selectedStyle === 'modern') {
                  return (
                    <div key={appointment.id} className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="relative p-5 sm:p-8">
                        <div className="flex flex-col items-start gap-5 sm:flex-row sm:gap-6">
                          <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500" />
                            <img
                              src={appointment.image}
                              alt={appointment.doctorName}
                              className="relative w-24 h-24 rounded-2xl object-cover ring-2 ring-gray-700"
                            />
                            <div className={`absolute -bottom-2 -right-2 ${appointment.type === 'video' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'} p-2 rounded-lg shadow-lg`}>
                              {appointment.type === 'video' ? <Video className="w-4 h-4 text-white" /> : <MapPin className="w-4 h-4 text-white" />}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                              <div className="min-w-0">
                                <h3 className="text-2xl font-bold text-white mb-1">{appointment.doctorName}</h3>
                                <p className="text-blue-400 font-medium">{appointment.specialty}</p>
                              </div>
                              <div className={`px-4 py-1.5 rounded-full text-xs font-semibold ${appointment.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                                {appointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
                              <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                <div>
                                  <p className="text-xs text-gray-400">Date</p>
                                  <p className="text-sm font-semibold text-white">{appointment.date}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <Clock className="w-5 h-5 text-cyan-400" />
                                <div>
                                  <p className="text-xs text-gray-400">Time</p>
                                  <p className="text-sm font-semibold text-white">{appointment.time}</p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-6">
                              <p className="text-xs text-gray-400 mb-1">Location</p>
                              <p className="text-sm text-white font-medium">{appointment.location}</p>
                              <p className="text-xs text-gray-400 mt-2">Reason</p>
                              <p className="text-sm text-gray-300">{appointment.reason}</p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 ${appointment.type === 'video' ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'} text-white shadow-lg hover:shadow-xl`}>
                                {appointment.type === 'video' ? (
                                  <>
                                    <Video className="w-5 h-5" />
                                    <span>Join Call</span>
                                  </>
                                ) : (
                                  <>
                                    <Navigation className="w-5 h-5" />
                                    <span>Directions</span>
                                  </>
                                )}
                              </button>
                              <button className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 sm:flex-none sm:px-6">
                                Reschedule
                              </button>
                              <button className="flex-1 px-4 py-3 rounded-xl font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-300 sm:flex-none sm:px-6">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (selectedStyle === 'minimal') {
                  return (
                    <div key={appointment.id} className="bg-white rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 border-l-4 border-emerald-500">
                      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
                        <img
                          src={appointment.image}
                          alt={appointment.doctorName}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-gray-900">{appointment.doctorName}</h3>
                          <p className="text-sm text-emerald-600 font-medium">{appointment.specialty}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-semibold text-gray-900">{appointment.date}</p>
                          <p className="text-sm text-gray-500">{appointment.time}</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4 mb-4">
                        <p className="text-sm text-gray-600 mb-2">{appointment.location}</p>
                        <p className="text-sm text-gray-900">{appointment.reason}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="flex-1 py-2 px-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm">
                          {appointment.type === 'video' ? 'Join Video' : 'Get Directions'}
                        </button>
                        <button className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:flex-none">
                          Reschedule
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={appointment.id} className="relative overflow-hidden rounded-3xl shadow-2xl hover:shadow-orange-500/50 transition-all duration-500 hover:-translate-y-1">
                      <div className={`absolute inset-0 ${appointment.type === 'video' ? 'bg-gradient-to-br from-pink-500 via-red-500 to-orange-500' : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500'}`} />
                      <div className="relative bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm p-8 text-white">
                        <div className="flex flex-col items-start gap-5 sm:flex-row sm:gap-6">
                          <img
                            src={appointment.image}
                            alt={appointment.doctorName}
                            className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white/30 shadow-2xl"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                              <div>
                                <h3 className="text-3xl font-black mb-1 tracking-tight">{appointment.doctorName}</h3>
                                <p className="text-lg font-bold text-white/90">{appointment.specialty}</p>
                              </div>
                              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl">
                                <p className="text-sm font-bold">{appointment.date}</p>
                                <p className="text-xs opacity-90">{appointment.time}</p>
                              </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
                              <div className="flex items-center gap-2 mb-2">
                                {appointment.type === 'video' ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                <p className="font-semibold">{appointment.location}</p>
                              </div>
                              <p className="text-sm opacity-90">{appointment.reason}</p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button className="flex-1 py-4 px-4 sm:px-6 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
                                {appointment.type === 'video' ? (
                                  <>
                                    <Video className="w-5 h-5" />
                                    START VIDEO CALL
                                  </>
                                ) : (
                                  <>
                                    <Navigation className="w-5 h-5" />
                                    GET DIRECTIONS
                                  </>
                                )}
                              </button>
                              <button className="flex-1 px-4 py-4 bg-white/20 backdrop-blur-md rounded-xl font-bold hover:bg-white/30 transition-all duration-300 border border-white/30 sm:flex-none sm:px-6">
                                MODIFY
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white sm:text-4xl">Past Appointments</h2>
                <p className="text-gray-400 mt-2 text-lg">Consultation history</p>
              </div>
              <div className="flex items-center gap-2 bg-green-500/20 backdrop-blur-lg px-5 py-2 rounded-full border border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-semibold">{pastAppointments.length} Completed</span>
              </div>
            </div>

            <div className="grid gap-6">
              {pastAppointments.map((appointment) => {
                if (selectedStyle === 'modern') {
                  return (
                    <div key={appointment.id} className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl overflow-hidden border border-gray-700 hover:border-green-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20">
                      <div className="p-8">
                        <div className="flex flex-col items-start gap-5 sm:flex-row sm:gap-6">
                          <div className="relative">
                            <img
                              src={appointment.image}
                              alt={appointment.doctorName}
                              className="w-24 h-24 rounded-2xl object-cover ring-2 ring-gray-700 group-hover:ring-green-500/50 transition-all duration-500"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg shadow-lg">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                              <div>
                                <h3 className="text-2xl font-bold text-white mb-1">{appointment.doctorName}</h3>
                                <p className="text-green-400 font-medium">{appointment.specialty}</p>
                              </div>
                              <div className="flex items-center gap-1.5 bg-yellow-500/20 px-4 py-2 rounded-xl border border-yellow-500/30">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < appointment.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                                  />
                                ))}
                                <span className="ml-2 text-sm font-bold text-yellow-400">{appointment.rating}.0</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
                              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <p className="text-xs text-gray-400 mb-1">Date</p>
                                <p className="text-sm font-semibold text-white">{appointment.date}</p>
                              </div>
                              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <p className="text-xs text-gray-400 mb-1">Time</p>
                                <p className="text-sm font-semibold text-white">{appointment.time}</p>
                              </div>
                              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <p className="text-xs text-gray-400 mb-1">Status</p>
                                <p className="text-sm font-semibold text-green-400">Completed</p>
                              </div>
                            </div>

                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-4">
                              <p className="text-xs text-gray-400 mb-1">Visit Reason</p>
                              <p className="text-sm text-white">{appointment.reason}</p>
                              {appointment.prescription && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                                  <FileText className="w-4 h-4 text-blue-400" />
                                  <p className="text-xs text-blue-400 font-medium">Prescription Available</p>
                                </div>
                              )}
                              {appointment.notes && (
                                <div className="flex items-center gap-2 mt-2">
                                  <AlertCircle className="w-4 h-4 text-amber-400" />
                                  <p className="text-xs text-amber-400">{appointment.notes}</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                                <Calendar className="w-5 h-5" />
                                <span>Book Again</span>
                              </button>
                              <button className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 sm:flex-none sm:px-5">
                                <MessageSquare className="w-5 h-5" />
                                <span>Message</span>
                              </button>
                              <button className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 sm:flex-none sm:px-5">
                                <Phone className="w-5 h-5" />
                                <span>Call</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (selectedStyle === 'minimal') {
                  return (
                    <div key={appointment.id} className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
                      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
                        <img
                          src={appointment.image}
                          alt={appointment.doctorName}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-gray-900">{appointment.doctorName}</h3>
                          <p className="text-sm text-green-600 font-medium">{appointment.specialty}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < appointment.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-500">{appointment.date} at {appointment.time}</p>
                          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Completed</span>
                        </div>
                        <p className="text-sm text-gray-900">{appointment.reason}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm">
                          Book Again
                        </button>
                        <button className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:flex-none">
                          Message
                        </button>
                        <button className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:flex-none">
                          Call
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={appointment.id} className="relative overflow-hidden rounded-3xl shadow-2xl hover:shadow-green-500/50 transition-all duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500" />
                      <div className="relative bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm p-8 text-white">
                        <div className="flex flex-col items-start gap-5 sm:flex-row sm:gap-6">
                          <div className="relative">
                            <img
                              src={appointment.image}
                              alt={appointment.doctorName}
                              className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white/30 shadow-2xl"
                            />
                            <div className="absolute -bottom-3 -right-3 bg-white p-3 rounded-xl shadow-xl">
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                              <div>
                                <h3 className="text-3xl font-black mb-1 tracking-tight">{appointment.doctorName}</h3>
                                <p className="text-lg font-bold text-white/90">{appointment.specialty}</p>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-5 h-5 ${i < appointment.rating ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}`} />
                                ))}
                              </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold">{appointment.date} • {appointment.time}</p>
                                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">COMPLETED</span>
                              </div>
                              <p className="text-sm opacity-90 mb-2">{appointment.reason}</p>
                              {appointment.prescription && (
                                <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                                  <FileText className="w-4 h-4" />
                                  <p className="text-xs font-semibold">Prescription Issued</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button className="flex-1 py-4 px-4 sm:px-6 bg-white text-green-600 rounded-xl font-bold hover:bg-green-50 transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
                                <Calendar className="w-5 h-5" />
                                BOOK AGAIN
                              </button>
                              <button className="flex-1 px-4 py-4 bg-white/20 backdrop-blur-md rounded-xl font-bold hover:bg-white/30 transition-all duration-300 border border-white/30 flex items-center justify-center gap-2 sm:flex-none sm:px-6">
                                <MessageSquare className="w-5 h-5" />
                                CONTACT
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
