import React, { useEffect, useState } from 'react';
import { Brain, AlertTriangle, ShieldAlert, FileText, CheckCircle, ExternalLink, RefreshCw, X } from 'lucide-react';
import { getPatientMemories, getMemorySources, extractPatientMemories, reviewPatientMemory } from '../lib/api';

interface DoctorMemoryPanelProps {
  patientId: string;
  patientName?: string;
}

export default function DoctorMemoryPanel({ patientId, patientName }: DoctorMemoryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<any>({});
  const [error, setError] = useState('');
  
  // Source Modal state
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

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
      setError(err.response?.data?.error || 'Unable to load patient memories');
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

  const handleResolveConflict = async (memoryId: string, newStatus: string) => {
    try {
      await reviewPatientMemory(memoryId, { status: newStatus, confidence: 'VERIFIED' });
      fetchMemories();
      if (selectedMemory) setSelectedMemory(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerExtract = async () => {
    setLoading(true);
    try {
      await extractPatientMemories(patientId);
      fetchMemories();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
          <Brain className="w-5 h-5 animate-pulse" />
          <span>Analyzing Patient Health Memory...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 font-medium">
        ⚠️ {error}
      </div>
    );
  }

  const conflicts = memories.filter(m => m.status === 'CONFLICTED');
  const allergies = grouped.ALLERGY || [];
  const conditions = grouped.CONDITION || [];
  const medications = grouped.MEDICATION || [];
  const procedures = grouped.PROCEDURE || [];
  const preferences = grouped.PREFERENCE || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Brain className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Patient Health Memory</h3>
            <p className="text-[10px] text-slate-400 font-medium">Longitudinal context derived from prior records</p>
          </div>
        </div>
        <button
          onClick={handleTriggerExtract}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors"
          title="Re-extract memory candidates"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ⚠️ Critical Conflicts Banner */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>Conflicting Medical Information ({conflicts.length})</span>
          </div>
          <div className="space-y-1.5">
            {conflicts.map(c => (
              <div key={c._id} className="bg-white/80 rounded-lg p-2.5 border border-red-100 text-xs flex justify-between items-center gap-2">
                <div>
                  <p className="font-bold text-slate-800">{c.content}</p>
                  <p className="text-[10px] text-red-600 italic">{c.conflictNotes || 'Opposing medical assertions found in prior records.'}</p>
                </div>
                <button
                  onClick={() => handleViewSources(c)}
                  className="px-2.5 py-1 bg-red-600 text-white font-bold rounded-lg text-[10px] hover:bg-red-700 shrink-0"
                >
                  Review Conflict
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="space-y-3">
        {/* Allergies */}
        {allergies.length > 0 && (
          <div>
            <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Allergies</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {allergies.map((m: any) => (
                <button
                  key={m._id}
                  onClick={() => handleViewSources(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-800 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  {m.content}
                  <span className="bg-red-200 text-red-900 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                    {m.sourceRecordIds?.length || 1} src
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chronic Conditions */}
        {conditions.length > 0 && (
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Conditions & Diagnosis History</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {conditions.map((m: any) => (
                <button
                  key={m._id}
                  onClick={() => handleViewSources(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 transition-colors"
                >
                  {m.content}
                  <span className="bg-indigo-200 text-indigo-900 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                    {m.sourceRecordIds?.length || 1} src
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {medications.length > 0 && (
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Past Medications</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {medications.map((m: any) => (
                <button
                  key={m._id}
                  onClick={() => handleViewSources(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors"
                >
                  {m.content}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        {preferences.length > 0 && (
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Patient Preferences</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {preferences.map((m: any) => (
                <span key={m._id} className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
                  {m.content}
                </span>
              ))}
            </div>
          </div>
        )}

        {memories.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">
            No health memories extracted yet. Records will automatically generate candidate context.
          </p>
        )}
      </div>

      {/* Source Viewer Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 space-y-4 border border-slate-100">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {selectedMemory.category} • {selectedMemory.type}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedMemory.content}</h3>
              </div>
              <button onClick={() => setSelectedMemory(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Verified Source Medical Records ({sources.length})</h4>
              
              {sourcesLoading ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold">Loading original sources...</div>
              ) : sources.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No source record attachments found.</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {sources.map((src: any) => (
                    <div key={src._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{src.doctorName || 'Attending Physician'}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(src.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-indigo-600 font-medium">{src.hospitalName || 'Clinical Consultation'}</p>
                      {src.diagnosis && <p className="text-slate-600 font-medium">Diagnosis: {src.diagnosis}</p>}
                      {src.notes && <p className="text-slate-500 italic text-[11px]">"{src.notes}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resolve Conflict Controls for Doctors */}
            {selectedMemory.status === 'CONFLICTED' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-amber-800">Doctor Clinical Resolution</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolveConflict(selectedMemory._id, 'ACTIVE')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Confirm Active Fact
                  </button>
                  <button
                    onClick={() => handleResolveConflict(selectedMemory._id, 'SUPERSEDED')}
                    className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    Mark Superseded
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <button onClick={() => setSelectedMemory(null)} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
