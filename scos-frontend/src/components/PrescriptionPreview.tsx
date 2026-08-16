import { useState, useRef } from 'react';
import { X, Printer, Edit2, Upload, Image } from 'lucide-react';
import { uploadSignature } from '../lib/api';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionTemplate {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
}

interface Attachment {
  filename: string;
  url: string;
  type: string;
}

interface PrescriptionPreviewProps {
  onClose: () => void;
  onConfirm?: () => void;
  onSaveTemplate?: (template: PrescriptionTemplate) => void;
  onSignatureUploaded?: (url: string) => void;
  doctorName?: string;
  doctorSpecialization?: string;
  doctorRegNo?: string;
  doctorLocation?: string;
  signatureImage?: string;
  patientName?: string;
  date?: string;
  diagnosis?: string;
  notes?: string;
  medications?: Medication[];
  attachments?: Attachment[];
  isDoctorView?: boolean;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

const defaultMedications: Medication[] = [
  { name: 'Amoxicillin', dosage: '500mg', frequency: '1 pill twice daily', duration: '7 days' },
  { name: 'Ibuprofen', dosage: '200mg', frequency: 'As needed for pain', duration: '5 days' }
];

export default function PrescriptionPreview({ 
  onClose, 
  onConfirm,
  onSaveTemplate,
  onSignatureUploaded,
  doctorName = 'Dr. Wright',
  doctorSpecialization = 'General Practice',
  doctorRegNo = '',
  doctorLocation = '',
  signatureImage = '',
  patientName = 'Patient',
  date = new Date().toLocaleDateString(),
  diagnosis = '',
  notes = '',
  medications = defaultMedications,
  attachments = [],
  isDoctorView = false,
  clinicName = 'Smart Clinic OS',
  clinicAddress = '123 Health Ave, Medical District, NY 10001',
  clinicPhone = '(555) 123-4567',
}: PrescriptionPreviewProps) {

  const [editMode, setEditMode] = useState(false);
  const [editDiagnosis, setEditDiagnosis] = useState(diagnosis);
  const [editNotes, setEditNotes] = useState(notes);
  const [editMedications, setEditMedications] = useState<Medication[]>([...medications]);
  const [editClinicName, setEditClinicName] = useState(clinicName);
  const [editClinicAddress, setEditClinicAddress] = useState(clinicAddress);
  const [editClinicPhone, setEditClinicPhone] = useState(clinicPhone);
  const [currentSignature, setCurrentSignature] = useState(signatureImage);
  const [sigUploading, setSigUploading] = useState(false);

  const sigInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = () => window.print();

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...editMedications];
    updated[index] = { ...updated[index], [field]: value };
    setEditMedications(updated);
  };

  const addMedication = () => {
    setEditMedications([...editMedications, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedication = (index: number) => {
    setEditMedications(editMedications.filter((_, i) => i !== index));
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSigUploading(true);
    try {
      const res = await uploadSignature(file);
      setCurrentSignature(res.data.url);
      onSignatureUploaded?.(res.data.url);
    } catch (err) {
      console.error('Signature upload failed:', err);
    } finally {
      setSigUploading(false);
    }
  };

  const displayDiagnosis = editMode ? editDiagnosis : diagnosis;
  const displayNotes = editMode ? editNotes : notes;
  const displayMedications = editMode ? editMedications : medications;
  const displayClinicName = editMode ? editClinicName : clinicName;
  const displayClinicAddress = editMode ? editClinicAddress : clinicAddress;
  const displayClinicPhone = editMode ? editClinicPhone : clinicPhone;

  const regNo = doctorRegNo || `MED-${doctorName.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`;

  const handleConfirm = () => {
    if (onSaveTemplate && editMode) {
      const templateChanged =
        editClinicName !== clinicName ||
        editClinicAddress !== clinicAddress ||
        editClinicPhone !== clinicPhone;
      if (templateChanged) {
        onSaveTemplate({
          clinicName: editClinicName,
          clinicAddress: editClinicAddress,
          clinicPhone: editClinicPhone,
        });
      }
    }
    onConfirm?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:block">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-screen print:rounded-none overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <h2 className="text-lg font-bold text-slate-800">Prescription Preview</h2>
          <div className="flex items-center gap-2">
            {isDoctorView && (
              <button 
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  editMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                {editMode ? 'Editing' : 'Edit'}
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prescription Paper */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-12 bg-white print:p-8 print:overflow-visible">
          
          {/* Clinic Header */}
          <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
            {editMode ? (
              <div className="space-y-2">
                <input
                  value={editClinicName}
                  onChange={(e) => setEditClinicName(e.target.value)}
                  className="w-full text-center text-3xl font-black text-slate-900 tracking-tight uppercase bg-blue-50 border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Clinic / Hospital Name"
                />
                <div className="flex gap-2">
                  <input value={editClinicAddress} onChange={(e) => setEditClinicAddress(e.target.value)} className="flex-1 text-center text-sm text-slate-600 bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Address" />
                  <input value={editClinicPhone} onChange={(e) => setEditClinicPhone(e.target.value)} className="w-36 text-center text-sm text-slate-600 bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Phone" />
                </div>
                <p className="text-[10px] text-blue-500 font-medium">✏️ Header changes are saved for future prescriptions</p>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{displayClinicName}</h1>
                <p className="text-sm text-slate-600 mt-1">{displayClinicAddress} • {displayClinicPhone}</p>
              </>
            )}
          </div>

          {/* Doctor & Patient Info */}
          <div className="flex justify-between items-start mb-8 text-sm">
            <div>
              <p className="font-bold text-slate-800 text-base">{doctorName}</p>
              <p className="text-slate-600">{doctorSpecialization}</p>
              <p className="text-slate-600">Reg No: {regNo}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 mb-1">Date: <span className="font-medium text-slate-800">{date}</span></p>
              <p className="text-slate-500">Patient: <span className="font-bold text-slate-800 text-base">{patientName}</span></p>
            </div>
          </div>

          {/* Diagnosis */}
          {(displayDiagnosis || editMode) && (
            <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Diagnosis</p>
              {editMode ? (
                <input value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} className="w-full px-2 py-1 bg-white border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
              ) : (
                <p className="font-bold text-slate-800">{displayDiagnosis}</p>
              )}
            </div>
          )}

          {/* Rx */}
          <div className="mb-6">
            <span className="text-4xl font-serif font-bold text-slate-800 italic">Rx</span>
          </div>

          {/* Medications */}
          <div className="space-y-6 min-h-[150px]">
            {displayMedications.map((med, idx) => (
              <div key={idx} className={`pl-4 border-l-2 ${editMode ? 'border-blue-300' : 'border-slate-200'}`}>
                {editMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={editMedications[idx]?.name || ''} onChange={(e) => updateMedication(idx, 'name', e.target.value)} placeholder="Drug Name" className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
                      <input value={editMedications[idx]?.dosage || ''} onChange={(e) => updateMedication(idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-28 px-2 py-1 bg-white border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-500" />
                      {editMedications.length > 1 && (
                        <button onClick={() => removeMedication(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input value={editMedications[idx]?.frequency || ''} onChange={(e) => updateMedication(idx, 'frequency', e.target.value)} placeholder="Frequency" className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm italic text-slate-700" />
                      <input value={editMedications[idx]?.duration || ''} onChange={(e) => updateMedication(idx, 'duration', e.target.value)} placeholder="Duration" className="w-32 px-2 py-1 bg-white border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm italic text-slate-700" />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-slate-800 text-lg">{med.name} <span className="text-sm font-medium text-slate-500 ml-2">{med.dosage}</span></p>
                    <p className="text-slate-700 italic mt-1">{med.frequency} • For {med.duration}</p>
                  </>
                )}
              </div>
            ))}
            {editMode && (
              <button onClick={addMedication} className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm">+ Add Medication</button>
            )}
          </div>

          {/* Attachments (X-Ray, Lab, MRI) */}
          {attachments.length > 0 && (
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Attached Reports</p>
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={`http://localhost:5000${att.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{att.filename}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{att.type}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Signature */}
          <div className="mt-12 flex justify-between items-end">
            <div className="w-1/2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Doctor's Notes / Advice:</p>
              {editMode ? (
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full px-2 py-1 bg-white border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700 italic resize-none" placeholder="Add notes or advice for the patient..." />
              ) : (
                <p className="text-sm text-slate-700 italic border-t border-slate-200 pt-2 border-dashed">{displayNotes || 'No additional notes.'}</p>
              )}
            </div>
            
            <div className="text-center w-48">
              {/* Signature — image or fallback cursive */}
              {currentSignature ? (
                <div className="mb-1">
                  <img src={`http://localhost:5000${currentSignature}`} alt="Doctor Signature" className="max-h-16 mx-auto object-contain" />
                </div>
              ) : (
                <p className="font-['Brush_Script_MT',cursive] text-3xl text-blue-900 mb-1">{doctorName}</p>
              )}
              <div className="border-t border-slate-800 pt-1">
                <p className="text-xs font-bold text-slate-600 uppercase">Signature</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{doctorSpecialization}</p>
              </div>

              {/* Upload signature button (edit mode only) */}
              {editMode && isDoctorView && (
                <div className="mt-2">
                  <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                  <button
                    onClick={() => sigInputRef.current?.click()}
                    disabled={sigUploading}
                    className="flex items-center gap-1 mx-auto px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 disabled:opacity-50"
                  >
                    {sigUploading ? (
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {currentSignature ? 'Change Signature' : 'Upload Signature'}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-3 justify-end print:hidden">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
          {isDoctorView && onConfirm && (
            <button onClick={handleConfirm} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Confirm & Send to Patient
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
