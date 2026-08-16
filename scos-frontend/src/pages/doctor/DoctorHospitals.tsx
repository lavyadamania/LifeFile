import { useState, useEffect } from 'react';
import { Building2, Search, Send, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getHospitals, applyToHospital, getDoctorApplications } from '../../lib/api';

export default function DoctorHospitals() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      const [hRes, aRes] = await Promise.all([
        getHospitals({ search }),
        getDoctorApplications()
      ]);
      setHospitals(hRes.data);
      setApplications(aRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleApply = async (hospitalId: string) => {
    try {
      await applyToHospital(hospitalId);
      setMsg('Application submitted successfully!');
      loadData();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'Failed to apply');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const getApplicationStatus = (hospitalId: string) => {
    return applications.find(a => a.hospitalId === hospitalId)?.status;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />{msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hospital Network</h1>
        <p className="text-slate-500">Find and apply to partner hospitals.</p>
      </div>

      {/* My Applications Section */}
      {applications.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">My Applications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {applications.map(app => (
              <div key={app._id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{app.hospitalName}</p>
                  <p className="text-xs text-slate-500 mt-1">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  {app.status === 'pending' && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>}
                  {app.status === 'approved' && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>}
                  {app.status === 'rejected' && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
        <input 
          type="text" 
          placeholder="Search hospitals by name or location..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hospitals.map(h => {
            const status = getApplicationStatus(h._id);
            const isMember = h.doctors?.some((d: any) => d._id === applications[0]?.doctorId || d === applications[0]?.doctorId); // Approximation check

            return (
              <div key={h._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 leading-tight">{h.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{h.address}</p>
                      {h.departments?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {h.departments.slice(0, 3).map((d: string) => (
                            <span key={d} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">{d}</span>
                          ))}
                          {h.departments.length > 3 && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">+{h.departments.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {h.doctors?.length || 0} Affiliated Doctors
                  </span>
                  
                  {!status && !isMember && (
                    <button 
                      onClick={() => handleApply(h._id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Send className="w-4 h-4" /> Apply to Join
                    </button>
                  )}

                  {status === 'pending' && <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-bold rounded-lg flex items-center gap-1.5"><Clock className="w-4 h-4" /> Pending</span>}
                  {status === 'approved' && <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Approved</span>}
                  {status === 'rejected' && <span className="px-3 py-1.5 bg-red-50 text-red-700 text-sm font-bold rounded-lg flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Rejected</span>}
                </div>
              </div>
            );
          })}
          {hospitals.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No hospitals found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
