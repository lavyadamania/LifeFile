import { useState, useEffect } from 'react';
import { Users, UserCheck, CalendarDays, Activity, Server, ArrowUpRight } from 'lucide-react';
import useStreamingStore from '../../services/streaming';
import { getStats } from '../../lib/api';

export default function AdminDashboard() {
  const { isConnected } = useStreamingStore();

  const [stats, setStats] = useState({
    totalPatients: 0,
    activeDoctors: 0,
    todayAppointments: 0,
    activeClinics: 0,
  });

  useEffect(() => {
    getStats().then(res => setStats(res.data)).catch(() => {});
  }, []);

  const metrics = [
    { title: 'Total Patients', value: String(stats.totalPatients), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Active Doctors', value: String(stats.activeDoctors), icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: "Today's Appointments", value: String(stats.todayAppointments), icon: CalendarDays, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'Active Clinics', value: String(stats.activeClinics), icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Overview</h1>
          <p className="text-slate-500">Monitor system performance and clinic metrics.</p>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Server className={`w-5 h-5 ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Backend Status</p>
            <p className="text-sm font-bold text-emerald-700">Connected to MongoDB</p>
          </div>
          <span className="relative flex h-3 w-3 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${m.bg}`}>
                <m.icon className={`w-6 h-6 ${m.color}`} />
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
                Live
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{m.title}</p>
              <h3 className="text-3xl font-extrabold text-slate-800">{m.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">System Info</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="font-medium text-slate-500">Database</span>
              <span className="font-bold text-slate-800">MongoDB (local)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="font-medium text-slate-500">Backend</span>
              <span className="font-bold text-slate-800">Express.js on :5000</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="font-medium text-slate-500">Frontend</span>
              <span className="font-bold text-slate-800">React + Vite on :5173</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium text-slate-500">Auth</span>
              <span className="font-bold text-slate-800">JWT (7-day expiry)</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Server className="w-32 h-32" />
            </div>
            <h3 className="text-lg font-bold mb-2 relative z-10">Streaming Infrastructure</h3>
            <p className="text-slate-300 text-sm mb-6 relative z-10">
              Kafka topics bridging real-time events.
            </p>
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-400">topic_queue_updates</span>
                <span className="font-mono text-emerald-400">0 lag</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-400">topic_prescriptions</span>
                <span className="font-mono text-emerald-400">0 lag</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition-colors border border-slate-100">
                Register New Doctor
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition-colors border border-slate-100">
                Add Clinic Branch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
