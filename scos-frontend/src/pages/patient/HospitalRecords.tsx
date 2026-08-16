import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, FileText, Pill, ChevronDown, ChevronUp, Calendar, Search } from 'lucide-react';
import { getHospital, getHospitalPatientRecords } from '../../lib/api';
import useAuthStore from '../../store/useAuthStore';

export default function HospitalRecords() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [hospital, setHospital] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRx, setExpandedRx] = useState<Set<string>>(new Set());
  const [doctorFilter, setDoctorFilter] = useState('All');

  useEffect(() => { if (id) getHospital(id).then(r => setHospital(r.data)).catch(() => {}); }, [id]);
  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    getHospitalPatientRecords(id, user.id).then(r => setRecords(r.data)).catch(() => setRecords([])).finally(() => setLoading(false));
  }, [id, user]);

  const toggleRx = (rxId: string) => { setExpandedRx(p => { const n = new Set(p); n.has(rxId) ? n.delete(rxId) : n.add(rxId); return n; }); };

  const doctorNames = ['All', ...Array.from(new Set(records.map(r => r.doctorName).filter(Boolean)))];
  const filtered = doctorFilter === 'All' ? records : records.filter(r => r.doctorName === doctorFilter);

  // Group by month
  const grouped = filtered.reduce((acc: any, rx: any) => {
    const month = new Date(rx.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(rx);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"><ArrowLeft className="w-5 h-5" /> Back</button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-6 h-6 text-indigo-600" />{hospital?.name || 'Hospital'} Records</h1>
          <p className="text-slate-500 text-sm mt-1">Your complete medical history at this hospital.</p>
        </div>
        <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
          {doctorNames.map(d => <option key={d} value={d}>{d === 'All' ? 'All Doctors' : d}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg font-medium">No records found.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-10 pb-8">
          {Object.entries(grouped).map(([month, rxList]: any) => (
            <div key={month} className="relative">
              <div className="flex items-center mb-4">
                <div className="absolute -left-[9px] w-4 h-4 bg-indigo-400 rounded-full border-4 border-slate-50"></div>
                <div className="pl-6 font-bold text-slate-800 bg-white py-1 px-3 rounded-full shadow-sm text-sm border border-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />{month}
                </div>
              </div>
              <div className="space-y-3 pl-6">
                {rxList.map((rx: any) => { const isOpen = expandedRx.has(rx._id); return (
                  <div key={rx._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <button onClick={() => toggleRx(rx._id)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0"><Pill className="w-4 h-4 text-indigo-600" /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{rx.diagnosis || 'Prescription'}</p>
                          <p className="text-xs text-slate-500">{new Date(rx.createdAt).toLocaleDateString()} • {rx.doctorName} • {rx.medications?.length || 0} med(s)</p>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
                        {rx.notes && <p className="text-sm text-slate-600 italic bg-amber-50 p-2 rounded-lg border border-amber-100">"{rx.notes}"</p>}
                        {rx.medications?.map((m: any, i: number) => (
                          <div key={i} className="text-sm pl-3 border-l-2 border-indigo-200">
                            <span className="font-bold text-slate-800">{m.name}</span>
                            <span className="text-slate-500 ml-1">{m.dosage}</span>
                            <span className="text-slate-400 ml-1">• {m.frequency} • {m.duration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
