import { useState, useEffect } from 'react';
import { Users, Calendar, FileText, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStreamingStore from '../../services/streaming';
import useDoctorStore from '../../store/useDoctorStore';
import { getAppointments, getPrescriptions } from '../../lib/api';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { isConnected, connect, disconnect, queueList } = useStreamingStore();
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const { activeHospitalId } = useDoctorStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    getAppointments({ hospitalId: activeHospitalId }).then(res => setAppointmentCount(res.data.length)).catch(() => {});
    getPrescriptions({ hospitalId: activeHospitalId }).then(res => setPrescriptionCount(res.data.length)).catch(() => {});
  }, [activeHospitalId]);

  const metrics = [
    { title: 'Queue', value: String(queueList.length), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', link: '/doctor/queue' },
    { title: 'Appointments', value: String(appointmentCount), icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-100', link: '/doctor/schedule' },
    { title: 'Prescriptions', value: String(prescriptionCount), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100', link: '/doctor/records' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Doctor Dashboard</h1>
          <p className="text-slate-500">Overview of your clinical activity.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Activity className={`w-5 h-5 ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
          <span className="text-sm font-bold text-slate-700">{isConnected ? 'Kafka Live' : 'Connecting...'}</span>
          {isConnected && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((m, i) => (
          <button key={i} onClick={() => navigate(m.link)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${m.bg}`}>
                <m.icon className={`w-6 h-6 ${m.color}`} />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{m.title}</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{m.value}</h3>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button onClick={() => navigate('/doctor/queue')} className="w-full text-left px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 font-medium text-blue-700 transition-colors border border-blue-100 flex items-center justify-between">
              <span className="flex items-center gap-2"><Users className="w-5 h-5" /> View Patient Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/doctor/consultation/new')} className="w-full text-left px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 font-medium text-purple-700 transition-colors border border-purple-100 flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-5 h-5" /> New Prescription</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/doctor/schedule')} className="w-full text-left px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 font-medium text-emerald-700 transition-colors border border-emerald-100 flex items-center justify-between">
              <span className="flex items-center gap-2"><Calendar className="w-5 h-5" /> My Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kafka Status */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-sm">
          <h3 className="text-lg font-bold mb-4">Streaming Infrastructure</h3>
          <div className="space-y-3">
            {['scos.queue.updates', 'scos.appointments', 'scos.prescriptions'].map(topic => (
              <div key={topic} className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-400 font-mono">{topic}</span>
                <span className={`font-mono ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isConnected ? 'active' : 'offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
