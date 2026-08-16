import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Phone } from 'lucide-react';
import { getClinics, addClinic, updateClinic } from '../../lib/api';

export default function AdminManageClinics() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newClinic, setNewClinic] = useState({ name: '', address: '', phone: '', status: 'active' });

  const fetchClinics = () => {
    getClinics({ search: searchTerm || undefined }).then(res => setClinics(res.data)).catch(() => {});
  };

  useEffect(() => { fetchClinics(); }, [searchTerm]);

  const handleAdd = async () => {
    if (!newClinic.name || !newClinic.address || !newClinic.phone) return;
    await addClinic(newClinic);
    setNewClinic({ name: '', address: '', phone: '', status: 'active' });
    setShowAdd(false);
    fetchClinics();
  };

  const toggleStatus = async (clinic: any) => {
    const newStatus = clinic.status === 'active' ? 'maintenance' : 'active';
    await updateClinic(clinic._id, { status: newStatus });
    fetchClinics();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Clinics</h1>
          <p className="text-slate-500">{clinics.length} clinics in the network.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-5 h-5" /> Add New Clinic
        </button>
      </div>

      {/* Add Clinic Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Add New Clinic</h2>
            <input placeholder="Clinic Name" value={newClinic.name} onChange={e => setNewClinic({...newClinic, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input placeholder="Address" value={newClinic.address} onChange={e => setNewClinic({...newClinic, address: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input placeholder="Phone" value={newClinic.phone} onChange={e => setNewClinic({...newClinic, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={handleAdd} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          <input type="text" placeholder="Search clinics..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {/* Clinics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clinics.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-lg">No clinics registered yet.</p>
          </div>
        ) : (
          clinics.map((clinic: any) => (
            <div key={clinic._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${clinic.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {clinic.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">{clinic.name}</h2>
              </div>
              <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">{clinic.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                  <p className="text-sm font-medium text-slate-600">{clinic.phone}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button onClick={() => toggleStatus(clinic)} className={`flex-1 py-2 font-medium rounded-lg text-sm shadow-sm ${clinic.status === 'active' ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  {clinic.status === 'active' ? 'Set Maintenance' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
