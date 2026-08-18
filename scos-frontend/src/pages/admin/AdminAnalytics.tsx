import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, UserCheck, Building2, Calendar, FileText, TrendingUp, Activity,
  Heart, Loader2, Clock, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { getAdminAnalytics } from '../../lib/api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  Completed: '#22c55e', Confirmed: '#6366f1', Pending: '#f59e0b',
  Cancelled: '#ef4444', Missed: '#f97316', Rescheduled: '#8b5cf6', Postponed: '#64748b'
};

const DAY_NAMES = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAnalytics()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-slate-500">Failed to load analytics data.</div>;
  }

  const { kpis } = data;

  const kpiCards = [
    { title: 'Total Patients', value: kpis.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { title: 'Active Doctors', value: kpis.totalDoctors, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { title: 'Hospitals', value: kpis.totalHospitals, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { title: 'Total Appointments', value: kpis.totalAppointments, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { title: 'Prescriptions', value: kpis.totalPrescriptions, icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
    { title: "Today's Appointments", value: kpis.todayAppointments, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { title: 'Completion Rate', value: `${kpis.completionRate}%`, icon: TrendingUp, color: kpis.completionRate >= 70 ? 'text-emerald-600' : 'text-red-600', bg: kpis.completionRate >= 70 ? 'bg-emerald-50' : 'bg-red-50', border: kpis.completionRate >= 70 ? 'border-emerald-100' : 'border-red-100' },
    { title: 'Completed', value: kpis.completedAppointments, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  ];

  // Format data
  const trendData = (data.appointmentTrend || []).map((d: any) => ({
    date: new Date(d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Total: d.total,
    Completed: d.completed,
    Cancelled: d.cancelled,
    Missed: d.missed,
  }));

  const growthData = (data.patientGrowth || []).map((d: any) => ({
    date: new Date(d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    patients: d.count,
  }));

  const statusData = (data.appointmentsByStatus || []).map((d: any) => ({
    name: d._id,
    value: d.count,
  }));

  const specData = (data.doctorsBySpec || []).map((d: any) => ({
    name: d._id,
    count: d.count,
  }));

  const hospitalData = (data.hospitalLoad || []).map((d: any) => ({
    name: d._id?.length > 18 ? d._id.slice(0, 18) + '…' : d._id,
    appointments: d.count,
  }));

  const peakData = (data.peakHours || []).map((d: any) => ({
    hour: `${d._id}:00`,
    count: d.count,
  }));

  const walkinData = [
    { name: 'Booked', value: data.walkinVsBooked?.booked || 0 },
    { name: 'Walk-in', value: data.walkinVsBooked?.walkin || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600" />
            System Analytics
          </h1>
          <p className="text-slate-500 mt-1">Real-time insights across the entire LifeFile ecosystem.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="text-sm font-semibold text-indigo-700">Live Data</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((k, i) => (
          <div key={i} className={`${k.bg} border ${k.border} rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition-shadow`}>
            <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <k.icon className="w-16 h-16" />
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
        {/* Appointment Trend — Large */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Appointment Trend</h2>
          <p className="text-xs text-slate-400 mb-4">Last 30 days — daily breakdown</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} fill="url(#colorTotal)" />
              <Area type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={2} fill="url(#colorCompleted)" />
              <Area type="monotone" dataKey="Cancelled" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown — Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Status Distribution</h2>
          <p className="text-xs text-slate-400 mb-4">All-time appointment statuses</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map((entry: any, i: number) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {statusData.map((s: any, i: number) => (
              <span key={i} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.name] || COLORS[i % COLORS.length] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Growth */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Patient Registrations
          </h2>
          <p className="text-xs text-slate-400 mb-4">New patient sign-ups — last 30 days</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="patients" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Doctors by Specialization */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Doctors by Specialization</h2>
          <p className="text-xs text-slate-400 mb-4">Distribution across medical specialties</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={specData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={120} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {specData.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hospital Load */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Hospital Load</h2>
          <p className="text-xs text-slate-400 mb-4">Appointments per hospital</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hospitalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="appointments" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Peak Hours
          </h2>
          <p className="text-xs text-slate-400 mb-4">Appointment volume by hour of day</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={peakData}>
              <defs>
                <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#colorPeak)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Walk-in vs Booked */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Walk-in vs Booked</h2>
          <p className="text-xs text-slate-400 mb-4">Appointment source distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={walkinData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value">
                <Cell fill="#6366f1" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <span className="w-3 h-3 rounded-full bg-indigo-500" /> Booked ({walkinData[0].value})
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Walk-in ({walkinData[1].value})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
