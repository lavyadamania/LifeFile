import { Users, UserPlus, Activity, ArrowRight, CheckCircle2, Building2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStreamingStore from '../../services/streaming';
import useDoctorStore from '../../store/useDoctorStore';
import useAuthStore from '../../store/useAuthStore';
import { getAppointments, addToQueue, getDoctors, skipPatient, completeConsultation, callNextPatient, cancelAppointment, getDoctorProfile } from '../../lib/api';
import { useState, useEffect } from 'react';

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { isConnected, connect, disconnect, callNext, fetchQueue, queueList, currentServingId, currentServingName, currentServingPatientId, events } = useStreamingStore();
  const { activeHospitalId } = useDoctorStore();
  const { user } = useAuthStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const handleCallNext = async () => {
    const docId = doctorProfileId || user?.id || 'DOC-1';
    
    // Auto-skip logic: if there is currently a patient in progress, skip them before calling next.
    if (currentServingId) {
      const patId = currentServingPatientId || currentServingId || '';
      try {
        await skipPatient({ doctorId: docId, patientId: patId, appointmentId: currentServingId });
        // The backend emits SKIP_PATIENT, but we still want to explicitly call next right after
      } catch (err) {
        console.error('Failed to auto-skip patient:', err);
      }
    }
    
    callNext(docId);
  };

  const [isStartingQueue, setIsStartingQueue] = useState(false);
  const [doctorProfileId, setDoctorProfileId] = useState<string>('');
  const [lastAlertedPatientId, setLastAlertedPatientId] = useState<string | null>(null);

  // Emergency Buzzer Logic
  useEffect(() => {
    const activeQueue = queueList.filter(p => !p.missedCalls || p.missedCalls === 0);
    if (activeQueue.length > 0) {
      const topPatient = activeQueue[0];
      if ((topPatient.triageLevel ?? 0) >= 4 && lastAlertedPatientId !== topPatient.id) {
        setLastAlertedPatientId(topPatient.id);
        try {
          // Public domain simple beep sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.log('Audio autoplay blocked by browser (user needs to interact with page first)', e));
        } catch (e) {
          console.log('Audio error:', e);
        }
      }
    }
  }, [queueList, lastAlertedPatientId]);

  useEffect(() => {
    getDoctorProfile().then(res => {
      if (res.data && res.data._id) {
        setDoctorProfileId(res.data._id);
      }
    }).catch(() => {});
  }, [user]);

  const handleStartQueue = async () => {
    setIsStartingQueue(true);
    try {
      const targetDoctorId = doctorProfileId || user?.id || 'DOC-1';
      await fetchQueue(targetDoctorId, activeHospitalId);
    } catch (err) {
      console.error('Failed to fetch authoritative queue:', err);
    }
    setIsStartingQueue(false);
  };

  useEffect(() => {
    if (doctorProfileId) {
      fetchQueue(doctorProfileId, activeHospitalId);
    }
  }, [activeHospitalId, doctorProfileId]);

  const handleStartConsultation = () => {
    if (currentServingId) {
      navigate(`/doctor/consultation/${currentServingId}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Kafka Stream Status — REAL */}
      <div className="flex items-center justify-between bg-slate-900 text-slate-300 p-4 rounded-xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-slate-500'}`} />
          <span className="font-medium text-sm">
            {isConnected ? 'Kafka Streaming: CONNECTED' : 'Connecting to Kafka...'}
          </span>
          {isConnected && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
           {/* BUG 10 FIX: Updated topic names */}
           <span className="px-2 py-1 bg-slate-800 rounded text-xs">lifefile.queue.updates</span>
           <span className="px-2 py-1 bg-slate-800 rounded text-xs">lifefile.appointments</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Active Consultation Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" /> Current Patient
              </h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">In Progress</span>
            </div>
            
            {currentServingId ? (
              <div className="p-8 text-center">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                   <span className="text-3xl font-bold">P</span>
                </div>
                 {/* BUG 8 FIX: Show patient name instead of raw MongoDB ID */}
                 <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{currentServingName || `Patient ${currentServingId?.slice(-6)}`}</h1>
                <p className="text-slate-500 mb-8">Active consultation</p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                   <button 
                    onClick={handleStartConsultation}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Start Consultation <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const docId = doctorProfileId || user?.id || 'DOC-1';
                      const patId = currentServingPatientId || currentServingId || '';
                      if (currentServingId) {
                        skipPatient({ doctorId: docId, patientId: patId, appointmentId: currentServingId })
                          .then(() => {
                            // Automatically call the next patient
                            handleCallNext();
                          })
                          .catch(console.error);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-100 text-orange-700 font-bold rounded-xl hover:bg-orange-200 transition-colors"
                  >
                    Skip / Pending
                  </button>
                  <button
                    onClick={() => {
                      const docId = doctorProfileId || user?.id || 'DOC-1';
                      const patId = currentServingPatientId || currentServingId || '';
                      if (currentServingId) {
                        completeConsultation({ doctorId: docId, patientId: patId, appointmentId: currentServingId })
                          .catch(console.error);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Complete Consult
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">
                <p>No active consultation.</p>
              </div>
            )}
          </div>

          {/* Live Event Log */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-indigo-50">
              <h3 className="font-bold text-indigo-900">DYNAMIC PRIORITY (DWPA)</h3>
            </div>
            <div className="p-4 text-sm text-slate-600 space-y-2">
              <p>Patient priority (CEP) shifts automatically with:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
                <li>Appointment slot position (Base Token)</li>
                <li>Waiting time (Aging prevents starvation)</li>
                <li>Clinical severity (Triage Level)</li>
                <li>Missed-call history (Skip Penalty)</li>
              </ul>
            </div>
          </div>

          {/* Active Queue List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
               <h2 className="text-sm font-bold text-blue-900">Waiting Queue</h2>
               <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                 {queueList.filter(p => !p.missedCalls || p.missedCalls === 0).length} Left
               </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {queueList.filter(p => !p.missedCalls || p.missedCalls === 0).map((patient, idx) => {
                const isEmergencyTop = idx === 0 && (patient.triageLevel ?? 0) >= 4;
                return (
                <div key={patient.id} className={`p-3 border rounded-xl shadow-sm flex flex-col gap-2 relative ${isEmergencyTop ? 'bg-red-50 border-red-500 animate-pulse ring-2 ring-red-500 ring-opacity-50' : 'bg-white border-slate-200'}`}>
                   {idx === 0 && (
                     <div className={`absolute top-0 right-0 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg ${isEmergencyTop ? 'bg-red-600' : 'bg-blue-600'}`}>
                       {isEmergencyTop ? 'EMERGENCY NEXT' : 'UP NEXT'}
                     </div>
                   )}
                   <div className="flex justify-between items-start">
                     <div>
                       <p className={`font-bold text-sm ${isEmergencyTop ? 'text-red-900' : 'text-slate-800'}`}>#{idx + 1} - {patient.name}</p>
                       <p className={`text-[10px] font-medium font-mono mt-0.5 ${isEmergencyTop ? 'text-red-700' : 'text-slate-500'}`}>Token: T{patient.baseToken?.toString().padStart(2, '0')}</p>
                     </div>
                     <div className="text-right">
                       <p className={`font-bold text-sm ${isEmergencyTop ? 'text-red-700' : 'text-indigo-700'}`}>CEP: {patient.priority?.score}</p>
                       <p className={`text-[9px] font-bold uppercase tracking-wider ${isEmergencyTop ? 'text-red-500' : 'text-slate-400'}`}>{patient.priority?.priorityLevel}</p>
                     </div>
                   </div>
                   
                   <div className={`grid grid-cols-2 gap-2 mt-1 pt-2 border-t text-[10px] ${isEmergencyTop ? 'border-red-200' : 'border-slate-100'}`}>
                     <div className={`p-1.5 rounded ${isEmergencyTop ? 'bg-red-100/50' : 'bg-slate-50'}`}>
                       <span className={`block uppercase font-bold text-[8px] ${isEmergencyTop ? 'text-red-500' : 'text-slate-400'}`}>Wait Time</span>
                       <span className={`font-bold ${isEmergencyTop ? 'text-red-800' : 'text-slate-700'}`}>{patient.priority?.waitMinutes}m</span>
                     </div>
                     <div className={`p-1.5 rounded ${isEmergencyTop ? 'bg-red-100/50' : 'bg-slate-50'}`}>
                       <span className={`block uppercase font-bold text-[8px] ${isEmergencyTop ? 'text-red-500' : 'text-slate-400'}`}>Triage</span>
                       <span className={`font-bold ${isEmergencyTop ? 'text-red-800' : 'text-slate-700'}`}>Lvl {patient.triageLevel}</span>
                     </div>
                   </div>
                   
                   <div className="mt-1 flex items-center justify-between">
                     <p className={`text-[10px] italic truncate max-w-[120px] ${isEmergencyTop ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{patient.priority?.reason}</p>
                     <button
                       onClick={() => {
                         const docId = doctorProfileId || user?.id || 'DOC-1';
                         const patId = patient.patientId || patient.id;
                         callNextPatient({ doctorId: docId, patientId: patId, appointmentId: patient.id })
                           .then(() => fetchQueue(docId, activeHospitalId))
                           .catch(console.error);
                       }}
                       className={`text-white text-[9px] px-2 py-1 rounded font-bold shadow-sm transition-colors ${isEmergencyTop ? 'bg-red-600 hover:bg-red-700 animate-bounce' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                     >
                       START
                     </button>
                   </div>
                </div>
              )})}
              {queueList.filter(p => !p.missedCalls || p.missedCalls === 0).length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">Queue is empty.</div>
              )}
            </div>
          </div>
          
          {/* Skipped Patients Column */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-red-100 flex justify-between items-center bg-red-50">
               <h2 className="text-sm font-bold text-red-900">Skipped</h2>
               <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                 {queueList.filter(p => p.missedCalls && p.missedCalls > 0).length} Total
               </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-red-50/30">
              {queueList.filter(p => p.missedCalls && p.missedCalls > 0).map((patient, idx) => (
                <div key={patient.id} className="p-3 border border-red-200 rounded-xl shadow-sm flex flex-col gap-2 relative bg-white">
                   <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                     SKIPPED {patient.missedCalls}x
                   </div>
                   <div className="flex justify-between items-start mt-2">
                     <div>
                       <p className="font-bold text-sm text-red-900">{patient.name}</p>
                       <p className="text-[10px] text-red-700 font-medium font-mono mt-0.5">Token: T{patient.baseToken?.toString().padStart(2, '0')}</p>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-red-100 text-[10px]">
                     <div className="bg-red-50 p-1.5 rounded">
                       <span className="text-red-400 block uppercase font-bold text-[8px]">Wait Time</span>
                       <span className="font-bold text-red-700">{patient.priority?.waitMinutes}m</span>
                     </div>
                     <div className="bg-red-50 p-1.5 rounded">
                       <span className="text-red-400 block uppercase font-bold text-[8px]">Triage</span>
                       <span className="font-bold text-red-700">Lvl {patient.triageLevel}</span>
                     </div>
                   </div>
                   
                   <div className="mt-1 flex items-center justify-between gap-2">
                     <button
                       onClick={() => {
                         const docId = doctorProfileId || user?.id || 'DOC-1';
                         cancelAppointment(patient.id)
                           .then(() => fetchQueue(docId, activeHospitalId))
                           .catch(console.error);
                       }}
                       className="flex-1 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-[9px] px-2 py-1.5 rounded font-bold transition-colors"
                     >
                       CANCEL
                     </button>
                     <button
                       onClick={() => {
                         const docId = doctorProfileId || user?.id || 'DOC-1';
                         const patId = patient.patientId || patient.id;
                         callNextPatient({ doctorId: docId, patientId: patId, appointmentId: patient.id })
                           .then(() => fetchQueue(docId, activeHospitalId))
                           .catch(console.error);
                       }}
                       className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[9px] px-2 py-1.5 rounded font-bold shadow-sm transition-colors"
                     >
                       CALL NOW
                     </button>
                   </div>
                </div>
              ))}
              {queueList.filter(p => p.missedCalls && p.missedCalls > 0).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No skipped patients.</div>
              )}
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="lg:col-span-4 mt-6">

          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-2xl shadow-sm space-y-3 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <button 
              onClick={handleStartQueue}
              disabled={isStartingQueue}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isStartingQueue ? 'Loading...' : 'Refresh Database Queue'}
            </button>
            <button 
              onClick={handleCallNext}
              disabled={queueList.length === 0 && !currentServingId}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <UserPlus className="w-5 h-5" />
              {currentServingId ? 'Skip & Call Next' : 'Call Next Patient'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
