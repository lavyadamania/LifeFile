import { useState, useEffect } from 'react';
import { Activity, Stethoscope, FileText, ChevronDown, ChevronUp, Clock, Pill, Building2, CalendarCheck, MapPin, Upload, Lock, FileImage, Droplets, ActivitySquare, X, Loader2 } from 'lucide-react';
import PrescriptionPreview from '../../components/PrescriptionPreview';
import { getPrescriptions, getAppointments, getMedicalRecords, uploadAttachment, createMedicalRecord, verifyMedicalRecordPassword } from '../../lib/api';

type TimelineEvent = {
  id: string;
  type: 'prescription' | 'appointment' | 'record';
  date: Date;
  hospitalName: string;
  title: string;
  subtitle: string;
  rawData: any;
};

export default function MedicalTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [previewPrescription, setPreviewPrescription] = useState<any>(null);

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', type: 'other', password: '', isProtected: false });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Password State
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null); // holds record ID
  const [recordPassword, setRecordPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const loadTimeline = () => {
    setLoading(true);
    Promise.all([
      getPrescriptions().catch(() => ({ data: [] })),
      getAppointments({ status: 'Completed' }).catch(() => ({ data: [] })),
      getMedicalRecords().catch(() => ({ data: [] })),
    ]).then(([rxRes, apptRes, recordRes]) => {
      const rxEvents: TimelineEvent[] = rxRes.data.map((rx: any) => ({
        id: `rx-${rx._id}`,
        type: 'prescription',
        date: new Date(rx.createdAt),
        hospitalName: rx.hospitalName || 'Individual Clinic',
        title: rx.diagnosis || 'Prescription',
        subtitle: `${rx.doctorName} • ${rx.medications?.length || 0} med(s)`,
        rawData: rx,
      }));

      const apptEvents: TimelineEvent[] = apptRes.data.map((appt: any) => {
        const apptDate = new Date(`${appt.date}T${appt.time || '00:00:00'}`);
        return {
          id: `appt-${appt._id}`,
          type: 'appointment',
          date: isNaN(apptDate.getTime()) ? new Date(appt.date) : apptDate,
          hospitalName: appt.hospitalName || 'Individual Clinic',
          title: `Consultation with Dr. ${appt.doctorName}`,
          subtitle: `Completed • ${appt.spec || 'General'}`,
          rawData: appt,
        };
      });

      const recordEvents: TimelineEvent[] = recordRes.data.map((rec: any) => ({
        id: `rec-${rec._id}`,
        type: 'record',
        date: new Date(rec.createdAt),
        hospitalName: 'Uploaded by Patient',
        title: rec.title || 'Medical Report',
        subtitle: `Type: ${rec.type.toUpperCase()} ${rec.isPasswordProtected ? '• 🔒 Password Protected' : ''}`,
        rawData: rec,
      }));

      const allEvents = [...rxEvents, ...apptEvents, ...recordEvents].sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(allEvents);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const toggleEvent = (id: string) => {
    const newSet = new Set(expandedEvents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedEvents(newSet);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadForm.title) return;
    setUploading(true);
    try {
      const attRes = await uploadAttachment(uploadFile, uploadForm.type);
      await createMedicalRecord({
        title: uploadForm.title,
        type: uploadForm.type,
        fileUrl: attRes.data.url,
        password: uploadForm.isProtected ? uploadForm.password : undefined
      });
      setShowUploadModal(false);
      setUploadForm({ title: '', type: 'other', password: '', isProtected: false });
      setUploadFile(null);
      loadTimeline();
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const handleVerify = async () => {
    if (!showPasswordModal || !recordPassword) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await verifyMedicalRecordPassword(showPasswordModal, recordPassword);
      window.open(`http://localhost:5000${res.data.fileUrl}`, '_blank');
      setShowPasswordModal(null);
      setRecordPassword('');
    } catch (err) {
      setVerifyError('Incorrect password');
    }
    setVerifying(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Global Medical Timeline</h1>
          <p className="text-slate-500">A unified, chronological history of your visits, prescriptions, and medical records.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shrink-0"
        >
          <Upload className="w-5 h-5" /> Upload Report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg font-medium">No medical history yet.</p>
          <p className="text-sm text-slate-400 mt-1">Your unified records will appear here.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-8">
          {events.map((event) => {
            const isExpanded = expandedEvents.has(event.id);
            const isRx = event.type === 'prescription';
            const isRec = event.type === 'record';
            const rx = event.rawData;

            return (
              <div key={event.id} className="relative pl-8">
                {/* Timeline Dot */}
                <div className={`absolute -left-[11px] top-4 w-5 h-5 rounded-full border-4 border-slate-50 ${isRx ? 'bg-emerald-400' : isRec ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                
                <div className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden ${isExpanded ? 'border-slate-300 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div
                    onClick={() => toggleEvent(event.id)}
                    className={`p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4 ${isExpanded ? (isRx ? 'bg-emerald-50 border-emerald-200' : isRec ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200') : 'bg-white'}`}
                  >
                    <div className={`p-3 rounded-lg border shadow-sm shrink-0 flex items-center justify-center ${isRx ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : isRec ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                      {isRx ? <Pill className="w-6 h-6" /> : isRec ? <FileImage className="w-6 h-6" /> : <CalendarCheck className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-800 text-lg">{event.title}</h3>
                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">
                        {event.subtitle}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 pt-1">
                        {event.hospitalName === 'Individual Clinic' ? (
                          <Stethoscope className="w-3.5 h-3.5" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5" />
                        )}
                        {event.hospitalName}
                      </div>
                    </div>

                    <div className="text-slate-400 hidden sm:block shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 bg-white space-y-3">
                      {isRx ? (
                        <>
                          {rx.notes && (
                            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100/50 text-sm text-slate-700 italic border-l-4 border-l-amber-300">
                              "{rx.notes}"
                            </div>
                          )}
                          {rx.medications?.map((med: any, i: number) => (
                            <div key={i} className="text-sm pl-3 border-l-2 border-emerald-200">
                              <span className="font-bold text-slate-800">{med.name}</span>
                              <span className="text-slate-500 ml-1">{med.dosage}</span>
                              <span className="text-slate-400 ml-1">• {med.frequency} • {med.duration}</span>
                            </div>
                          ))}
                          <button
                            onClick={() => setPreviewPrescription(rx)}
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                          >
                            <FileText className="w-4 h-4" /> View PDF Prescription
                          </button>
                        </>
                      ) : isRec ? (
                        <div className="text-sm text-slate-600 space-y-3">
                          <p><strong className="text-slate-800">Date Uploaded:</strong> {event.date.toLocaleString()}</p>
                          {rx.isPasswordProtected ? (
                            <button
                              onClick={() => setShowPasswordModal(rx._id)}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              <Lock className="w-4 h-4" /> Unlock & View File
                            </button>
                          ) : (
                            <a
                              href={`http://localhost:5000${rx.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 font-medium rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                            >
                              <FileImage className="w-4 h-4" /> View File
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-600 space-y-2">
                          <p><strong className="text-slate-800">Date & Time:</strong> {event.date.toLocaleString()}</p>
                          <p><strong className="text-slate-800">Specialization:</strong> {event.rawData.spec || 'General Practice'}</p>
                          {event.rawData.notes && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 italic">
                              "{event.rawData.notes}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewPrescription && (
        <PrescriptionPreview
          onClose={() => setPreviewPrescription(null)}
          patientName={previewPrescription.patientName || 'Patient'}
          doctorName={previewPrescription.doctorName || 'Doctor'}
          date={new Date(previewPrescription.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          medications={previewPrescription.medications || []}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Upload Medical Report</h2>
              <button onClick={() => setShowUploadModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Report Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Brain MRI, Annual Blood Test" 
                  value={uploadForm.title}
                  onChange={e => setUploadForm(p => ({...p, title: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Report Type</label>
                <select 
                  value={uploadForm.type}
                  onChange={e => setUploadForm(p => ({...p, type: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="other">Other Report</option>
                  <option value="xray">X-Ray</option>
                  <option value="mri">MRI Scan</option>
                  <option value="blood">Blood Test / Labs</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">File</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={uploadForm.isProtected} 
                    onChange={e => setUploadForm(p => ({...p, isProtected: e.target.checked}))}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1"><Lock className="w-4 h-4 text-slate-400" /> Password Protect (Optional)</span>
                </label>

                {uploadForm.isProtected && (
                  <div>
                    <input 
                      type="password" 
                      placeholder="Enter a secure password..." 
                      value={uploadForm.password}
                      onChange={e => setUploadForm(p => ({...p, password: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">You will need this password to view the file later.</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleUpload}
                disabled={uploading || !uploadFile || !uploadForm.title || (uploadForm.isProtected && !uploadForm.password)}
                className="w-full py-3 mt-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                {uploading ? 'Uploading...' : 'Upload Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Lock className="w-5 h-5 text-purple-600" /> Unlock Record</h2>
              <button onClick={() => setShowPasswordModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">This medical record is password protected. Please enter the password to view the file.</p>
            
            <input 
              type="password" 
              placeholder="Enter password..." 
              value={recordPassword}
              onChange={e => setRecordPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none mb-2"
            />
            {verifyError && <p className="text-sm text-red-500 mb-3 font-medium">{verifyError}</p>}
            
            <button 
              onClick={handleVerify}
              disabled={verifying || !recordPassword}
              className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock File'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
