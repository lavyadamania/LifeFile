import { useEffect, useState } from 'react';
import { Activity, Clock, Bell, Building2 } from 'lucide-react';
import useStreamingStore from '../../services/streaming';
import useAuthStore from '../../store/useAuthStore';

export default function LiveQueue() {
  const { isConnected, connect, disconnect, lastEvent, queueList, currentServingId } = useStreamingStore();
  const { user } = useAuthStore();
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const myPatientId = user?.id || '';

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Handle Kafka Events
  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.topic === 'scos.queue.updates') {
         setToast({ message: 'Queue advanced! Recalculating wait time...', type: 'info' });
         setTimeout(() => setToast(null), 3000);
      }
      if (lastEvent.topic === 'scos.prescriptions' && lastEvent.data?.patientId === myPatientId) {
        setToast({ message: '💊 Your prescription is ready for pickup!', type: 'success' });
         setTimeout(() => setToast(null), 5000);
      }
    }
  }, [lastEvent]);

  // Calculate my position
  const myIndex = queueList.findIndex(p => p.id === myPatientId);
  const myPosition = myIndex === -1 ? (currentServingId === myPatientId ? 0 : null) : myIndex + 1;
  const estimatedWaitTime = myPosition !== null && myPosition > 0 ? myPosition * 15 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Real-time Status Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className={`w-6 h-6 ${isConnected ? 'text-green-500' : 'text-slate-400'}`} />
            {isConnected && <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>}
          </div>
          <span className="font-semibold text-slate-700">
            {isConnected ? 'Connected to live stream' : 'Connecting to clinic servers...'}
          </span>
        </div>
        <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-md tracking-wider">
          scos.queue.updates
        </div>
      </div>

      {/* Main Queue Display */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-center p-12 relative">
        
        {/* Dynamic Toast for Kafka Events */}
        {toast && (
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white font-medium shadow-lg animate-fade-in-down flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
          }`}>
            <Bell className="w-5 h-5" />
            {toast.message}
          </div>
        )}

        <h2 className="text-xl font-bold text-slate-500 mb-6 uppercase tracking-widest">Your Live Status</h2>
        
        {myPosition === 0 ? (
           <div className="animate-pulse">
             <div className="w-48 h-48 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-green-50 shadow-inner">
               <span className="text-4xl font-extrabold">NOW</span>
             </div>
             <h1 className="text-3xl font-bold text-slate-800">Please proceed to Room 402</h1>
             <p className="text-slate-500 mt-2">Dr. Wright is ready to see you.</p>
           </div>
        ) : myPosition !== null ? (
          <div>
            <div className="w-48 h-48 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-white shadow-lg relative">
              <span className="text-7xl font-black">#{myPosition}</span>
            </div>
            
            <h1 className="text-4xl font-extrabold text-slate-800 mb-4">You are #{myPosition} in queue</h1>
            
            <div className="flex items-center justify-center gap-3 text-2xl font-medium text-slate-600 bg-slate-50 w-fit mx-auto px-6 py-3 rounded-2xl border border-slate-100">
              <Clock className="w-8 h-8 text-blue-500" />
              Est. Wait Time: <span className="text-blue-600 font-bold">~{estimatedWaitTime} mins</span>
            </div>
          </div>
        ) : (
          <div className="py-12">
             <h1 className="text-2xl font-bold text-slate-800">You are not in an active queue.</h1>
          </div>
        )}
      </div>

    </div>
  );
}
