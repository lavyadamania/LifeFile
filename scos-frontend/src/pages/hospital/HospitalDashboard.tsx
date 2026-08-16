import { useState, useEffect } from 'react';
import { Building2, Edit2, Users, UserPlus, Check, Loader2, X, Search, CalendarOff } from 'lucide-react';
import { getMyHospital, updateMyHospital, getDoctors, updateHospitalDoctors, hireHospitalDoctor, updateDoctor, getHospitalRequests, updateHospitalRequest, markDoctorUnavailable } from '../../lib/api';

export default function HospitalDashboard() {
  const [hospital, setHospital] = useState<any>(null);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', description: '', departments: '', status: 'active' });
  
  const [showHire, setShowHire] = useState(false);
  const [showUnavailModal, setShowUnavailModal] = useState(false);
  const [unavailForm, setUnavailForm] = useState({ doctorId: '', date: '', reason: '' });
  const [hireForm, setHireForm] = useState({ name: '', email: '', password: '', specialization: 'General Practice' });
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [hRes, dRes, rRes] = await Promise.all([getMyHospital(), getDoctors(), getHospitalRequests()]);
      setHospital(hRes.data);
      setAllDoctors(dRes.data);
      setRequests(rRes.data);
      setForm({
        name: hRes.data.name,
        address: hRes.data.address,
        phone: hRes.data.phone,
        email: hRes.data.email || '',
        description: hRes.data.description || '',
        departments: (hRes.data.departments || []).join(', '),
        status: hRes.data.status,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdateInfo = async () => {
    setSaving(true);
    try {
      const data = { ...form, departments: form.departments.split(',').map(d => d.trim()).filter(Boolean) };
      await updateMyHospital(data);
      setMsg('Hospital info updated!');
      setIsEditing(false);
      loadData();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'Failed to update');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleAddDoctor = async (doctorId: string) => {
    try {
      await updateHospitalDoctors(hospital._id, { doctorId, action: 'add' });
      setMsg('Doctor added to roster!');
      loadData();
    } catch {
      setMsg('Failed to add doctor');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRemoveDoctor = async (doctorId: string) => {
    try {
      await updateHospitalDoctors(hospital._id, { doctorId, action: 'remove' });
      setMsg('Doctor removed from roster');
      loadData();
    } catch {
      setMsg('Failed to remove doctor');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleHire = async () => {
    setSaving(true);
    try {
      await hireHospitalDoctor(hospital._id, hireForm);
      setMsg('Doctor hired & affiliated!');
      setShowHire(false);
      setHireForm({ name: '', email: '', password: '', specialization: 'General Practice' });
      loadData();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'Hire failed');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleToggleStatus = async (doctor: any) => {
    try {
      const newStatus = doctor.status === 'Active' ? 'On Leave' : 'Active';
      await updateDoctor(doctor._id || doctor, { status: newStatus });
      setMsg(`Doctor marked as ${newStatus}`);
      loadData();
    } catch {
      setMsg('Failed to update status');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleApproveRequest = async (reqId: string) => {
    try {
      await updateHospitalRequest(reqId, 'approved');
      setMsg('Request approved! Doctor added to roster.');
      loadData();
    } catch {
      setMsg('Failed to approve request');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRejectRequest = async (reqId: string) => {
    try {
      await updateHospitalRequest(reqId, 'rejected');
      setMsg('Request rejected.');
      loadData();
    } catch {
      setMsg('Failed to reject request');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleMarkUnavailable = async () => {
    if (!unavailForm.doctorId || !unavailForm.date) return;
    setSaving(true);
    try {
      await markDoctorUnavailable(hospital._id, unavailForm.doctorId, { date: unavailForm.date, reason: unavailForm.reason });
      setMsg('Doctor marked unavailable for that date.');
      setShowUnavailModal(false);
      setUnavailForm({ doctorId: '', date: '', reason: '' });
      loadData();
    } catch {
      setMsg('Failed to mark unavailable');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!hospital) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">Hospital Profile Not Found</h2>
        <p className="text-slate-600 mt-2">There was an issue loading your hospital details. Please contact support.</p>
      </div>
    );
  }

  const currentDoctors = hospital.doctors || [];
  const currentDoctorIds = new Set(currentDoctors.map((d: any) => d._id || d));
  const availableDoctors = allDoctors.filter(d => !currentDoctorIds.has(d._id) && (d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {msg && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2"><Check className="w-4 h-4" />{msg}</div>}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-600" /> {hospital.name}
            </h1>
            <p className="text-slate-500 mt-2 max-w-2xl">{hospital.description || 'No description provided.'}</p>
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors">
            {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />} {isEditing ? 'Cancel' : 'Edit Info'}
          </button>
        </div>

        {isEditing ? (
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Hospital Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="Address" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="Phone" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="Email" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Description" rows={2} className="md:col-span-2 w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
            <input value={form.departments} onChange={e => setForm(p => ({...p, departments: e.target.value}))} placeholder="Departments (comma-separated)" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <div className="md:col-span-2 flex justify-end">
              <button onClick={handleUpdateInfo} disabled={saving} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <div><span className="text-slate-400 block mb-1">Address</span><span className="font-medium text-slate-800">{hospital.address}</span></div>
            <div><span className="text-slate-400 block mb-1">Phone</span><span className="font-medium text-slate-800">{hospital.phone}</span></div>
            <div><span className="text-slate-400 block mb-1">Email</span><span className="font-medium text-slate-800">{hospital.email || '-'}</span></div>
            <div><span className="text-slate-400 block mb-1">Status</span><span className={`font-bold px-2 py-0.5 rounded text-xs ${hospital.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{hospital.status}</span></div>
            {hospital.departments?.length > 0 && (
              <div className="w-full"><span className="text-slate-400 block mb-2">Departments</span><div className="flex flex-wrap gap-1.5">{hospital.departments.map((d: string) => <span key={d} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-md">{d}</span>)}</div></div>
            )}
          </div>
        )}
      </div>

      {/* Join Requests */}
      {requests.filter((r: any) => r.status === 'pending').length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-amber-900 mb-4">Pending Doctor Applications</h2>
          <div className="space-y-3">
            {requests.filter((r: any) => r.status === 'pending').map((r: any) => (
              <div key={r._id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                <div>
                  <p className="font-bold text-slate-800">Dr. {r.doctorName}</p>
                  <p className="text-xs text-slate-500">Applied on: {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApproveRequest(r._id)} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded hover:bg-emerald-200 transition-colors">Approve</button>
                  <button onClick={() => handleRejectRequest(r._id)} className="px-3 py-1.5 bg-red-100 text-red-700 font-bold text-xs rounded hover:bg-red-200 transition-colors">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Active Roster */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" /> Active Roster ({currentDoctors.length})</h2>
            <button onClick={() => setShowHire(true)} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
              <UserPlus className="w-4 h-4" />Hire New
            </button>
          </div>

          {currentDoctors.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <p className="text-slate-500 font-medium">No doctors assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDoctors.map((d: any) => (
                <div key={d._id || d} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                    {(d.name || d).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{d.name || d}</p>
                    <p className="text-xs text-slate-500 truncate">{d.specialization || 'Doctor'} • {d.hours || 'Standard Hours'}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${d.status === 'On Leave' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{d.status || 'Active'}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setUnavailForm({ ...unavailForm, doctorId: d._id || d }); setShowUnavailModal(true); }} className="text-xs px-2 py-1 text-purple-600 bg-purple-50 rounded hover:bg-purple-100 font-medium transition-colors">Mark Unavailable</button>
                      <button onClick={() => handleToggleStatus(d)} className="text-xs px-2 py-1 text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 font-medium transition-colors">{d.status === 'On Leave' ? 'Set Active' : 'Set Leave'}</button>
                      <button onClick={() => handleRemoveDoctor(d._id || d)} className="text-xs px-2 py-1 text-red-600 bg-red-50 rounded hover:bg-red-100 font-medium transition-colors">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign Existing Doctors */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Search className="w-5 h-5 text-purple-600" /> Recruit Doctors</h2>
          
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input type="text" placeholder="Search by name or specialization..." value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {availableDoctors.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No matching unassigned doctors found.</p>
            ) : (
              availableDoctors.map(d => (
                <div key={d._id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-purple-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">{d.name.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.specialization}</p>
                    </div>
                  </div>
                  <button onClick={() => handleAddDoctor(d._id)} className="text-xs px-3 py-1.5 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 font-bold transition-colors shadow-sm">Assign</button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Hire Modal */}
      {showHire && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHire(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">Hire New Doctor</h2><button onClick={() => setShowHire(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <p className="text-sm text-slate-500">Create a new doctor account and automatically affiliate them with your hospital.</p>
            <input value={hireForm.name} onChange={e => setHireForm(p => ({...p, name: e.target.value}))} placeholder="Doctor Name *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <input type="email" value={hireForm.email} onChange={e => setHireForm(p => ({...p, email: e.target.value}))} placeholder="Email *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <input type="password" value={hireForm.password} onChange={e => setHireForm(p => ({...p, password: e.target.value}))} placeholder="Password *" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <input value={hireForm.specialization} onChange={e => setHireForm(p => ({...p, specialization: e.target.value}))} placeholder="Specialization" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <button onClick={handleHire} disabled={saving || !hireForm.name || !hireForm.email || !hireForm.password} className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}{saving ? 'Hiring...' : 'Hire & Affiliate'}</button>
          </div>
        </div>
      )}

      {/* Unavailability Modal */}
      {showUnavailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUnavailModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">Mark Unavailable</h2><button onClick={() => setShowUnavailModal(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <p className="text-sm text-slate-500">Select a date to mark this doctor as unavailable at your hospital.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" min={new Date().toISOString().split('T')[0]} value={unavailForm.date} onChange={e => setUnavailForm(p => ({...p, date: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <input type="text" placeholder="e.g. Holiday, Conference" value={unavailForm.reason} onChange={e => setUnavailForm(p => ({...p, reason: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <button onClick={handleMarkUnavailable} disabled={saving || !unavailForm.date} className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarOff className="w-4 h-4" />}{saving ? 'Saving...' : 'Confirm Date'}</button>
          </div>
        </div>
      )}

    </div>
  );
}
