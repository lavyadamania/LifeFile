import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, Calendar, FileText, TrendingUp, Building2,
  Loader2, Clock, UserCheck, Activity
} from 'lucide-react';
import { getHospitalAnalytics } from '../../lib/api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  Completed: '#22c55e', Confirmed: '#6366f1', Pending: '#f59e0b',
  Cancelled: '#ef4444', Missed: '#f97316', Rescheduled: '#8b5cf6', Postponed: '#64748b'
};

export default function HospitalAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHospitalAnalytics()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Loading hospital analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-slate-500">Failed to load analytics data.</div>;
  }

  const { kpis } = data;

  const kpiCards = [
    { title: 'Doctors', value: kpis.totalDoctors, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { title: 'Unique Patients', value: kpis.uniquePatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { title: 'Total Appointments', value: kpis.totalAppointments, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { title: 'Prescriptions', value: kpis.totalPrescriptions, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { title: "Today's Appts", value: kpis.todayAppts, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { title: 'Walk-ins', value: kpis.walkinCount, icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
    { title: 'Departments', value: kpis.departments, icon: Building2, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
    { title: 'Completion Rate', value: `${kpis.completionRate}%`, icon: TrendingUp, color: kpis.completionRate >= 70 ? 'text-emerald-600' : 'text-red-600', bg: kpis.completionRate >= 70 ? 'bg-emerald-50' : 'bg-red-50', border: kpis.completionRate >= 70 ? 'border-emerald-100' : 'border-red-100' },
  ];

  const trendData = (data.appointmentTrend || []).map((d: any) => ({
    date: new Date(d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Total: d.total,
    Completed: d.completed,
    'Walk-in': d.walkin,
  }));

  const doctorLoadData = (data.doctorLoad || []).map((d: any) => ({
    name: d._id?.length > 15 ? d._id.slice(0, 15) + '…' : d._id,
    Total: d.total,
    Completed: d.completed,
  }));

  const statusData = (data.statusBreakdown || []).map((d: any) => ({
    name: d._id, value: d.count,
  }));

  const deptData = (data.departmentLoad || []).map((d: any) => ({
    name: d._id, value: d.count,
  }));

  const peakData = (data.peakHours || []).map((d: any) => ({
    hour: `${d._id}:00`,
    count: d.count,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-7 h-7 text-purple-600" />
          Hospital Analytics
        </h1>
        <p className="text-slate-500 mt-1">Track facility performance, doctor workload, and patient flow.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((k, i) => (
          <div key={i} className={`${k.bg} border ${k.border} rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition-shadow`}>
            <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <k.icon className="w-14 h-14" />
            </div>
            <div className={`inline-flex p-2 rounded-xl ${k.bg} mb-3`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{k.title}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Patient Flow Trend</h2>
          <p className="text-xs text-slate-400 mb-4">Last 30 days — Total vs Completed vs Walk-in</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="hospTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="hospCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Total" stroke="#8b5cf6" strokeWidth={2} fill="url(#hospTotal)" />
              <Area type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={2} fill="url(#hospCompleted)" />
              <Area type="monotone" dataKey="Walk-in" stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Status Overview</h2>
          <p className="text-xs text-slate-400 mb-4">Appointment outcome distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusData.map((entry: any, i: number) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {statusData.map((s: any, i: number) => (
              <span key={i} className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.name] || COLORS[i % COLORS.length] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Workload */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-500" /> Doctor Workload
          </h2>
          <p className="text-xs text-slate-400 mb-4">Appointments handled per doctor</p>
          {doctorLoadData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No appointment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={doctorLoadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Completed" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Peak Hours + Department Split */}
        <div className="space-y-6">
          {/* Peak Hours */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Peak Hours
            </h2>
            <p className="text-xs text-slate-400 mb-4">Busiest hours at your facility</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={peakData}>
                <defs>
                  <linearGradient id="hospPeak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#hospPeak)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Department Distribution */}
          {deptData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-3">Specializations on Staff</h2>
              <div className="space-y-2">
                {deptData.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-700 flex-1">{d.name}</span>
                    <span className="text-sm font-bold text-slate-800">{d.value} doctor{d.value !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
