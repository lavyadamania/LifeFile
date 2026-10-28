import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, Bell, Building2, UserCheck, Calendar, ArrowRight, CheckCircle2, Sparkles, Users } from 'lucide-react';
import useStreamingStore from '../../services/streaming';
import useAuthStore from '../../store/useAuthStore';
import { getAppointments, getPatientETAStatus, addToQueue, updateAppointmentStatus, API_BASE_URL } from '../../lib/api';
import { io } from 'socket.io-client';

export default function LiveQueue() {
  const navigate = useNavigate();
  const { isConnected, connect, disconnect, lastEvent } = useStreamingStore();
  const { user } = useAuthStore();
  
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAppointment, setActiveAppointment] = useState<any | null>(null);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [etaData, setEtaData] = useState<any | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const myPatientId = user?.id || '';

  const syncAppointmentsAndQueue = useCallback(async () => {
    try {
      const res = await getAppointments();
      const allAppts: any[] = res.data || [];
      const todayStr = new Date().toISOString().split('T')[0];

      // Sort prioritizing In_Progress, then Pending, then Confirmed/Rescheduled for today
      const inProg = allAppts.find(a => a.status === 'In_Progress');
      const inQueuePending = allAppts.find(a => a.status === 'Pending' && (a.date === todayStr || !a.date));
      const confirmedToday = allAppts.find(a => ['Confirmed', 'Rescheduled'].includes(a.status) && a.date === todayStr);
      const anyUpcoming = allAppts.filter(a => ['Confirmed', 'Pending', 'Rescheduled', 'In_Progress'].includes(a.status));

      setUpcomingList(anyUpcoming);

      const target = inProg || inQueuePending || confirmedToday || anyUpcoming[0] || null;
      setActiveAppointment(target);

      if (target && ['Pending', 'In_Progress'].includes(target.status)) {
        const apptId = target._id || target.id;
        try {
          const etaRes = await getPatientETAStatus(apptId);
          setEtaData(etaRes.data);
        } catch (etaErr) {
          console.error('Failed to fetch patient ETA:', etaErr);
        }
      } else {
        setEtaData(null);
      }
    } catch (err) {
      console.error('Failed to sync patient appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    connect();
    syncAppointmentsAndQueue();

    // Socket.IO listener for real-time queue updates
    const socket = io(API_BASE_URL, { transports: ['polling', 'websocket'] });
    socket.on('scos.queue.updates', () => {
      syncAppointmentsAndQueue();
    });

    const interval = setInterval(syncAppointmentsAndQueue, 6000);

    return () => {
      disconnect();
      socket.disconnect();
      clearInterval(interval);
    };
  }, [connect, disconnect, syncAppointmentsAndQueue]);

  // Handle Kafka notification banners
  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.topic === 'scos.queue.updates') {
        setToast({ message: 'Queue updated! Real-time wait recalculated.', type: 'info' });
        setTimeout(() => setToast(null), 3000);
      }
      if (lastEvent.topic === 'scos.prescriptions' && lastEvent.data?.patientId === myPatientId) {
        setToast({ message: '💊 Your prescription is ready for pickup!', type: 'success' });
        setTimeout(() => setToast(null), 5000);
      }
    }
  }, [lastEvent, myPatientId]);

  const handleJoinQueue = async (apt: any) => {
    setIsCheckingIn(true);
    try {
      await addToQueue({
        patientId: apt.patientId?._id || apt.patientId || myPatientId,
        patientName: apt.patientName || user?.name,
        doctorId: apt.doctorId?._id || apt.doctorId,
        hospitalId: apt.hospitalId,
        hospitalName: apt.hospitalName
      });
      await updateAppointmentStatus(apt._id || apt.id, { status: 'Pending' });
      await syncAppointmentsAndQueue();
      navigate(`/patient/queue-status/${apt._id || apt.id}`);
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to join queue. Please try again.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const isInQueue = activeAppointment && ['Pending', 'In_Progress'].includes(activeAppointment.status);
  const isConfirmedWaitingCheckIn = activeAppointment && ['Confirmed', 'Rescheduled'].includes(activeAppointment.status);
  const isNowServing = etaData?.status === 'In_Progress' || etaData?.queuePosition === 0;
  const isNext = etaData?.queuePosition === 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Real-time Status Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className={`w-6 h-6 ${isConnected ? 'text-green-500' : 'text-slate-400'}`} />
            {isConnected && <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>}
          </div>
          <div>
            <span className="font-bold text-slate-800 text-sm">
              {isConnected ? 'Live ACPA Streaming Active' : 'Connecting to Hospital Stream...'}
            </span>
            <p className="text-xs text-slate-500">Real-time dynamic priority queue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            scos.queue.updates
          </span>
        </div>
      </div>

      {/* Dynamic Toast for Kafka Events */}
      {toast && (
        <div className={`p-4 rounded-2xl text-white font-medium shadow-lg flex items-center justify-between gap-3 ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Activity className="w-8 h-8 animate-pulse text-blue-600 mx-auto" />
          <p className="font-bold text-slate-600">Checking your live queue position...</p>
        </div>
      ) : isInQueue ? (
        /* Active In-Queue View */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-center p-8 md:p-12 relative">
          
          {/* Header section with Doctor / Clinic info */}
          <div className="mb-6 pb-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {activeAppointment.status === 'In_Progress' ? 'Consultation Active' : 'Checked In To Queue'}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Dr. {activeAppointment.doctorName || 'Assigned Specialist'}
              </h2>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                {activeAppointment.hospitalName || activeAppointment.location || 'LifeFile Healthcare'}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Token</span>
              <div className="text-2xl font-black text-indigo-600">
                #{etaData?.tokenNumber ?? activeAppointment.baseToken ?? '—'}
              </div>
            </div>
          </div>

          {/* Consultation Calling Status */}
          {isNowServing ? (
            <div className="animate-pulse space-y-4 my-6">
              <div className="w-40 h-40 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-8 border-emerald-50 shadow-inner">
                <span className="text-3xl font-black">NOW</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900">Please Proceed to Consultation Room!</h1>
              <p className="text-slate-600 font-medium">Dr. {activeAppointment.doctorName || 'Doctor'} is ready to see you now.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {isNext && (
                <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl text-emerald-800 font-bold animate-pulse text-sm">
                  🔔 You're Next in Line! Please wait near the consultation room.
                </div>
              )}

              <div className="w-44 h-44 bg-blue-50 text-blue-600 rounded-full flex flex-col items-center justify-center mx-auto border-8 border-white shadow-xl relative">
                <span className="text-5xl font-black">#{etaData?.queuePosition ?? 1}</span>
                <span className="text-xs uppercase font-bold text-slate-400 mt-1">In Queue</span>
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800">
                  {isNext ? 'You are next in queue' : `You are #${etaData?.queuePosition ?? 1} in queue`}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Dynamic priority recalculated live using CEP scoring
                </p>
              </div>

              {/* Wait Metrics Card */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estimated Wait</p>
                  <p className="text-2xl font-black text-slate-800 flex items-center justify-center gap-1.5">
                    <Clock className="w-5 h-5 text-blue-500" />
                    {etaData?.estimatedWait ? `${etaData.estimatedWait.min}-${etaData.estimatedWait.max}` : '~10-15'}m
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Now Serving</p>
                  <p className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-500" />
                    #{etaData?.nowServingToken || activeAppointment.baseToken || '—'}
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate(`/patient/queue-status/${activeAppointment._id || activeAppointment.id}`)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Open Full Live ACPA Tracker <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/patient/appointments')}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  View All Appointments
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isConfirmedWaitingCheckIn ? (
        /* Confirmed Appointment Today - Ready to Check In */
        <div className="bg-white rounded-3xl shadow-sm border border-blue-100 p-8 md:p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Appointment Today
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">
              Consultation with Dr. {activeAppointment.doctorName || 'Specialist'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Scheduled for today at {activeAppointment.time || 'your booked slot'} • {activeAppointment.hospitalName || activeAppointment.location || 'LifeFile Clinic'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl max-w-md mx-auto text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Your Base Token</span>
              <span className="font-bold text-slate-900">#{activeAppointment.baseToken || 1}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Status</span>
              <span className="font-bold text-blue-600">Ready to Check-in</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <button
              onClick={() => handleJoinQueue(activeAppointment)}
              disabled={isCheckingIn}
              className="flex-1 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <UserCheck className="w-5 h-5" />
              {isCheckingIn ? 'Checking In...' : 'Check In & Enter Live Queue'}
            </button>
            <button
              onClick={() => navigate('/patient/appointments')}
              className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
            >
              Manage
            </button>
          </div>
        </div>
      ) : (
        /* Empty State — No Active Queue */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">You are not in an active queue.</h1>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
              You do not have any appointments in the waiting room right now. Check in to an upcoming appointment or book a new doctor consultation.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/patient/appointments')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-200 transition-all text-sm flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" /> View My Appointments
            </button>
            <button
              onClick={() => navigate('/patient/search')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm"
            >
              Book a Specialist
            </button>
          </div>

          {upcomingList.length > 0 && (
            <div className="pt-8 border-t border-slate-100 text-left max-w-lg mx-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Upcoming Scheduled Appointments ({upcomingList.length})
              </h3>
              <div className="space-y-2">
                {upcomingList.slice(0, 3).map((apt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Dr. {apt.doctorName || 'Doctor'}</p>
                      <p className="text-xs text-slate-500">{apt.date} at {apt.time || 'TBD'} • {apt.hospitalName || 'Clinic'}</p>
                    </div>
                    <button
                      onClick={() => navigate('/patient/appointments')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
