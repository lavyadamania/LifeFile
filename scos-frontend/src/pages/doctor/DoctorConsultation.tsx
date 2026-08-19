import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeft, Activity, FileText, Plus, Trash2, Save, Lock, Search, UserPlus, X, Check, Paperclip, ChevronDown, ChevronUp, Pill, Image, Building2, Stethoscope, BrainCircuit } from 'lucide-react';
import nlp from 'compromise';
import ReactMarkdown from 'react-markdown';
import PrescriptionPreview from '../../components/PrescriptionPreview';
import DoctorMemoryPanel from '../../components/DoctorMemoryPanel';
import type { PrescriptionTemplate } from '../../components/PrescriptionPreview';
import { createPrescription, searchPatients, registerUser, createWalkinAppointment, getDoctors, updateDoctor, getPatientPrescriptions, uploadAttachment, getAppointments, updateAppointmentStatus, getPatientAISummary } from '../../lib/api';
import useAccessStore from '../../store/useAccessStore';
import useAuthStore from '../../store/useAuthStore';

interface MedicationForm {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface ConsultationForm {
  diagnosis: string;
  notes: string;
  medications: MedicationForm[];
}

interface PatientResult {
  _id: string;
  name: string;
  email: string;
}

export default function DoctorConsultation() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { checkAccess } = useAccessStore();
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<ConsultationForm | null>(null);

  // Doctor profile state (fetched from DB for this logged-in doctor)
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [nlpText, setNlpText] = useState('');

  // Patient search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Walk-in patient form
  const [showWalkinForm, setShowWalkinForm] = useState(false);
  const [walkinName, setWalkinName] = useState('');
  const [walkinEmail, setWalkinEmail] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinError, setWalkinError] = useState('');
  const [walkinTime, setWalkinTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));

  // Success state
  const [successMsg, setSuccessMsg] = useState('');

  // Patient history (fetched from DB)
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedRx, setExpandedRx] = useState<Set<string>>(new Set());

  // AI Summary
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Attachments for current prescription
  const [attachments, setAttachments] = useState<{filename: string; url: string; type: string}[]>([]);
  const [attUploading, setAttUploading] = useState(false);
  const attInputRef = useRef<HTMLInputElement>(null);

  // Hospital context from the active appointment
  const [appointmentHospitalId, setAppointmentHospitalId] = useState<string | null>(null);
  const [appointmentHospitalName, setAppointmentHospitalName] = useState('');

  const DOCTOR_ID = 'DOC-1';
  const isNewPrescription = patientId === 'new';
  const hasAccess = isNewPrescription || checkAccess(patientId || '', DOCTOR_ID);

  // Fetch logged-in doctor's profile from DB
  useEffect(() => {
    if (user?.name) {
      getDoctors().then(res => {
        const match = res.data.find((d: any) => d.name === user.name);
        if (match) setDoctorProfile(match);
      }).catch(() => {});
    }
  }, [user]);

  const { register, control, handleSubmit, reset, setValue } = useForm<ConsultationForm>({
    defaultValues: {
      diagnosis: '',
      notes: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }]
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "medications"
  });

  const handleNlpProcess = () => {
    if (!nlpText.trim()) return;
    
    // 1. Diagnosis extraction
    let extractedDiagnosis = '';
    const diagMatch = nlpText.match(/(?:presents with|diagnosed with|has|suffering from)\s+([a-zA-Z\s]+?)(?=\.|and|,)/i);
    if (diagMatch) {
      extractedDiagnosis = diagMatch[1].trim();
      setValue('diagnosis', extractedDiagnosis.charAt(0).toUpperCase() + extractedDiagnosis.slice(1));
    }

    // 2. Medication extraction
    const meds: MedicationForm[] = [];
    const sentences = nlp(nlpText).sentences().out('array') as string[];
    
    sentences.forEach(s => {
      const lower = s.toLowerCase();
      if (lower.includes('prescribe') || lower.includes('give') || lower.includes('take') || lower.includes('start') || lower.includes('put on')) {
        
        const dosageMatch = lower.match(/\b(\d+(?:\.\d+)?\s*(?:mg|ml|g|mcg|tablet|pill|drop|puff)s?)\b/i);
        const dosage = dosageMatch ? dosageMatch[1] : '';
        
        const durationMatch = lower.match(/\b(for\s+\d+\s*(?:day|week|month)s?)\b/i) || lower.match(/\b(\d+\s*(?:day|week|month)s?)\b/i);
        const duration = durationMatch ? durationMatch[1].replace('for ', '') : '';
        
        let freq = '';
        if (lower.includes('twice') || lower.includes('bid') || lower.includes('b.i.d')) freq = 'Twice daily';
        else if (lower.includes('thrice') || lower.includes('three times') || lower.includes('tid')) freq = 'Three times daily';
        else if (lower.includes('once') || lower.includes('daily') || lower.includes('od')) freq = 'Once daily';
        else if (lower.includes('four times')) freq = 'Four times daily';
        else if (lower.includes('as needed') || lower.includes('prn')) freq = 'As needed (PRN)';

        // Find drug name: look for capitalized words
        let drugName = '';
        const words = s.split(' ');
        for (let i = 0; i < words.length; i++) {
           const w = words[i].replace(/[^a-zA-Z]/g, '');
           if (w.length > 2 && w[0] === w[0].toUpperCase() && !['Prescribe', 'Give', 'Take', 'For', 'Start', 'Put', 'On'].includes(w)) {
             drugName = w;
             break;
           }
        }
        
        if (!drugName && dosageMatch) {
           // Get word before dosage as fallback
           const idx = s.indexOf(dosageMatch[0]);
           const beforeStr = s.substring(0, idx).trim();
           const beforeWords = beforeStr.split(' ');
           drugName = beforeWords[beforeWords.length - 1].replace(/[^a-zA-Z]/g, '');
        }

        if (drugName || dosage) {
          meds.push({ 
            name: drugName || 'Extracted Drug', 
            dosage, 
            frequency: freq, 
            duration 
          });
        }
      }
    });

    if (meds.length > 0) {
      replace(meds);
    }
    
    // 3. Put original text in notes
    setValue('notes', nlpText);
    setNlpText('');
  };

  // Debounced patient search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchPatients(searchQuery);
        setSearchResults(res.data);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    setShowDropdown(false);
    setShowWalkinForm(false);
    setSuccessMsg(`Selected patient: ${patient.name}`);
    setTimeout(() => setSuccessMsg(''), 3000);
    // Fetch real patient history
    setLoadingHistory(true);
    getPatientPrescriptions(patient._id)
      .then(res => setPatientHistory(res.data))
      .catch(() => setPatientHistory([]))
      .finally(() => setLoadingHistory(false));

    setLoadingAi(true);
    getPatientAISummary(patient._id)
      .then(res => setAiSummary(res.data.summary))
      .catch(() => setAiSummary('Failed to load AI summary.'))
      .finally(() => setLoadingAi(false));
  };

  // Auto-populate patient details if it's an active consultation from the queue
  useEffect(() => {
    if (patientId && patientId !== 'new' && !selectedPatient) {
      getAppointments().then(res => {
        const appt = res.data.find((a: any) => (a.patientId?._id || a.patientId) === patientId);
        if (appt && appt.patientId?._id) {
          handleSelectPatient({
            _id: appt.patientId._id,
            name: appt.patientId.name,
            email: appt.patientId.email || ''
          });
          // Capture hospital context from appointment
          if (appt.hospitalId) setAppointmentHospitalId(appt.hospitalId);
          if (appt.hospitalName) setAppointmentHospitalName(appt.hospitalName);
        }
      }).catch(console.error);
    }
  }, [patientId]);

  const toggleExpandRx = (id: string) => {
    setExpandedRx(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttUploading(true);
    try {
      const type = file.name.toLowerCase().includes('xray') ? 'xray' :
                   file.name.toLowerCase().includes('mri') ? 'mri' :
                   file.name.toLowerCase().includes('lab') ? 'lab' : 'other';
      const res = await uploadAttachment(file, type);
      setAttachments(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Attachment upload failed:', err);
    } finally {
      setAttUploading(false);
      if (attInputRef.current) attInputRef.current.value = '';
    }
  };

  const handleWalkinSubmit = async () => {
    if (!walkinName || !walkinEmail) {
      setWalkinError('Name and email are required.');
      return;
    }
    setWalkinSubmitting(true);
    setWalkinError('');
    try {
      // Register the walk-in patient
      const res = await registerUser({
        name: walkinName,
        email: walkinEmail,
        password: 'walkin123',  // Default password for walk-in
        role: 'patient',
      });
      const newPatient: PatientResult = {
        _id: res.data.user.id,
        name: res.data.user.name,
        email: res.data.user.email,
      };

      // Create a walk-in appointment for today
      try {
        await createWalkinAppointment({
          patientId: newPatient._id,
          doctorName: 'Doctor',
          date: new Date().toISOString().split('T')[0],
          time: (() => {
            if (walkinTime) {
              const [h, m] = walkinTime.split(':').map(Number);
              const ampm = h >= 12 ? 'PM' : 'AM';
              const hours12 = h % 12 || 12;
              return `${hours12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
            }
            return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          })(),
        });
      } catch {
        // Non-critical — appointment creation can fail silently
      }

      setSelectedPatient(newPatient);
      setSearchQuery(newPatient.name);
      setShowWalkinForm(false);
      setSuccessMsg(`Walk-in patient "${newPatient.name}" registered & appointment created!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setWalkinError(err?.response?.data?.error || 'Failed to register patient.');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  const onSubmit = (data: ConsultationForm) => {
    if (isNewPrescription && !selectedPatient) {
      setWalkinError('Please select or register a patient first.');
      setTimeout(() => setWalkinError(''), 3000);
      return;
    }
    setFormData(data);
    setShowPreview(true);
  };

  const confirmAndSend = async () => {
    try {
      const targetPatientId = selectedPatient?._id || patientId;
      const targetPatientName = selectedPatient?.name || `Patient ${patientId}`;
      const docName = doctorProfile ? `Dr. ${doctorProfile.name}` : (user?.name ? `Dr. ${user.name}` : 'Doctor');
      await createPrescription({
        patientId: targetPatientId,
        doctorId: doctorProfile?._id || 'DOC-1',
        patientName: targetPatientName,
        doctorName: docName,
        diagnosis: formData?.diagnosis || '',
        notes: formData?.notes || '',
        medications: formData?.medications || [],
        attachments,
        hospitalId: appointmentHospitalId || undefined,
        hospitalName: appointmentHospitalName || undefined,
      });

      // Auto-mark ALL of today's pending appointments for this patient as Completed
      // This handles: early arrivals, walk-ins, and scheduled appointments
      try {
        const today = new Date().toISOString().split('T')[0];
        const apptRes = await getAppointments();
        
        const matches = apptRes.data.filter((a: any) => {
          const aPatientId = (a.patientId?._id || a.patientId || '').toString();
          const targetId = (targetPatientId || '').toString();
          const patientMatch = aPatientId === targetId;
          const dateMatch = a.date === today || a.date === 'Today';
          const statusMatch = ['Confirmed', 'Pending'].includes(a.status);
          return patientMatch && dateMatch && statusMatch;
        });

        if (matches.length > 0) {
          // Complete all matching appointments (handles early walk-in + scheduled same day)
          await Promise.all(
            matches.map((m: any) => updateAppointmentStatus(m._id, { status: 'Completed' }))
          );
          console.log(`✅ ${matches.length} appointment(s) auto-marked as Completed for patient:`, targetPatientId);
        } else {
          console.log('⚠️ No active appointments found today for patient:', targetPatientId);
        }
      } catch (err) {
        console.error('❌ Error auto-completing appointment:', err);
      }
    } catch (err) {
      console.error('Failed to save prescription:', err);
    }
    setShowPreview(false);
    navigate('/doctor/queue');
  };

  // Save prescription template changes back to doctor profile
  const handleSaveTemplate = async (template: PrescriptionTemplate) => {
    if (!doctorProfile?._id) return;
    try {
      await updateDoctor(doctorProfile._id, {
        prescriptionTemplate: template,
      });
      // Update local state so next preview uses the new values
      setDoctorProfile((prev: any) => ({
        ...prev,
        prescriptionTemplate: template,
      }));
    } catch (err) {
      console.error('Failed to save prescription template:', err);
    }
  };

  const currentPatientName = selectedPatient?.name || (isNewPrescription ? 'New Patient' : `Patient ${patientId}`);
  const currentPatientEmail = selectedPatient?.email || '';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8">
      
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">
              {isNewPrescription ? 'New Prescription' : 'Active Consultation'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-slate-400">
                {selectedPatient ? selectedPatient.name : (isNewPrescription ? 'Search or add a patient' : `Patient ID: ${patientId}`)}
              </p>
              {appointmentHospitalName && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-xs text-white/90">
                    <Building2 className="w-3 h-3" />
                    {appointmentHospitalName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
           <span className="text-sm font-medium text-slate-300">Recording...</span>
        </div>
      </div>

      {/* Success / Error Banner */}
      {successMsg && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {walkinError && !showWalkinForm && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {walkinError}
        </div>
      )}

      {/* Split Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
        
        {/* Left Panel: Patient Context */}
        <div className="w-full md:w-1/3 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          
          {/* Patient Search (shown for new prescriptions) */}
          {isNewPrescription && (
            <div className="p-4 border-b border-slate-200 bg-gradient-to-b from-blue-50 to-white space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Find Patient</p>
              
              {/* Search Bar */}
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedPatient) setSelectedPatient(null);
                    }}
                    placeholder="Search by patient name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none text-sm transition-all shadow-sm"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Dropdown Results */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {searchResults.map((patient) => (
                      <button
                        key={patient._id}
                        onClick={() => handleSelectPatient(patient)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{patient.name}</p>
                          <p className="text-xs text-slate-500 truncate">{patient.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center">
                    <p className="text-sm text-slate-500">No patients found for "{searchQuery}"</p>
                  </div>
                )}
              </div>

              {/* Walk-in Button */}
              <button
                onClick={() => setShowWalkinForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Add Walk-in Patient
              </button>
            </div>
          )}

          {/* Walk-in Registration Form (modal overlay in left panel) */}
          {showWalkinForm && (
            <div className="p-4 border-b border-slate-200 bg-gradient-to-b from-purple-50 to-white space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">Register Walk-in Patient</p>
                <button onClick={() => { setShowWalkinForm(false); setWalkinError(''); }} className="p-1 hover:bg-slate-100 rounded-full">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <input
                type="text"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="Full Name *"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              />
              <input
                type="email"
                value={walkinEmail}
                onChange={(e) => setWalkinEmail(e.target.value)}
                placeholder="Email *"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              />
              <input
                type="tel"
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  min="09:00"
                  max="17:00"
                  value={walkinTime}
                  onChange={(e) => {
                    const timeStr = e.target.value;
                    if (timeStr) {
                      const [h] = timeStr.split(':').map(Number);
                      if (h >= 9 && h <= 17) {
                        setWalkinTime(timeStr);
                      } else {
                        alert('Please select a time between 09:00 AM and 05:00 PM');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
              </div>
              {walkinError && (
                <p className="text-xs text-red-600 font-medium">{walkinError}</p>
              )}
              <button
                onClick={handleWalkinSubmit}
                disabled={walkinSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {walkinSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Register & Create Appointment</>
                )}
              </button>
            </div>
          )}

          {/* Patient Info Card */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm ${
                selectedPatient ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
              }`}>
                 {selectedPatient ? selectedPatient.name.charAt(0).toUpperCase() : (patientId?.slice(-3) || 'NEW')}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{currentPatientName}</h2>
                {currentPatientEmail && (
                  <p className="text-sm text-slate-500">{currentPatientEmail}</p>
                )}
                {!currentPatientEmail && !isNewPrescription && (
                  <p className="text-sm text-slate-500">34 yrs • Female • O+</p>
                )}
                {selectedPatient && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                    <Check className="w-3 h-3" /> Selected
                  </span>
                )}
              </div>
            </div>
            
            {!isNewPrescription && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Heart Rate</p>
                  <p className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-500" /> 72 bpm
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Pressure</p>
                  <p className="text-lg font-bold text-slate-800">120/80</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            
            {/* AI Summary Widget */}
            {(!isNewPrescription || selectedPatient) && (
              <div className="mb-6 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-slate-800">AI Medical Summary</h3>
                </div>
                {loadingAi ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    Generating AI summary...
                  </div>
                ) : aiSummary ? (
                  <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:leading-relaxed prose-li:my-0.5">
                     <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No AI summary available.</p>
                )}
              </div>
            )}

            {/* LifeFile Patient Longitudinal Memory Layer */}
            {(selectedPatient?._id || (patientId && patientId !== 'new')) && (
              <div className="mb-6">
                <DoctorMemoryPanel patientId={selectedPatient?._id || patientId!} patientName={currentPatientName} />
              </div>
            )}

            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Patient History & Prescriptions
            </h3>
            
            {!selectedPatient && isNewPrescription ? (
              <div className="h-32 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center">
                <Search className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 font-medium">Select a patient to view their history</p>
              </div>
            ) : loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : patientHistory.length === 0 ? (
              <div className="h-32 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No past prescriptions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  patientHistory.reduce((acc: any, rx: any) => {
                    const key = rx.hospitalName || 'Individual Clinic';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(rx);
                    return acc;
                  }, {})
                ).map(([hospital, rxList]: [string, any]) => (
                  <div key={hospital} className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 pl-1">
                      {hospital === 'Individual Clinic' ? <Stethoscope className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      {hospital}
                    </h3>
                    {rxList.map((rx: any) => {
                      const isOpen = expandedRx.has(rx._id);
                      return (
                        <div key={rx._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleExpandRx(rx._id)}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0">
                                <Pill className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">
                                  {rx.diagnosis || 'Prescription'}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {new Date(rx.createdAt).toLocaleDateString()} • {rx.medications?.length || 0} med(s)
                                </p>
                              </div>
                            </div>
                            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-3 border-t border-slate-100 pt-2 space-y-2">
                              {rx.doctorName && (
                                <p className="text-xs text-slate-500">By: <span className="font-medium text-slate-700">{rx.doctorName}</span></p>
                              )}
                              {rx.notes && (
                                <p className="text-xs text-slate-600 italic bg-amber-50 p-2 rounded-lg border border-amber-100">"{rx.notes}"</p>
                              )}
                              {rx.medications?.map((med: any, i: number) => (
                                <div key={i} className="text-xs pl-3 border-l-2 border-blue-200">
                                  <span className="font-bold text-slate-800">{med.name}</span>
                                  <span className="text-slate-500 ml-1">{med.dosage}</span>
                                  <span className="text-slate-400 ml-1">• {med.frequency} • {med.duration}</span>
                                </div>
                              ))}
                              {rx.attachments?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {rx.attachments.map((att: any, i: number) => (
                                    <a key={i} href={`http://localhost:5000${att.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded hover:bg-blue-50 hover:text-blue-600">
                                      <Image className="w-3 h-3" /> {att.type.toUpperCase()}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="flex-1 flex flex-col bg-slate-50">
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col h-full overflow-hidden">
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Smart NLP Auto-Fill */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Smart NLP Auto-Fill</h3>
                </div>
                <textarea 
                  value={nlpText}
                  onChange={e => setNlpText(e.target.value)}
                  placeholder="Paste or type raw clinical notes here (e.g. 'Patient presents with acute bronchitis. Prescribe Amoxicillin 500mg twice daily for 7 days.')"
                  className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm shadow-inner"
                  rows={3}
                />
                <button 
                  type="button"
                  onClick={handleNlpProcess}
                  disabled={!nlpText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm transition-all shadow-md disabled:opacity-50"
                >
                  <BrainCircuit className="w-4 h-4" /> Extract & Auto-Fill
                </button>
              </div>

              {/* Diagnosis & Notes */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Primary Diagnosis / Chief Complaint</label>
                  <input
                    {...register('diagnosis')}
                    placeholder="e.g., Acute Bronchitis"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Doctor's Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Clinical observations and advice..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Medication Builder */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Medications (Rx)</h3>
                  <button 
                    type="button"
                    onClick={() => append({ name: '', dosage: '', frequency: '', duration: '' })}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Drug
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative group">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                           <input
                            {...register(`medications.${index}.name` as const)}
                            placeholder="Drug Name (e.g., Amoxicillin)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <input
                            {...register(`medications.${index}.dosage` as const)}
                            placeholder="Dosage (e.g., 500mg)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <input
                            {...register(`medications.${index}.frequency` as const)}
                            placeholder="Frequency (e.g., Twice daily)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                           <input
                            {...register(`medications.${index}.duration` as const)}
                            placeholder="Duration (e.g., 7 days)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                      
                      {fields.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => remove(index)}
                          className="absolute -top-3 -right-3 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Attach Reports (X-Ray, Lab, MRI) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-slate-400" /> Attach Reports
                  </h3>
                  <div>
                    <input ref={attInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleAttachmentUpload} />
                    <button
                      type="button"
                      onClick={() => attInputRef.current?.click()}
                      disabled={attUploading}
                      className="flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      {attUploading ? (
                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Upload File
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Upload X-Ray, Lab Reports, MRI scans, or other documents.</p>
                {attachments.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">No files attached yet</div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{att.filename}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{att.type}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
               <button 
                 type="button"
                 onClick={() => navigate('/doctor/queue')}
                 className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 type="submit"
                 className="flex items-center gap-2 px-8 py-2.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
               >
                 <Save className="w-5 h-5" />
                 Review & Save
               </button>
            </div>
          </form>
        </div>

      </div>

      {showPreview && formData && (
        <PrescriptionPreview 
          onClose={() => setShowPreview(false)}
          onConfirm={confirmAndSend}
          onSaveTemplate={handleSaveTemplate}
          onSignatureUploaded={(url) => setDoctorProfile((p: any) => ({ ...p, signatureImage: url }))}
          isDoctorView={true}
          doctorName={doctorProfile ? `Dr. ${doctorProfile.name}` : (user?.name ? `Dr. ${user.name}` : 'Doctor')}
          doctorSpecialization={doctorProfile?.specialization || 'General Practice'}
          doctorLocation={doctorProfile?.location || ''}
          signatureImage={doctorProfile?.signatureImage || ''}
          patientName={currentPatientName}
          diagnosis={formData.diagnosis}
          notes={formData.notes}
          medications={formData.medications.filter((m: MedicationForm) => m.name.trim() !== '')}
          attachments={attachments}
          clinicName={doctorProfile?.prescriptionTemplate?.clinicName || 'LifeFile'}
          clinicAddress={doctorProfile?.prescriptionTemplate?.clinicAddress || '123 Health Ave, Medical District, NY 10001'}
          clinicPhone={doctorProfile?.prescriptionTemplate?.clinicPhone || '(555) 123-4567'}
        />
      )}
    </div>
  );
}
