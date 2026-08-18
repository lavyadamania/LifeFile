import { Users, UserPlus, Activity, ArrowRight, CheckCircle2, Building2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStreamingStore from '../../services/streaming';
import useDoctorStore from '../../store/useDoctorStore';
import useAuthStore from '../../store/useAuthStore';
import { getAppointments, addToQueue, getDoctors, skipPatient, completeConsultation, callNextPatient, cancelAppointment } from '../../lib/api';
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

  const handleCallNext = () => {
    callNext(doctorProfileId || user?.id || 'DOC-1');
  };

  const [isStartingQueue, setIsStartingQueue] = useState(false);
  const [doctorProfileId, setDoctorProfileId] = useState<string>('');

  useEffect(() => {
    getDoctors().then(res => {
      const userId = user?.id || (user as any)?._id;
      const myProfile = res.data.find((d: any) => d.userId === userId || (typeof d.userId === 'object' && d.userId?._id === userId) || d.name === user?.name);
      if (myProfile) setDoctorProfileId(myProfile._id);
    }).catch(() => {});
  }, [user]);

  const handleStartQueue = async () => {
    setIsStartingQueue(true);
    try {
      const targetDoctorId = doctorProfileId || user?.id || 'DOC-1';
      await fetchQueue(targetDoctorId);
    } catch (err) {
      console.error('Failed to fetch authoritative queue:', err);
    }
    setIsStartingQueue(false);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
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

          {/* Postponed / Late Patients Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="p-4 border-b border-red-100 bg-red-50 flex justify-between items-center">
              <h3 className="font-bold text-red-900 flex items-center gap-2">
                 <AlertCircle className="w-5 h-5" /> Postponed & Late Patients
              </h3>
              <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                {queueList.filter(p => (p.missedCalls && p.missedCalls > 0) || (p.priority && p.priority.waitMinutes > 60)).length}
              </span>
            </div>
            <div className="p-4 max-h-48 overflow-y-auto">
              {queueList.filter(p => (p.missedCalls && p.missedCalls > 0) || (p.priority && p.priority.waitMinutes > 60)).length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No patients are currently delayed or postponed.</p>
              ) : (
                <div className="space-y-2">
                  {queueList.filter(p => (p.missedCalls && p.missedCalls > 0) || (p.priority && p.priority.waitMinutes > 60)).map((patient, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-3 bg-red-50/50 rounded-lg border border-red-100">
                      <div>
                        <p className="font-bold text-red-900">{patient.name}</p>
                        <p className="text-xs text-red-700">Token T{patient.baseToken?.toString().padStart(2, '0')}</p>
                      </div>
                      <div className="text-right">
                        {patient.missedCalls && patient.missedCalls > 0 ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded block mb-1 text-center">SKIPPED {patient.missedCalls}x</span>
                        ) : null}
                        {patient.priority && patient.priority.waitMinutes > 60 ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded block mb-2 text-center">LATE {patient.priority.waitMinutes}m</span>
                        ) : null}
                        
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                            onClick={() => {
                              const docId = doctorProfileId || user?.id || 'DOC-1';
                              const patId = patient.patientId || patient.id;
                              callNextPatient({ doctorId: docId, patientId: patId, appointmentId: patient.id })
                                .then(() => {
                                  fetchQueue(docId);
                                })
                                .catch(console.error);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded font-bold"
                          >
                            START
                          </button>
                          <button
                            onClick={() => {
                              const docId = doctorProfileId || user?.id || 'DOC-1';
                              cancelAppointment(patient.id)
                                .then(() => {
                                  fetchQueue(docId);
                                })
                                .catch(console.error);
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-700 text-[10px] px-2 py-1 rounded font-bold border border-red-200"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Queue List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h2 className="text-lg font-bold text-slate-800">Waiting Queue</h2>
             <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">{queueList.length} Left</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {queueList.map((patient, idx) => (
              <div key={patient.id} className={`p-4 border rounded-xl shadow-sm flex flex-col gap-2 relative overflow-hidden ${patient.missedCalls && patient.missedCalls > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                 {idx === 0 && (
                   <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">UP NEXT</div>
                 )}
                 {patient.missedCalls && patient.missedCalls > 0 && idx !== 0 ? (
                   <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">SKIPPED</div>
                 ) : null}
                 <div className="flex justify-between items-start">
                   <div>
                     <p className={`font-bold text-lg ${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-900' : 'text-slate-800'}`}>#{idx + 1} - {patient.name}</p>
                     <p className="text-xs text-slate-500 font-medium font-mono mt-1">Token: T{patient.baseToken?.toString().padStart(2, '0')}</p>
                   </div>
                   <div className="text-right">
                     <p className={`font-bold text-lg ${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-700' : 'text-indigo-700'}`}>CEP: {patient.priority?.score}</p>
                     <p className={`text-[10px] font-bold uppercase tracking-wider ${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{patient.priority?.priorityLevel}</p>
                   </div>
                 </div>
                 
                 <div className={`grid grid-cols-3 gap-2 mt-2 pt-2 border-t text-xs ${patient.missedCalls && patient.missedCalls > 0 ? 'border-orange-200' : 'border-slate-100'}`}>
                   <div className={`${patient.missedCalls && patient.missedCalls > 0 ? 'bg-orange-100/50' : 'bg-slate-50'} p-1.5 rounded`}>
                     <span className={`${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-500' : 'text-slate-400'} block text-[10px] uppercase font-bold`}>Wait Time</span>
                     <span className={`font-bold ${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-800' : 'text-slate-700'}`}>{patient.priority?.waitMinutes}m</span>
                   </div>
                   <div className={`${patient.missedCalls && patient.missedCalls > 0 ? 'bg-orange-100/50' : 'bg-slate-50'} p-1.5 rounded`}>
                     <span className={`${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-500' : 'text-slate-400'} block text-[10px] uppercase font-bold`}>Triage</span>
                     <span className={`font-bold ${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-800' : 'text-slate-700'}`}>Lvl {patient.triageLevel}</span>
                   </div>
                   <div className={`${patient.missedCalls && patient.missedCalls > 0 ? 'bg-orange-200' : 'bg-slate-50'} p-1.5 rounded`}>
                     <span className={`${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-700' : 'text-slate-400'} block text-[10px] uppercase font-bold`}>Missed</span>
                     <span className={`font-bold ${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-900' : 'text-slate-700'}`}>{patient.missedCalls}</span>
                   </div>
                 </div>
                 
                 <div className="mt-1 flex items-center justify-between">
                   <p className={`text-xs italic ${patient.missedCalls && patient.missedCalls > 0 ? 'text-orange-700 font-medium' : 'text-slate-500'}`}>{patient.priority?.reason}</p>
                   <div className="flex items-center gap-2">
                     {patient.hospitalName && (
                       <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                         <Building2 className="w-3 h-3" />{patient.hospitalName}
                       </span>
                     )}
                     <button
                       onClick={() => {
                         const docId = doctorProfileId || user?.id || 'DOC-1';
                         const patId = patient.patientId || patient.id;
                         callNextPatient({ doctorId: docId, patientId: patId, appointmentId: patient.id })
                           .then(() => fetchQueue(docId))
                           .catch(console.error);
                       }}
                       className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-sm transition-colors"
                     >
                       START NOW
                     </button>
                   </div>
                 </div>
              </div>
            ))}
            {queueList.length === 0 && (
              <div className="text-center py-8 text-slate-500">Queue is empty.</div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl space-y-3">
            <button 
              onClick={handleStartQueue}
              disabled={isStartingQueue}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isStartingQueue ? 'Loading...' : 'Load Today\'s Appointments'}
            </button>
            <button 
              onClick={handleCallNext}
              disabled={queueList.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <UserPlus className="w-5 h-5" />
              Call Next Patient
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
