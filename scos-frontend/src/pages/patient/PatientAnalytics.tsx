import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, Calendar, FileText, TrendingUp, Heart,
  Loader2, Stethoscope, Building2, Pill
} from 'lucide-react';
import { getPatientAnalytics } from '../../lib/api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  Completed: '#22c55e', Confirmed: '#6366f1', Pending: '#f59e0b',
  Cancelled: '#ef4444', Missed: '#f97316', Rescheduled: '#8b5cf6', Postponed: '#64748b'
};

export default function PatientAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientAnalytics()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Loading your health analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-slate-500">Failed to load analytics data.</div>;
  }

  const { kpis } = data;

  const kpiCards = [
    { title: 'Total Visits', value: kpis.totalAppointments, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { title: 'Completed', value: kpis.completedAppointments, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { title: 'Prescriptions', value: kpis.totalPrescriptions, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { title: 'Doctors Consulted', value: kpis.uniqueDoctors, icon: Stethoscope, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  ];

  const historyData = (data.appointmentHistory || []).map((d: any) => {
    const [year, month] = d._id.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
      Total: d.total,
      Completed: d.completed,
    };
  });

  const statusData = (data.statusBreakdown || []).map((d: any) => ({
    name: d._id, value: d.count,
  }));

  const doctorsData = (data.doctorsVisited || []).map((d: any) => ({
    name: d._id?.length > 15 ? d._id.slice(0, 15) + '…' : (d._id || 'Unknown'),
    visits: d.count,
    spec: d.spec || '',
  }));

  const hospitalsData = (data.hospitalsVisited || []).map((d: any) => ({
    name: d._id?.length > 18 ? d._id.slice(0, 18) + '…' : d._id,
    visits: d.count,
  }));

  const medsData = (data.medications || []).map((d: any) => ({
    name: d._id?.length > 18 ? d._id.slice(0, 18) + '…' : d._id,
    count: d.count,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Heart className="w-7 h-7 text-rose-500" />
          My Health Analytics
        </h1>
        <p className="text-slate-500 mt-1">A comprehensive view of your healthcare journey.</p>
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
        {/* Visit History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Visit History</h2>
          <p className="text-xs text-slate-400 mb-4">Monthly appointment activity — up to 12 months</p>
          {historyData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No appointment history yet. Book your first appointment!</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="patTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} fill="url(#patTotal)" />
                <Area type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Appointment Outcomes</h2>
          <p className="text-xs text-slate-400 mb-4">How your visits turned out</p>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet</div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctors Visited */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-500" /> My Doctors
          </h2>
          <p className="text-xs text-slate-400 mb-4">Doctors you've consulted</p>
          {doctorsData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No consultations yet</div>
          ) : (
            <div className="space-y-3">
              {doctorsData.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                    {d.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.spec || 'Specialist'}</p>
                  </div>
                  <span className="text-sm font-extrabold text-indigo-600">{d.visits}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hospitals */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-500" /> Hospitals Visited
          </h2>
          <p className="text-xs text-slate-400 mb-4">Your healthcare facility history</p>
          {hospitalsData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No hospital visits yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hospitalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="visits" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Medications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-500" /> My Medications
          </h2>
          <p className="text-xs text-slate-400 mb-4">Drugs prescribed to you</p>
          {medsData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No medications prescribed yet</div>
          ) : (
            <div className="space-y-2">
              {medsData.map((m: any, i: number) => {
                const maxCount = medsData[0]?.count || 1;
                const widthPercent = Math.max((m.count / maxCount) * 100, 12);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[70%]">{m.name}</span>
                      <span className="text-xs font-bold text-teal-600">{m.count}×</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${widthPercent}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
