import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Star, ArrowLeft, Clock, UserPlus, FileText, ChevronDown, ChevronUp, Pill, ArrowRight } from 'lucide-react';
import { getHospital, getHospitalPatientRecords, transferHospital, getPatientProfile } from '../../lib/api';
import useAuthStore from '../../store/useAuthStore';

export default function HospitalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [expandedRx, setExpandedRx] = useState<Set<string>>(new Set());
  const [isRegistered, setIsRegistered] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { if (!id) return; setLoading(true); getHospital(id).then(r => setHospital(r.data)).catch(console.error).finally(() => setLoading(false)); }, [id]);
  useEffect(() => { if (user) getPatientProfile().then(r => { const h = r.data.currentHospital?._id || r.data.currentHospital; setIsRegistered(h === id); }).catch(() => {}); }, [user, id]);
  useEffect(() => { if (!id || !user) return; setLoadingRecords(true); getHospitalPatientRecords(id, user.id).then(r => setPatientRecords(r.data)).catch(() => setPatientRecords([])).finally(() => setLoadingRecords(false)); }, [id, user]);

  const handleTransfer = async () => { if (!id) return; setTransferring(true); try { await transferHospital(id); setIsRegistered(true); setSuccessMsg(`Registered at ${hospital?.name}!`); setTimeout(() => setSuccessMsg(''), 4000); } catch {} setTransferring(false); };
  const toggleRx = (rxId: string) => { setExpandedRx(p => { const n = new Set(p); n.has(rxId) ? n.delete(rxId) : n.add(rxId); return n; }); };

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!hospital) return <div className="text-center py-24"><p className="text-slate-500 text-lg">Hospital not found.</p></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"><ArrowLeft className="w-5 h-5" /> Back</button>
      {successMsg && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">✓ {successMsg}</div>}

      {/* Hospital Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center"><Building2 className="w-8 h-8" /></div>
              <div>
                <h1 className="text-3xl font-bold">{hospital.name}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-white/80 text-sm">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{hospital.address}</span>
                  <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{hospital.phone}</span>
                  {hospital.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{hospital.email}</span>}
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${hospital.status === 'active' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>{hospital.status === 'active' ? '● Active' : '● Maintenance'}</span>
          </div>
        </div>
        <div className="p-6">
          {hospital.description && <p className="text-slate-600 leading-relaxed mb-4">{hospital.description}</p>}
          {hospital.departments?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Departments</h3>
              <div className="flex flex-wrap gap-2">{hospital.departments.map((d: string) => <span key={d} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-100">{d}</span>)}</div>
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            {isRegistered ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-200">✓ You are registered here</span>
            ) : (
              <button onClick={handleTransfer} disabled={transferring} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                <UserPlus className="w-5 h-5" />{transferring ? 'Registering...' : 'Register at this Hospital'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Doctor Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800">Doctors on Staff ({hospital.doctors?.length || 0})</h2></div>
        {!hospital.doctors?.length ? (
          <div className="p-12 text-center text-slate-500">No doctors affiliated yet.</div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospital.doctors.map((doc: any) => (
              <div key={doc._id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0"><span className="text-lg font-bold text-indigo-600">{doc.name?.charAt(0)}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-800 truncate">{doc.name}</h3>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-xs flex-shrink-0"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /><span className="font-bold text-amber-700">{doc.rating || 'New'}</span></div>
                    </div>
                    <p className="text-indigo-600 text-sm font-medium mb-1">{doc.specialization}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3"><Clock className="w-3 h-3" />{doc.hours || 'Mon-Fri, 9AM-5PM'}</div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/patient/doctor/${doc._id}`)} className="text-xs font-medium px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">View Profile</button>
                      <button onClick={() => navigate(`/patient/book/${doc._id}?hospitalId=${hospital._id}&hospitalName=${encodeURIComponent(hospital.name)}`)} className="text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1">Book <ArrowRight className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Records */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-400" />My Records at {hospital.name}</h2></div>
        {loadingRecords ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div></div>
        : patientRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-500"><FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="font-medium">No records found.</p><p className="text-sm mt-1">Book an appointment to start your history here.</p></div>
        ) : (
          <div className="p-4 space-y-3">
            {patientRecords.map((rx: any) => { const isOpen = expandedRx.has(rx._id); return (
              <div key={rx._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button onClick={() => toggleRx(rx._id)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0"><div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0"><Pill className="w-4 h-4 text-indigo-600" /></div><div className="min-w-0"><p className="font-bold text-slate-800 truncate">{rx.diagnosis || 'Prescription'}</p><p className="text-xs text-slate-500">{new Date(rx.createdAt).toLocaleDateString()} • Dr. {rx.doctorName} • {rx.medications?.length || 0} med(s)</p></div></div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">{rx.notes && <p className="text-sm text-slate-600 italic bg-amber-50 p-2 rounded-lg border border-amber-100">"{rx.notes}"</p>}{rx.medications?.map((m: any, i: number) => <div key={i} className="text-sm pl-3 border-l-2 border-indigo-200"><span className="font-bold text-slate-800">{m.name}</span><span className="text-slate-500 ml-1">{m.dosage}</span><span className="text-slate-400 ml-1">• {m.frequency} • {m.duration}</span></div>)}</div>}
              </div>
            ); })}
          </div>
        )}
      </div>
    </div>
  );
}
