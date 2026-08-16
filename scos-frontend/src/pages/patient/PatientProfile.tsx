import { useState, useEffect } from 'react';
import { Phone, MapPin, Activity, Save, Loader2, FileText, Calendar, FileDown, ShieldCheck, Building2, UserPlus, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useAuthStore from '../../store/useAuthStore';
import PrescriptionPreview from '../../components/PrescriptionPreview';
import { getPatientProfile, updatePatientProfile, getAppointments, getPrescriptions, getDoctors } from '../../lib/api';

const profileSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

import { useNavigate } from 'react-router-dom';

export default function PatientProfile() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState<any>(null); // holds prescription data

  const { register, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { phone: '', address: '', emergencyContact: '' }
  });

  const loadData = async () => {
    try {
      const [profileRes, apptRes, rxRes, docsRes] = await Promise.all([
        getPatientProfile().catch(() => ({ data: null })),
        getAppointments().catch(() => ({ data: [] })),
        getPrescriptions().catch(() => ({ data: [] })),
        getDoctors().catch(() => ({ data: [] }))
      ]);

      if (profileRes.data) {
        setPatientDetails(profileRes.data);
        reset({
          phone: profileRes.data.phone || '',
          address: profileRes.data.address || '',
          emergencyContact: profileRes.data.emergencyContact || ''
        });
      }
      setAppointments(apptRes.data || []);
      setPrescriptions(rxRes.data || []);
      setDoctorsList(docsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const res = await updatePatientProfile(data);
      setPatientDetails(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  const toggleAccess = async (doctorId: string, grant: boolean) => {
    if (!patientDetails) return;
    try {
      let currentGranted = patientDetails.grantedDoctors || [];
      // grantedDoctors might be populated (objects) or strings depending on backend. We assume objects due to .populate()
      const currentIds = currentGranted.map((d: any) => d._id || d);
      
      let newIds = [...currentIds];
      if (grant && !newIds.includes(doctorId)) {
        newIds.push(doctorId);
      } else if (!grant) {
        newIds = newIds.filter(id => id !== doctorId);
      }

      const res = await updatePatientProfile({ grantedDoctors: newIds });
      setPatientDetails(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Loading profile...</div>;
  if (!patientDetails) return <div className="p-12 text-center text-red-500 font-medium">Profile not found. Please log in again.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Edit Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <span className="text-2xl font-bold">{user?.name?.charAt(0) || 'P'}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            {patientDetails?.currentHospital && (
              <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Primary Hospital</p>
                    <p className="font-bold text-slate-800">{patientDetails.currentHospital.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/patient/hospitals')}
                  className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  Change Hospital
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      disabled={!isEditing}
                      {...register('phone')}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 outline-none"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Emergency Contact</label>
                  <div className="relative">
                    <Activity className="w-4 h-4 text-red-400 absolute left-3 top-3.5" />
                    <input
                      disabled={!isEditing}
                      {...register('emergencyContact')}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 disabled:bg-slate-50 disabled:text-slate-500 outline-none"
                      placeholder="+1 (555) 999-9999"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Home Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      disabled={!isEditing}
                      {...register('address')}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 outline-none"
                      placeholder="123 Main St, City, Country"
                    />
                  </div>
                </div>

              </div>

              {isEditing && (
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { reset(); setIsEditing(false); }}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2 shadow-sm"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Privacy & Access Control */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Medical Record Access
              </h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">Control which doctors have permission to view your full medical history during consultations.</p>
            
            <div className="space-y-3">
              {doctorsList.map(doc => {
                const hasAccess = patientDetails.grantedDoctors?.some((d: any) => (d._id || d) === doc._id);
                return (
                  <div key={doc._id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-800">{doc.name}</p>
                      <p className="text-sm text-slate-500">{doc.specialization}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={hasAccess}
                        onChange={(e) => toggleAccess(doc._id, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Hospital History */}
          {patientDetails?.hospitalHistory?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Hospital History
                </h3>
              </div>
              <div className="space-y-3">
                {[...patientDetails.hospitalHistory].reverse().map((h: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-800">{h.hospitalName || 'Unknown Hospital'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Joined: {new Date(h.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {h.leftAt ? (
                      <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">
                        Left: {new Date(h.leftAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200">
                        Current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Medical History Snapshot */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              Latest Prescriptions
            </h3>
            {prescriptions.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">No prescriptions found.</p>
            ) : (
              <div className="space-y-3">
                {prescriptions.slice(0, 5).map(rx => (
                  <div key={rx._id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center group">
                    <div>
                      <p className="font-bold text-blue-900 text-sm">{rx.medications?.length} Medication(s)</p>
                      <p className="text-xs text-blue-700 mt-0.5">{new Date(rx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => setShowPreview(rx)}
                      className="p-2 text-blue-600 bg-white rounded-lg shadow-sm hover:bg-blue-100 transition-colors"
                      title="View PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Recent Consultations
            </h3>
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">No consultations found.</p>
            ) : (
              <ul className="space-y-4">
                {appointments.slice(0, 5).map(appt => (
                  <li key={appt._id} className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{appt.doctorName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{appt.type}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{appt.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {showPreview && (
        <PrescriptionPreview 
          onClose={() => setShowPreview(null)}
          patientName={user?.name || 'Patient'}
          doctorName={showPreview.doctorName || 'Doctor'}
          diagnosis={showPreview.diagnosis || ''}
          notes={showPreview.notes || ''}
          medications={showPreview.medications?.length > 0 ? showPreview.medications : undefined}
        />
      )}
    </div>
  );
}
