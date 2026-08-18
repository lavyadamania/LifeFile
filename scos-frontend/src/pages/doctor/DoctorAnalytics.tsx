import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, Calendar, FileText, TrendingUp, Activity,
  Loader2, Clock, Star, Stethoscope, Pill
} from 'lucide-react';
import { getDoctorAnalytics } from '../../lib/api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  Completed: '#22c55e', Confirmed: '#6366f1', Pending: '#f59e0b',
  Cancelled: '#ef4444', Missed: '#f97316', Rescheduled: '#8b5cf6', Postponed: '#64748b'
};
const DAY_NAMES = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoctorAnalytics()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-slate-500">Failed to load analytics data.</div>;
  }

  const { kpis } = data;

  const kpiCards = [
    { title: 'Total Patients', value: kpis.uniquePatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { title: 'Total Appointments', value: kpis.totalAppointments, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { title: 'Prescriptions', value: kpis.totalPrescriptions, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { title: "Today's Appts", value: kpis.todayAppts, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { title: 'Completion Rate', value: `${kpis.completionRate}%`, icon: TrendingUp, color: kpis.completionRate >= 70 ? 'text-emerald-600' : 'text-red-600', bg: kpis.completionRate >= 70 ? 'bg-emerald-50' : 'bg-red-50', border: kpis.completionRate >= 70 ? 'border-emerald-100' : 'border-red-100' },
    { title: 'Rating', value: kpis.rating > 0 ? `${kpis.rating.toFixed(1)} ★` : 'N/A', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  ];

  const trendData = (data.appointmentTrend || []).map((d: any) => ({
    date: new Date(d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Total: d.total,
    Completed: d.completed,
  }));

  const statusData = (data.statusBreakdown || []).map((d: any) => ({
    name: d._id, value: d.count,
  }));

  const diagnosisData = (data.topDiagnoses || []).map((d: any) => ({
    name: d._id?.length > 25 ? d._id.slice(0, 25) + '…' : d._id,
    count: d.count,
  }));

  const medsData = (data.topMeds || []).map((d: any) => ({
    name: d._id?.length > 20 ? d._id.slice(0, 20) + '…' : d._id,
    count: d.count,
  }));

  const hospitalData = (data.hospitalDistribution || []).map((d: any) => ({
    name: d._id?.length > 20 ? d._id.slice(0, 20) + '…' : d._id,
    patients: d.count,
  }));

  const weeklyData = (data.weeklyPattern || []).map((d: any) => ({
    day: DAY_NAMES[d._id] || d._id,
    appointments: d.count,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Stethoscope className="w-7 h-7 text-indigo-600" />
          My Analytics
        </h1>
        <p className="text-slate-500 mt-1">Track your clinical performance and patient engagement.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((k, i) => (
          <div key={i} className={`${k.bg} border ${k.border} rounded-2xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow`}>
            <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <k.icon className="w-12 h-12" />
            </div>
            <div className={`inline-flex p-1.5 rounded-lg ${k.bg} mb-2`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{k.title}</p>
            <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Appointment Trend</h2>
          <p className="text-xs text-slate-400 mb-4">Your consultation volume — last 30 days</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="docTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="docCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} fill="url(#docTotal)" />
              <Area type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={2} fill="url(#docCompleted)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Status Breakdown</h2>
          <p className="text-xs text-slate-400 mb-4">All-time appointment outcomes</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
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
        {/* Top Diagnoses */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" /> Top Diagnoses
          </h2>
          <p className="text-xs text-slate-400 mb-4">Most common conditions you've treated</p>
          {diagnosisData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No diagnosis data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={diagnosisData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={140} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {diagnosisData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Medications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-500" /> Top Medications
          </h2>
          <p className="text-xs text-slate-400 mb-4">Most frequently prescribed drugs</p>
          {medsData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No prescription data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={medsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={130} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="count" fill="#14b8a6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hospital Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Patients by Hospital</h2>
          <p className="text-xs text-slate-400 mb-4">Where your patients come from</p>
          {hospitalData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No hospital data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hospitalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="patients" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weekly Pattern */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Weekly Pattern
          </h2>
          <p className="text-xs text-slate-400 mb-4">Busiest days of the week</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="appointments" radius={[6, 6, 0, 0]}>
                {weeklyData.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
