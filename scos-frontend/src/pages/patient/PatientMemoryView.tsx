import React, { useEffect, useState } from 'react';
import { Brain, AlertTriangle, ShieldCheck, FileText, Send, CheckCircle2, X } from 'lucide-react';
import { getPatientMemories, getMemorySources, submitMemoryCorrection } from '../../lib/api';

export default function PatientMemoryView() {
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<any>({});
  const [error, setError] = useState('');
  
  // Correction Modal
  const [correctionTarget, setCorrectionTarget] = useState<any | null>(null);
  const [patientNote, setPatientNote] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Source Modal
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Fetch current patient's memories
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const patientId = user?.id || user?._id;

  const fetchMemories = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await getPatientMemories(patientId);
      setMemories(res.data.memories || []);
      setGrouped(res.data.grouped || {});
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Unable to load health memories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [patientId]);

  const handleViewSources = async (memory: any) => {
    setSelectedMemory(memory);
    setSourcesLoading(true);
    try {
      const res = await getMemorySources(memory._id);
      setSources(res.data.sources || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSourcesLoading(false);
    }
  };

  const handleConfirmCorrection = async () => {
    if (!correctionTarget || !patientNote.trim()) return;
    try {
      await submitMemoryCorrection(correctionTarget._id, patientNote.trim());
      setSubmitSuccess('Correction request submitted for clinical review!');
      setCorrectionTarget(null);
      setPatientNote('');
      setTimeout(() => setSubmitSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit correction request');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <Brain className="w-10 h-10 animate-pulse text-indigo-600 mx-auto" />
        <p className="font-bold text-slate-600">Retrieving your longitudinal health memory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header Banner */}
      <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-widest">
            <Brain className="w-4 h-4" /> LifeFile Longitudinal Engine
          </div>
          <h1 className="text-2xl font-black">My Health Memory</h1>
          <p className="text-sm text-indigo-100 max-w-xl font-medium">
            Important medical context (allergies, chronic conditions, past medications) derived from your previous clinical consultations across hospitals.
          </p>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {submitSuccess}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* Memory Categories List */}
      <div className="space-y-6">
        {/* Allergies */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase text-red-500 tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Allergies ({grouped.ALLERGY?.length || 0})
          </h2>
          {(!grouped.ALLERGY || grouped.ALLERGY.length === 0) ? (
            <p className="text-xs text-slate-400 italic">No allergies recorded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped.ALLERGY.map((m: any) => (
                <div key={m._id} className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 text-sm">{m.content}</span>
                    <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                      {m.sourceRecordIds?.length || 1} sources
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleViewSources(m)} className="text-[11px] font-bold text-indigo-600 hover:underline">
                      View Sources
                    </button>
                    <span className="text-slate-300">•</span>
                    <button onClick={() => setCorrectionTarget(m)} className="text-[11px] font-bold text-slate-500 hover:text-slate-700">
                      Report Incorrect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chronic Conditions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase text-indigo-600 tracking-wider">
            Chronic Conditions ({grouped.CONDITION?.length || 0})
          </h2>
          {(!grouped.CONDITION || grouped.CONDITION.length === 0) ? (
            <p className="text-xs text-slate-400 italic">No chronic conditions recorded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped.CONDITION.map((m: any) => (
                <div key={m._id} className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 text-sm">{m.content}</span>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {m.sourceRecordIds?.length || 1} sources
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleViewSources(m)} className="text-[11px] font-bold text-indigo-600 hover:underline">
                      View Sources
                    </button>
                    <span className="text-slate-300">•</span>
                    <button onClick={() => setCorrectionTarget(m)} className="text-[11px] font-bold text-slate-500 hover:text-slate-700">
                      Report Incorrect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Medications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase text-slate-600 tracking-wider">
            Past Medications ({grouped.MEDICATION?.length || 0})
          </h2>
          {(!grouped.MEDICATION || grouped.MEDICATION.length === 0) ? (
            <p className="text-xs text-slate-400 italic">No medication history recorded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped.MEDICATION.map((m: any) => (
                <div key={m._id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-800 text-sm block">{m.content}</span>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleViewSources(m)} className="text-[11px] font-bold text-indigo-600 hover:underline">
                      View Sources
                    </button>
                    <span className="text-slate-300">•</span>
                    <button onClick={() => setCorrectionTarget(m)} className="text-[11px] font-bold text-slate-500 hover:text-slate-700">
                      Report Incorrect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Source Viewer Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 space-y-4 border border-slate-100">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {selectedMemory.category}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedMemory.content}</h3>
              </div>
              <button onClick={() => setSelectedMemory(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Source Consultations ({sources.length})</h4>
              {sourcesLoading ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold">Loading records...</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sources.map((src: any) => (
                    <div key={src._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{src.doctorName || 'Doctor Consultation'}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(src.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-indigo-600 font-medium">{src.hospitalName || 'Clinical Consultation'}</p>
                      {src.diagnosis && <p className="text-slate-600">Diagnosis: {src.diagnosis}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button onClick={() => setSelectedMemory(null)} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4 border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">Report Incorrect Information</h3>
            <p className="text-xs text-slate-600">
              Submit a correction request for <strong>"{correctionTarget.content}"</strong>. A doctor will review your notes before updating the medical record.
            </p>
            <textarea
              rows={3}
              value={patientNote}
              onChange={e => setPatientNote(e.target.value)}
              placeholder="e.g. I am no longer allergic to this medication after re-testing..."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setCorrectionTarget(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                Cancel
              </button>
              <button
                onClick={handleConfirmCorrection}
                disabled={!patientNote.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
