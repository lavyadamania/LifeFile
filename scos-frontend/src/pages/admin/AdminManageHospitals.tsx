import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, Users, UserPlus, X, Check, Loader2 } from 'lucide-react';
import { getHospitals, addHospital, updateHospital, deleteHospital, getDoctors, updateHospitalDoctors, hireHospitalDoctor, updateDoctor } from '../../lib/api';

export default function AdminManageHospitals() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [rosterHospitalId, setRosterHospitalId] = useState<string | null>(null);
  const [hireHospitalId, setHireHospitalId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', description: '', departments: '', status: 'active' });
  const [hireForm, setHireForm] = useState({ name: '', email: '', password: '', specialization: 'General Practice' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => { getHospitals({ search: search || undefined }).then(r => setHospitals(r.data)).catch(() => {}); };
  useEffect(() => { load(); getDoctors().then(r => setAllDoctors(r.data)).catch(() => {}); }, [search]);

  const resetForm = () => setForm({ name: '', address: '', phone: '', email: '', description: '', departments: '', status: 'active' });

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, departments: form.departments.split(',').map(d => d.trim()).filter(Boolean) };
      if (editId) { await updateHospital(editId, data); } else { await addHospital(data); }
      setMsg(editId ? 'Hospital updated!' : 'Hospital created!');
      setShowAdd(false); setEditId(null); resetForm(); load();
    } catch (e: any) { setMsg(e?.response?.data?.error || 'Failed'); }
    setSaving(false); setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hospital?')) return;
    try { await deleteHospital(id); load(); setMsg('Hospital deleted'); } catch { setMsg('Delete failed'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleEdit = (h: any) => {
    setForm({ name: h.name, address: h.address, phone: h.phone, email: h.email || '', description: h.description || '', departments: (h.departments || []).join(', '), status: h.status });
    setEditId(h._id); setShowAdd(true);
  };

  const handleAddDoctor = async (hospitalId: string, doctorId: string) => {
    try { await updateHospitalDoctors(hospitalId, { doctorId, action: 'add' }); load(); getDoctors().then(r => setAllDoctors(r.data)); setMsg('Doctor added!'); } catch { setMsg('Failed'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRemoveDoctor = async (hospitalId: string, doctorId: string) => {
    try { await updateHospitalDoctors(hospitalId, { doctorId, action: 'remove' }); load(); getDoctors().then(r => setAllDoctors(r.data)); setMsg('Doctor removed'); } catch { setMsg('Failed'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleHire = async () => {
    if (!hireHospitalId) return;
    setSaving(true);
    try {
      await hireHospitalDoctor(hireHospitalId, hireForm);
      setMsg('Doctor hired & affiliated!'); setHireHospitalId(null); setHireForm({ name: '', email: '', password: '', specialization: 'General Practice' });
      load(); getDoctors().then(r => setAllDoctors(r.data));
    } catch (e: any) { setMsg(e?.response?.data?.error || 'Hire failed'); }
    setSaving(false); setTimeout(() => setMsg(''), 3000);
  };

  const handleToggleStatus = async (doctor: any) => {
    try {
      const newStatus = doctor.status === 'Active' ? 'On Leave' : 'Active';
      await updateDoctor(doctor._id || doctor, { status: newStatus });
      load(); getDoctors().then(r => setAllDoctors(r.data));
      setMsg(`Doctor marked as ${newStatus}`);
    } catch {
      setMsg('Failed to update status');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const rosterHospital = hospitals.find(h => h._id === rosterHospitalId);
  const rosterDoctorIds = new Set((rosterHospital?.doctors || []).map((d: any) => d._id || d));
  const availableDoctors = allDoctors.filter(d => !rosterDoctorIds.has(d._id));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {msg && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2"><Check className="w-4 h-4" />{msg}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-6 h-6 text-indigo-600" />Manage Hospitals</h1>
        <button onClick={() => { resetForm(); setEditId(null); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"><Plus className="w-5 h-5" />Add Hospital</button>
      </div>

      <div className="relative"><Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" /><input type="text" placeholder="Search hospitals..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" /></div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowAdd(false); setEditId(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">{editId ? 'Edit Hospital' : 'Add Hospital'}</h2><button onClick={() => { setShowAdd(false); setEditId(null); }}><X className="w-5 h-5 text-slate-400" /></button></div>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Hospital Name *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="Address *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="Phone *" className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="Email" className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Description" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
            <input value={form.departments} onChange={e => setForm(p => ({...p, departments: e.target.value}))} placeholder="Departments (comma-separated)" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="active">Active</option><option value="maintenance">Maintenance</option>
            </select>
            <button onClick={handleSave} disabled={saving || !form.name || !form.address || !form.phone} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">{saving ? 'Saving...' : editId ? 'Update Hospital' : 'Create Hospital'}</button>
          </div>
        </div>
      )}

      {/* Hire Doctor Modal */}
      {hireHospitalId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setHireHospitalId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">Hire New Doctor</h2><button onClick={() => setHireHospitalId(null)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <p className="text-sm text-slate-500">Register a new doctor account and affiliate with this hospital.</p>
            <input value={hireForm.name} onChange={e => setHireForm(p => ({...p, name: e.target.value}))} placeholder="Doctor Name *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input type="email" value={hireForm.email} onChange={e => setHireForm(p => ({...p, email: e.target.value}))} placeholder="Email *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input type="password" value={hireForm.password} onChange={e => setHireForm(p => ({...p, password: e.target.value}))} placeholder="Password *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input value={hireForm.specialization} onChange={e => setHireForm(p => ({...p, specialization: e.target.value}))} placeholder="Specialization" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            <button onClick={handleHire} disabled={saving || !hireForm.name || !hireForm.email || !hireForm.password} className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}{saving ? 'Hiring...' : 'Hire & Affiliate'}</button>
          </div>
        </div>
      )}

      {/* Hospital List */}
      <div className="space-y-4">
        {hospitals.map(h => {
          const isRosterExpanded = rosterHospitalId === h._id;
          const currentDoctors = h.doctors || [];
          const currentDoctorIds = new Set(currentDoctors.map((d: any) => d._id || d));
          const available = allDoctors.filter(d => !currentDoctorIds.has(d._id) && (d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())));

          return (
            <div key={h._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{h.name}</h3>
                  <p className="text-sm text-slate-500">{h.address} • {h.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${h.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{h.status}</span>
                  <button onClick={() => handleEdit(h)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4 text-slate-500" /></button>
                  <button onClick={() => handleDelete(h._id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
              
              {h.departments?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">{h.departments.map((d: string) => <span key={d} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-md">{d}</span>)}</div>
              )}
              
              <div className="flex items-center gap-3">
                <button onClick={() => { setRosterHospitalId(isRosterExpanded ? null : h._id); setDoctorSearch(''); }} className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isRosterExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  <Users className="w-4 h-4" />Manage Staff ({currentDoctors.length})
                </button>
                <button onClick={() => setHireHospitalId(h._id)} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                  <UserPlus className="w-4 h-4" />Hire New Doctor
                </button>
              </div>

              {/* Inline Roster Dashboard */}
              {isRosterExpanded && (
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Current Roster */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Active Roster</h3>
                    {currentDoctors.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-sm text-slate-500 font-medium">No doctors assigned yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentDoctors.map((d: any) => (
                          <div key={d._id || d} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                              {(d.name || d).charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{d.name || d}</p>
                              <p className="text-xs text-slate-500 truncate">{d.specialization || 'Doctor'} • {d.hours || 'Standard Hours'}</p>
                            </div>
                            <div className="flex flex-col gap-1 items-end shrink-0">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${d.status === 'On Leave' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{d.status || 'Active'}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleToggleStatus(d)} className="text-xs px-2 py-1 text-slate-600 bg-slate-100 rounded hover:bg-slate-200 font-medium transition-colors">{d.status === 'On Leave' ? 'Set Active' : 'Set Leave'}</button>
                                <button onClick={() => handleRemoveDoctor(h._id, d._id || d)} className="text-xs px-2 py-1 text-red-600 bg-red-50 rounded hover:bg-red-100 font-medium transition-colors">Remove</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Existing Doctor */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Assign Doctors</h3>
                    </div>
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input type="text" placeholder="Search unassigned..." value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {available.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No matching doctors found.</p>
                      ) : (
                        available.map(d => (
                          <div key={d._id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">{d.name.charAt(0)}</div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm leading-tight">{d.name}</p>
                                <p className="text-xs text-slate-500">{d.specialization}</p>
                              </div>
                            </div>
                            <button onClick={() => handleAddDoctor(h._id, d._id)} className="text-xs px-3 py-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 font-bold transition-colors shadow-sm">Assign</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {hospitals.length === 0 && <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">No hospitals yet.</p></div>}
      </div>
    </div>
  );
}
