import { useState, useEffect } from 'react';
import { Search, Plus, ShieldOff, Clock } from 'lucide-react';
import { getDoctors, addDoctor, deleteDoctor } from '../../lib/api';

export default function AdminManageDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', specialization: '', hours: 'Mon-Fri, 9AM-5PM', location: 'Main Clinic' });

  const fetchDoctors = () => {
    getDoctors({ search: searchTerm || undefined }).then(res => setDoctors(res.data)).catch(() => {});
  };

  useEffect(() => { fetchDoctors(); }, [searchTerm]);

  const handleAdd = async () => {
    if (!newDoc.name || !newDoc.specialization) return;
    await addDoctor(newDoc);
    setNewDoc({ name: '', specialization: '', hours: 'Mon-Fri, 9AM-5PM', location: 'Main Clinic' });
    setShowAdd(false);
    fetchDoctors();
  };

  const handleDelete = async (id: string) => {
    await deleteDoctor(id);
    fetchDoctors();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Doctors</h1>
          <p className="text-slate-500">{doctors.length} doctors in the system.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-5 h-5" /> Add New Doctor
        </button>
      </div>

      {/* Add Doctor Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Add New Doctor</h2>
            <input placeholder="Doctor Name" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input placeholder="Specialization" value={newDoc.specialization} onChange={e => setNewDoc({...newDoc, specialization: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input placeholder="Hours (e.g. Mon-Fri, 9AM-5PM)" value={newDoc.hours} onChange={e => setNewDoc({...newDoc, hours: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input placeholder="Location" value={newDoc.location} onChange={e => setNewDoc({...newDoc, location: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
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
          <input type="text" placeholder="Search doctors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {/* Doctor List */}
      <div className="space-y-4">
        {doctors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-lg">No doctors registered yet.</p>
          </div>
        ) : (
          doctors.map((doc: any) => (
            <div key={doc._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg border-4 border-white shadow-sm">
                  {doc.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{doc.name}</h3>
                  <p className="text-blue-600 font-medium text-sm">{doc.specialization}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {doc.hours}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${doc.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{doc.status}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(doc._id)} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm">
                <ShieldOff className="w-4 h-4 inline mr-1" /> Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
