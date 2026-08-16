import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, CalendarDays, AlertTriangle, ArrowRightLeft, XCircle, Building2 } from 'lucide-react';
import { getAppointments, cancelAppointment, rescheduleAppointment, getMissedAppointments, updateAppointmentStatus } from '../../lib/api';

export default function PatientAppointments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'missed' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);

  // Cancel / Reschedule modals
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<any | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Postpone modal (for missed)
  const [postponeTarget, setPostponeTarget] = useState<any | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');

  const fetchAppointments = () => {
    getAppointments().then(res => {
      const all = res.data;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const nowMins = today.getHours() * 60 + today.getMinutes();

      setUpcoming(all.filter((a: any) => ['Confirmed', 'Pending', 'Rescheduled'].includes(a.status)));
      setPast(all.filter((a: any) => ['Completed', 'Cancelled', 'Missed', 'Postponed'].includes(a.status)));
    }).catch(() => {});

    getMissedAppointments().then(res => {
      setMissed(res.data);
    }).catch(() => setMissed([]));
  };

  useEffect(() => { fetchAppointments(); }, []);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    await cancelAppointment(cancelTarget._id);
    setCancelTarget(null);
    setSuccessMsg('Appointment cancelled successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
    fetchAppointments();
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !newDate || !newTime) return;
    await rescheduleAppointment(rescheduleTarget._id, { date: newDate, time: newTime, status: 'Rescheduled' });
    setRescheduleTarget(null);
    setNewDate('');
    setNewTime('');
    setSuccessMsg('Appointment rescheduled successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
    fetchAppointments();
  };

  const handlePostpone = async () => {
    if (!postponeTarget || !postponeDate || !postponeTime) return;
    try {
      await updateAppointmentStatus(postponeTarget._id, {
        status: 'Postponed',
        postponedDate: postponeDate,
        postponedTime: postponeTime,
      });
      setPostponeTarget(null);
      setPostponeDate('');
      setPostponeTime('');
      setSuccessMsg('Appointment postponed to new date!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAppointments();
    } catch {
      setSuccessMsg('Failed to postpone appointment.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleExpire = async (id: string) => {
    try {
      await updateAppointmentStatus(id, { status: 'Missed' });
      setSuccessMsg('Appointment marked as expired.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAppointments();
    } catch {
      setSuccessMsg('Failed to expire appointment.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const list = tab === 'upcoming' ? upcoming : tab === 'missed' ? missed : past;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">My Appointments</h1>
        <button onClick={() => navigate('/patient/search')} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm">Book New</button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">{successMsg}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        {(['upcoming', 'missed', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm capitalize transition-colors relative ${
              tab === t
                ? (t === 'missed' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white')
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t}
            {t === 'missed' && missed.length > 0 && tab !== 'missed' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {missed.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Missed info banner */}
      {tab === 'missed' && missed.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            These appointments have passed without being attended. You can <strong>postpone</strong> to a new date or <strong>let them expire</strong>.
          </p>
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg">No {tab} appointments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((apt: any) => (
            <div key={apt._id} className={`bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition-shadow ${
              tab === 'missed' ? 'border-amber-200' : 'border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{apt.doctorName}</h3>
                  <p className="text-blue-600 font-medium text-sm">{apt.spec}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                    {/* BUG 12 FIX: Format date nicely */}
                   <span className="flex items-center gap-1">
                     <CalendarDays className="w-4 h-4 text-slate-400" />
                     {apt.date ? new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                   </span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-400" /> {apt.time}</span>
                    {apt.hospitalName && (
                      <span className="flex items-center gap-1 text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        <Building2 className="w-3.5 h-3.5" /> {apt.hospitalName}
                      </span>
                    )}
                    {!apt.hospitalName && <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" /> {apt.location}</span>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  {apt.isWalkin && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">WALK-IN</span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    apt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
                    apt.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                    apt.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                    apt.status === 'Rescheduled' ? 'bg-blue-50 text-blue-700' :
                    apt.status === 'Missed' ? 'bg-red-50 text-red-700' :
                    apt.status === 'Postponed' ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-50 text-slate-700'
                  }`}>{apt.status}</span>
                </div>
              </div>

              {/* BUG 7 FIX: Warn if today's appointment time has already passed */}
              {tab === 'upcoming' && apt.date === new Date().toISOString().split('T')[0] && (() => {
                const [time, meridian] = (apt.time || '').split(' ');
                const [h, m] = (time || '00:00').split(':').map(Number);
                let totalMins = h * 60 + (m || 0);
                if (meridian === 'PM' && h !== 12) totalMins += 720;
                if (meridian === 'AM' && h === 12) totalMins -= 720;
                const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                return totalMins < nowMins ? (
                  <div className="mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                    ⚠️ This appointment time has passed. Consider cancelling or rescheduling.
                  </div>
                ) : null;
              })()}

              {/* Actions for upcoming */}
              {tab === 'upcoming' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button onClick={() => setRescheduleTarget(apt)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors">Reschedule</button>
                  <button onClick={() => setCancelTarget(apt)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors">Cancel</button>
                </div>
              )}

              {/* Actions for missed */}
              {tab === 'missed' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-amber-100">
                  <button
                    onClick={() => setPostponeTarget(apt)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Postpone to New Date
                  </button>
                  <button
                    onClick={() => handleExpire(apt._id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <XCircle className="w-4 h-4" /> Let Expire
                  </button>
                </div>
              )}

              {/* Postponed info */}
              {apt.status === 'Postponed' && apt.postponedTo && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
                  Postponed to: <span className="font-mono">{apt.postponedTo}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Cancel Appointment?</h2>
            <p className="text-sm text-slate-600">This will cancel your appointment with <strong>{cancelTarget.doctorName}</strong> on {cancelTarget.date}.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Keep</button>
              <button onClick={confirmCancel} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Reschedule Appointment</h2>
            <p className="text-sm text-slate-600">Pick a new date and time for <strong>{rescheduleTarget.doctorName}</strong>.</p>
            <input type="date" value={newDate} min={new Date().toISOString().split('T')[0]} onChange={e => setNewDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setRescheduleTarget(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={confirmReschedule} disabled={!newDate || !newTime} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Postpone Modal (for missed) */}
      {postponeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Postpone Appointment</h2>
            <p className="text-sm text-slate-600">
              Reschedule your missed appointment with <strong>{postponeTarget.doctorName}</strong> from{' '}
              <span className="font-mono">{postponeTarget.date}</span> to a new date.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New Date</label>
              <input
                type="date"
                value={postponeDate}
                onChange={e => setPostponeDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New Time</label>
              <input
                type="time"
                value={postponeTime}
                onChange={e => setPostponeTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPostponeTarget(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={handlePostpone} disabled={!postponeDate || !postponeTime} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">Confirm Postpone</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
