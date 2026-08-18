import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, Clock, Users, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { getPatientETAStatus, API_BASE_URL } from '../../lib/api';

export default function PatientQueueStatus() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  const [etaData, setEtaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Fetch specific patient ETA from the secure API
  const fetchETA = async () => {
    try {
      if (!appointmentId) throw new Error('No appointment specified');

      const res = await getPatientETAStatus(appointmentId);
      setEtaData(res.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Unable to load queue status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchETA();

    // Setup Socket.io for Real-time Kafka Updates using the dynamic base URL
    const socket = io(API_BASE_URL, {
      transports: ['polling', 'websocket']
    });
    socket.on('connect', () => console.log('[Patient] Connected to queue socket'));
    
    // Listen to all queue updates
    socket.on('scos.queue.updates', (event) => {
      // If the queue updates, we need to recalculate our ACPA position and ETA!
      // This allows the queue to re-sort automatically without page refresh.
      if (['ADD_TO_QUEUE', 'CALL_NEXT', 'SKIP_PATIENT', 'CONSULTATION_COMPLETE'].includes(event?.data?.action)) {
        fetchETA();
      }
    });

    // 30-second silent polling fallback in case WebSocket disconnects on a bad hospital 4G connection
    const interval = setInterval(() => fetchETA(), 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-slate-500">
          <Activity className="w-8 h-8 animate-pulse text-indigo-600 mb-4" />
          <p className="font-bold">Loading your live queue status...</p>
        </div>
      </div>
    );
  }

  if (error || !etaData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-red-100">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Queue Unavailable</h2>
          <p className="text-slate-600">{error || 'Unable to track this appointment.'}</p>
          <button onClick={() => navigate('/patient/dashboard')} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl w-full">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  // Handle completed/cancelled states
  if (['Completed', 'Cancelled'].includes(etaData.status)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-green-100">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-black text-slate-900">Consultation {etaData.status}</h2>
          <p className="text-slate-600">Your appointment is no longer in the active queue.</p>
          <button onClick={() => navigate('/patient/dashboard')} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl w-full mt-4">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const { patientName, tokenNumber, nowServingToken, queuePosition, estimatedWait } = etaData;
  const isNext = queuePosition === 1;
  const isAlmostTurn = queuePosition === 2 || queuePosition === 3;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        
        {/* Real-time Indicator */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
           <span>Live ACPA Tracker</span>
           <span className="flex items-center gap-2">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             Updating live
           </span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header section */}
          <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             <h1 className="text-sm font-bold uppercase tracking-widest text-indigo-200 mb-1 relative z-10">Your Queue Status</h1>
             <h2 className="text-2xl font-black relative z-10">{patientName}</h2>
             <div className="inline-block bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold mt-3 relative z-10">
               TOKEN #{tokenNumber}
             </div>
          </div>

          <div className="p-6 space-y-8">
            
            {/* Almost-Your-Turn Flashing Alert */}
            {isNext && (
              <div className="bg-green-100 border-2 border-green-500 p-4 rounded-2xl text-center animate-pulse">
                 <h3 className="text-xl font-black text-green-700 uppercase tracking-widest">🔔 You're Next!</h3>
                 <p className="text-green-800 font-medium mt-1">Please proceed to the consultation room.</p>
              </div>
            )}
            {!isNext && isAlmostTurn && (
              <div className="bg-orange-50 border-2 border-orange-300 p-4 rounded-2xl text-center">
                 <h3 className="text-lg font-black text-orange-600 uppercase tracking-widest">Almost There</h3>
                 <p className="text-orange-700 font-medium mt-1">Don't go far, you are in the next batch.</p>
              </div>
            )}

            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                 <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Your Position</p>
                 <p className="text-4xl font-black text-indigo-600">#{queuePosition}</p>
                 <p className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-center gap-1">
                   <Users className="w-3 h-3" /> In Line
                 </p>
               </div>
               
               <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                 <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Estimated Wait</p>
                 <p className="text-3xl font-black text-slate-800">
                    {estimatedWait?.min}-{estimatedWait?.max}
                 </p>
                 <p className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-center gap-1">
                   <Clock className="w-3 h-3" /> Minutes
                 </p>
               </div>
            </div>

            {/* Now Serving / Zomato-style Roadmap */}
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Queue Progress</span>
                {nowServingToken && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                    Serving: #{nowServingToken}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 overflow-hidden text-sm font-bold text-slate-400 opacity-60">
                 {/* Visual dots to simulate the people ahead */}
                 {queuePosition > 4 && <span>...</span>}
                 {queuePosition > 3 && <><span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">?</span> <ArrowRight className="w-3 h-3 text-slate-300" /></>}
                 {queuePosition > 2 && <><span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">?</span> <ArrowRight className="w-3 h-3 text-slate-300" /></>}
                 {queuePosition > 1 && <><span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">?</span> <ArrowRight className="w-3 h-3 text-slate-300" /></>}
                 
                 {/* The Patient */}
                 <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                   YOU
                 </span>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-4 text-center">
                *Wait times are dynamically calculated using clinical urgency and aging.
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 font-medium">
             Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        
        <button onClick={() => navigate('/patient/dashboard')} className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-700">
           ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
