import { Users, UserPlus, Activity, ArrowRight, CheckCircle2, Building2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStreamingStore from '../../services/streaming';
import useDoctorStore from '../../store/useDoctorStore';
import useAuthStore from '../../store/useAuthStore';
import { cancelAppointment, getDoctorProfile } from '../../lib/api';
import { useState, useEffect } from 'react';

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { isConnected, connect, disconnect, callNext, completeConsult, skipAppt, fetchQueue, queueList, nowServing } = useStreamingStore();
  const { activeHospitalId } = useDoctorStore();
  const { user } = useAuthStore();

  const [isStartingQueue, setIsStartingQueue] = useState(false);
  const [doctorProfileId, setDoctorProfileId] = useState<string>('');
  const [lastAlertedPatientId, setLastAlertedPatientId] = useState<string | null>(null);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    getDoctorProfile().then(res => {
      if (res.data && res.data._id) {
        setDoctorProfileId(res.data._id);
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (doctorProfileId) {
      fetchQueue(doctorProfileId, activeHospitalId);
    }
  }, [activeHospitalId, doctorProfileId]);

  // Emergency Buzzer Logic on top waiting patient
  useEffect(() => {
    const activeQueue = queueList.filter(p => !p.missedCalls || p.missedCalls === 0);
    if (activeQueue.length > 0) {
      const topPatient = activeQueue[0];
      if ((topPatient.triageLevel ?? 0) >= 4 && lastAlertedPatientId !== topPatient.id) {
        setLastAlertedPatientId(topPatient.id);
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.log('Audio autoplay blocked by browser', e));
        } catch (e) {
          console.log('Audio error:', e);
        }
      }
    }
  }, [queueList, lastAlertedPatientId]);

  const handleCallNextGlobal = async () => {
    const docId = doctorProfileId || user?.id || 'DOC-1';
    await callNext(docId, activeHospitalId);
  };

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

  const handleStartConsultation = () => {
    if (nowServing?.id) {
      navigate(`/doctor/consultation/${nowServing.id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Kafka Stream Status */}
      <div className="flex items-center justify-between bg-slate-900 text-slate-300 p-4 rounded-xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-slate-500'}`} />
          <span className="font-medium text-sm">
            {isConnected ? 'Kafka Real-Time Synchronization: CONNECTED' : 'Connecting to Kafka...'}
          </span>
          {isConnected && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
           <span className="px-2 py-1 bg-slate-800 rounded text-xs">scos.queue.updates</span>
           <span className="px-2 py-1 bg-slate-800 rounded text-xs">ACPA Authoritative</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 2 Columns: Active Consultation & DWPA Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* NOW SERVING Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" /> NOW SERVING
              </h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                {nowServing ? `Token #${nowServing.tokenNumber || nowServing.baseToken}` : 'Idle'}
              </span>
            </div>
            
            {nowServing ? (
              <div className="p-8 text-center">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                   <span className="text-3xl font-bold">P</span>
                </div>
                 <h1 className="text-3xl font-extrabold text-slate-800 mb-1">
                   {nowServing.name || nowServing.patientName}
                 </h1>
                 <p className="text-sm font-bold text-blue-600 mb-6 font-mono">
                   Permanent Token #{nowServing.tokenNumber || nowServing.baseToken}
                 </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                   <button 
                    onClick={handleStartConsultation}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm"
                  >
                    Start Consultation <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const docId = doctorProfileId || user?.id || 'DOC-1';
                      skipAppt(docId, nowServing.id);
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-100 text-orange-700 font-bold rounded-xl hover:bg-orange-200 transition-colors text-sm"
                  >
                    Skip / Pending
                  </button>
                  <button
                    onClick={() => {
                      const docId = doctorProfileId || user?.id || 'DOC-1';
                      completeConsult(docId, nowServing.id);
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Consult
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">
                <p className="font-medium text-slate-600">No patient currently in consultation.</p>
                <p className="text-xs text-slate-400 mt-1">Click "START" on any patient card below to begin consultation.</p>
              </div>
            )}
          </div>

          {/* ACPA Explanation Box */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-indigo-50">
              <h3 className="font-bold text-indigo-900">DYNAMIC PRIORITY (ACPA RULES)</h3>
            </div>
            <div className="p-4 text-sm text-slate-600 space-y-2">
              <p>Dynamic position updates based on clinical priority without changing permanent tokens:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700 text-xs">
                <li><strong>Token Number:</strong> Permanent token assigned at registration (Never changes).</li>
                <li><strong>Queue Position (#1, #2...):</strong> Calculated dynamically by ACPA.</li>
                <li><strong>Emergency Override:</strong> Triage 4/5 cases take priority over routine checkups.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Column 3: Active Waiting Queue List */}
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
              const displayToken = patient.tokenNumber || patient.baseToken;
              const displayPos = patient.queuePosition || (idx + 1);

              return (
              <div key={patient.id} className={`p-3 border rounded-xl shadow-sm flex flex-col gap-2 relative ${isEmergencyTop ? 'bg-red-50 border-red-500 animate-pulse ring-2 ring-red-500 ring-opacity-50' : 'bg-white border-slate-200'}`}>
                 {idx === 0 && (
                   <div className={`absolute top-0 right-0 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg ${isEmergencyTop ? 'bg-red-600' : 'bg-blue-600'}`}>
                     {isEmergencyTop ? 'EMERGENCY NEXT' : 'UP NEXT'}
                   </div>
                 )}
                 <div className="flex justify-between items-start">
                   <div>
                     <p className={`font-bold text-sm ${isEmergencyTop ? 'text-red-900' : 'text-slate-800'}`}>
                       #{displayPos} — {patient.name || patient.patientName}
                     </p>
                     <p className={`text-[11px] font-bold font-mono mt-0.5 ${isEmergencyTop ? 'text-red-700' : 'text-blue-600'}`}>
                       Token #{displayToken}
                     </p>
                   </div>
                   <div className="text-right">
                     <p className={`font-bold text-sm ${isEmergencyTop ? 'text-red-700' : 'text-indigo-700'}`}>
                       CEP: {patient.priority?.score}
                     </p>
                     <p className={`text-[9px] font-bold uppercase tracking-wider ${isEmergencyTop ? 'text-red-500' : 'text-slate-400'}`}>
                       {patient.priority?.priorityLevel}
                     </p>
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
                   <p className={`text-[10px] italic truncate max-w-[110px] ${isEmergencyTop ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                     {patient.priority?.reason}
                   </p>
                   <button
                     onClick={() => {
                       const docId = doctorProfileId || user?.id || 'DOC-1';
                       callNext(docId, activeHospitalId, '', patient.id, patient.patientId);
                     }}
                     className={`text-white text-[9px] px-3 py-1.5 rounded font-bold shadow-sm transition-colors ${isEmergencyTop ? 'bg-red-600 hover:bg-red-700 animate-bounce' : 'bg-indigo-600 hover:bg-indigo-700'}`}
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
        
        {/* Column 4: Skipped Patients Column */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 flex flex-col h-[500px]">
          <div className="p-4 border-b border-red-100 flex justify-between items-center bg-red-50">
             <h2 className="text-sm font-bold text-red-900">Skipped</h2>
             <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
               {queueList.filter(p => p.missedCalls && p.missedCalls > 0).length} Total
             </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-red-50/30">
            {queueList.filter(p => p.missedCalls && p.missedCalls > 0).map((patient) => {
              const displayToken = patient.tokenNumber || patient.baseToken;
              return (
              <div key={patient.id} className="p-3 border border-red-200 rounded-xl shadow-sm flex flex-col gap-2 relative bg-white">
                 <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                   SKIPPED {patient.missedCalls}x
                 </div>
                 <div className="flex justify-between items-start mt-2">
                   <div>
                     <p className="font-bold text-sm text-red-900">{patient.name || patient.patientName}</p>
                     <p className="text-[11px] text-red-700 font-bold font-mono mt-0.5">Token #{displayToken}</p>
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
                       callNext(docId, activeHospitalId, '', patient.id, patient.patientId);
                     }}
                     className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[9px] px-2 py-1.5 rounded font-bold shadow-sm transition-colors"
                   >
                     CALL NOW
                   </button>
                 </div>
              </div>
            )})}
            {queueList.filter(p => p.missedCalls && p.missedCalls > 0).length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No skipped patients.</div>
            )}
          </div>
        </div>
      </div>

      {/* Global Bottom Controls */}
      <div className="mt-6 p-4 border-t border-slate-100 bg-slate-50 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <button 
          onClick={handleStartQueue}
          disabled={isStartingQueue}
          className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isStartingQueue ? 'Loading...' : 'Refresh Authoritative Queue'}
        </button>
        <button 
          onClick={handleCallNextGlobal}
          disabled={queueList.length === 0 && !nowServing}
          className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          {nowServing ? 'Skip & Call Next' : 'Call Next Patient'}
        </button>
      </div>

    </div>
  );
}
