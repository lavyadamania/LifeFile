import { Users, UserPlus, Activity, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStreamingStore from '../../services/streaming';
import useDoctorStore from '../../store/useDoctorStore';
import useAuthStore from '../../store/useAuthStore';
import { getAppointments, addToQueue, getDoctors } from '../../lib/api';
import { useState, useEffect } from 'react';

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { isConnected, connect, disconnect, callNext, queueList, currentServingId, currentServingName, events } = useStreamingStore();
  const { activeHospitalId } = useDoctorStore();
  const { user } = useAuthStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const handleCallNext = () => {
    // BUG 3 FIX: Use real doctor profile ID, not hardcoded 'DOC-1'
    callNext(doctorProfileId || user?.id || 'DOC-1');
  };

  const [isStartingQueue, setIsStartingQueue] = useState(false);
  const [doctorProfileId, setDoctorProfileId] = useState<string>('');

  // BUG 3 FIX: Load the real doctor profile ID on mount
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
      const res = await getAppointments({ hospitalId: activeHospitalId });
      const today = new Date();
      const year = today.getFullYear();
      const monthStr = String(today.getMonth() + 1).padStart(2, '0');
      const dateStr = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${monthStr}-${dateStr}`;

      // BUG 2 FIX: Load both Confirmed AND Pending appointments
      const todaysAppts = res.data.filter((appt: any) =>
        appt.date === todayStr && ['Confirmed', 'Pending'].includes(appt.status)
      );
      
      for (const appt of todaysAppts) {
        // BUG 9 FIX: Guard against unpopulated patientId
        const pid = appt.patientId?._id || appt.patientId;
        const pname = appt.patientId?.name || appt.patientName || 'Unknown Patient';
        if (!pid) continue;
        if (!queueList.find(p => p.id === pid)) {
          await addToQueue({ patientId: pid, patientName: pname, doctorId: appt.doctorId, hospitalId: appt.hospitalId || undefined, hospitalName: appt.hospitalName || undefined });
        }
      }
    } catch (err) {
      console.error('Failed to start queue:', err);
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
                  {/* BUG 6 FIX: Complete Consult button now has onClick */}
                  <button
                    onClick={() => {
                      const token = JSON.parse(localStorage.getItem('scos-auth-storage') || '{}')?.state?.token;
                      fetch('http://localhost:5000/api/queue/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ doctorId: doctorProfileId || user?.id, patientId: currentServingId }),
                      }).catch(console.error);
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
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Live Kafka Events</h3>
            </div>
            <div className="p-4 max-h-48 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Waiting for events...</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 10).map((evt, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">{evt.topic.split('.').pop()}</span>
                      <span className="text-slate-700 font-medium">{evt.data?.action}</span>
                      <span className="text-slate-400 text-xs ml-auto">{new Date(evt.timestamp).toLocaleTimeString()}</span>
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
              <div key={patient.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between">
                 <div>
                   <p className="font-bold text-slate-800">#{idx + 1} - {patient.name}</p>
                   <div className="flex items-center gap-2 mt-0.5">
                     <p className="text-xs text-slate-500">ID: {patient.id}</p>
                     {patient.hospitalName && (
                       <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                         <Building2 className="w-3 h-3" />{patient.hospitalName}
                       </span>
                     )}
                   </div>
                 </div>
                 {idx === 0 && (
                   <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                     UP NEXT
                   </span>
                 )}
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
