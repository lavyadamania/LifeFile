import { useState, useEffect } from 'react';
import {
  Users, Calendar, FileText, Activity, ArrowRight,
  Building2, Stethoscope, MapPin, TrendingUp, Clock,
  CheckCircle2, AlertCircle, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStreamingStore from '../../services/streaming';
import useDoctorStore from '../../store/useDoctorStore';
import { getAppointments, getPrescriptions, getDoctorProfile } from '../../lib/api';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { isConnected, connect, disconnect, queueList, fetchQueue } = useStreamingStore();
  const { mode, setMode, activeHospitalId, hospitals } = useDoctorStore();

  const [hospitalStats, setHospitalStats] = useState({ appointments: 0, prescriptions: 0 });
  const [privateStats, setPrivateStats] = useState({ appointments: 0, prescriptions: 0 });
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    getDoctorProfile().then(res => setDoctorProfile(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const docId = doctorProfile?._id || doctorProfile?.id;
    if (docId) {
      fetchQueue(docId);
      const interval = setInterval(() => fetchQueue(docId), 5000);
      return () => clearInterval(interval);
    }
  }, [doctorProfile, fetchQueue]);

  useEffect(() => {
    // Hospital stats
    getAppointments({ hospitalId: 'hospital' }).then(res => {
      setHospitalStats(prev => ({ ...prev, appointments: res.data.length }));
    }).catch(() => {});
    getPrescriptions({ hospitalId: 'hospital' }).then(res => {
      setHospitalStats(prev => ({ ...prev, prescriptions: res.data.length }));
    }).catch(() => {});

    // Private clinic stats
    getAppointments({ hospitalId: 'private' }).then(res => {
      setPrivateStats(prev => ({ ...prev, appointments: res.data.length }));
    }).catch(() => {});
    getPrescriptions({ hospitalId: 'private' }).then(res => {
      setPrivateStats(prev => ({ ...prev, prescriptions: res.data.length }));
    }).catch(() => {});
  }, []);

  const hospitalQueueCount = queueList.filter(p => p.hospitalId && p.hospitalId !== 'private').length;
  const privateQueueCount = queueList.filter(p => !p.hospitalId || p.hospitalId === 'private').length;

  const currentStats = mode === 'hospital' ? hospitalStats : privateStats;
  const currentQueueCount = mode === 'hospital' ? hospitalQueueCount : privateQueueCount;

  const metrics = [
    {
      title: 'In Queue',
      value: String(currentQueueCount),
      icon: Users,
      color: mode === 'hospital' ? 'text-blue-600' : 'text-emerald-600',
      bg: mode === 'hospital' ? 'bg-blue-100' : 'bg-emerald-100',
      link: '/doctor/queue'
    },
    {
      title: 'Appointments',
      value: String(currentStats.appointments),
      icon: Calendar,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
      link: '/doctor/schedule'
    },
    {
      title: 'Prescriptions',
      value: String(currentStats.prescriptions),
      icon: FileText,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      link: '/doctor/records'
    },
  ];

  const isHospital = mode === 'hospital';

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {isHospital ? 'Hospital Dashboard' : 'Private Clinic Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isHospital
              ? 'Managing appointments & queues across affiliated hospitals'
              : 'Managing your independent private practice'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Activity className={`w-5 h-5 ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
          <span className="text-sm font-bold text-slate-700">{isConnected ? 'Live Stream' : 'Connecting...'}</span>
          {isConnected && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </div>

      {/* Mode Toggle Cards — prominent selector */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hospital Card */}
        <button
          onClick={() => setMode('hospital')}
          className={`relative rounded-2xl p-5 text-left transition-all border-2 ${
            isHospital
              ? 'border-blue-500 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 scale-[1.01]'
              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          {isHospital && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="w-5 h-5 text-blue-200" />
            </div>
          )}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${isHospital ? 'bg-white/20' : 'bg-blue-100'}`}>
            <Building2 className={`w-6 h-6 ${isHospital ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <h3 className={`font-extrabold text-lg ${isHospital ? 'text-white' : 'text-slate-800'}`}>Hospital</h3>
          <p className={`text-sm mt-1 ${isHospital ? 'text-blue-100' : 'text-slate-500'}`}>
            {hospitals.length > 0
              ? `${hospitals.length} affiliated hospital${hospitals.length > 1 ? 's' : ''}`
              : 'No hospitals affiliated yet'}
          </p>
          <div className={`mt-3 flex items-center gap-3 text-sm font-semibold ${isHospital ? 'text-blue-100' : 'text-slate-600'}`}>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{hospitalQueueCount} in queue</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{hospitalStats.appointments} appts</span>
          </div>
        </button>

        {/* Private Clinic Card */}
        <button
          onClick={() => setMode('private')}
          className={`relative rounded-2xl p-5 text-left transition-all border-2 ${
            !isHospital
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200 scale-[1.01]'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
          }`}
        >
          {!isHospital && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </div>
          )}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${!isHospital ? 'bg-white/20' : 'bg-emerald-100'}`}>
            <Stethoscope className={`w-6 h-6 ${!isHospital ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <h3 className={`font-extrabold text-lg ${!isHospital ? 'text-white' : 'text-slate-800'}`}>Private Clinic</h3>
          <p className={`text-sm mt-1 ${!isHospital ? 'text-emerald-100' : 'text-slate-500'}`}>
            {doctorProfile?.location || 'Your independent practice'}
          </p>
          <div className={`mt-3 flex items-center gap-3 text-sm font-semibold ${!isHospital ? 'text-emerald-100' : 'text-slate-600'}`}>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{privateQueueCount} in queue</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{privateStats.appointments} appts</span>
          </div>
        </button>
      </div>

      {/* Active Mode Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((m, i) => (
          <button
            key={i}
            onClick={() => navigate(m.link)}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${m.bg}`}>
                <m.icon className={`w-6 h-6 ${m.color}`} />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{m.title}</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{m.value}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {isHospital ? 'Hospital appointments' : 'Private clinic only'}
            </p>
          </button>
        ))}
      </div>

      {/* Quick Actions + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/doctor/queue')}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors border flex items-center justify-between ${
                isHospital
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                View {isHospital ? 'Hospital' : 'Private Clinic'} Queue
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/doctor/consultation/new')}
              className="w-full text-left px-4 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 font-medium text-violet-700 transition-colors border border-violet-100 flex items-center justify-between"
            >
              <span className="flex items-center gap-2"><FileText className="w-5 h-5" /> New Prescription</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/doctor/schedule')}
              className="w-full text-left px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 font-medium text-amber-700 transition-colors border border-amber-100 flex items-center justify-between"
            >
              <span className="flex items-center gap-2"><Calendar className="w-5 h-5" /> My Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Context Info Panel */}
        {isHospital ? (
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-sm">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" /> Affiliated Hospitals
            </h3>
            <p className="text-slate-400 text-xs mb-4">Appointments are filtered per selected hospital</p>
            {hospitals.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-slate-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-sm text-center">No affiliated hospitals yet.<br />Request to join a hospital from the Hospitals page.</p>
                <button
                  onClick={() => navigate('/doctor/hospitals')}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Browse Hospitals
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {hospitals.map(h => (
                  <div key={h._id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">{h.name}</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-2xl p-6 text-white shadow-sm">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-300" /> Private Practice Info
            </h3>
            <p className="text-emerald-200 text-xs mb-5">Appointments with no hospital affiliation</p>
            <div className="space-y-3">
              {doctorProfile?.location && (
                <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="text-sm">{doctorProfile.location}</span>
                </div>
              )}
              {doctorProfile?.hours && (
                <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <Clock className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="text-sm">{doctorProfile.hours}</span>
                </div>
              )}
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <Star className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="text-sm">Rating: {doctorProfile?.rating || '—'} · {doctorProfile?.reviewCount || 0} reviews</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <TrendingUp className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="text-sm">{privateStats.appointments} total private appointments</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
