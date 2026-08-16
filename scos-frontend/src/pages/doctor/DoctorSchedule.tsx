import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Users, AlertTriangle, ArrowRightLeft, XCircle } from 'lucide-react';
import { getAppointments, getMissedAppointments, updateAppointmentStatus } from '../../lib/api';
import useDoctorStore from '../../store/useDoctorStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const generateWeekDates = (offset: number) => {
  const today = new Date();
  const start = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(today.getDate() + diff + (offset * 7));
  return DAYS.map((day, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const year = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dateStr = String(d.getDate()).padStart(2, '0');
    return { 
      day, 
      date: d.getDate(), 
      month: d.toLocaleString('default', { month: 'short' }), 
      full: `${year}-${monthStr}-${dateStr}`, 
      isToday: d.toDateString() === today.toDateString() 
    };
  });
};

export default function DoctorSchedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [missedAppointments, setMissedAppointments] = useState<any[]>([]);
  const { activeHospitalId } = useDoctorStore();

  // Postpone modal state
  const [postponeTarget, setPostponeTarget] = useState<any | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadAppointments = () => {
    getAppointments({ hospitalId: activeHospitalId }).then(res => setAppointments(res.data)).catch(() => {});
    getMissedAppointments({ hospitalId: activeHospitalId }).then(res => setMissedAppointments(res.data)).catch(() => {});
  };

  useEffect(() => {
    loadAppointments();
  }, [activeHospitalId]);

  const weekDates = generateWeekDates(weekOffset);

  // Select today by default
  const activeDayFull = selectedDay || weekDates.find(d => d.isToday)?.full || weekDates[0].full;
  
  const getParsedDate = (apptDate: string) => {
    if (!apptDate) return '';
    const toLocalString = (d: Date) => {
      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dateStr = String(d.getDate()).padStart(2, '0');
      return `${year}-${monthStr}-${dateStr}`;
    };
    if (apptDate === 'Today') return toLocalString(new Date());
    if (apptDate === 'Tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return toLocalString(tomorrow);
    }
    return apptDate; // Assuming YYYY-MM-DD
  };

  const activeSlots = appointments
    .filter(appt => getParsedDate(appt.date) === activeDayFull || (!getParsedDate(appt.date) && appt.date === activeDayFull))
    .sort((a, b) => a.time.localeCompare(b.time));

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
      setActionMsg('Appointment postponed successfully!');
      setTimeout(() => setActionMsg(''), 3000);
      loadAppointments();
    } catch (err) {
      console.error('Failed to postpone:', err);
    }
  };

  const handleExpire = async (id: string) => {
    try {
      await updateAppointmentStatus(id, { status: 'Missed' });
      setActionMsg('Appointment marked as expired.');
      setTimeout(() => setActionMsg(''), 3000);
      loadAppointments();
    } catch (err) {
      console.error('Failed to expire:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Schedule</h1>
          <p className="text-slate-500">Manage your consultation slots and availability.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-5 h-5" /> Add Time Slot
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">{actionMsg}</div>
      )}

      {/* Missed Appointments Banner */}
      {missedAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-amber-200 bg-amber-100/50 flex items-center gap-3">
            <div className="p-2 bg-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Missed Appointments</h3>
              <p className="text-xs text-amber-700">{missedAppointments.length} appointment{missedAppointments.length > 1 ? 's' : ''} past due — take action below</p>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {missedAppointments.map((appt) => (
              <div key={appt._id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-amber-200 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(appt.patientId?.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{appt.patientId?.name || 'Patient'}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{appt.date}</span> at <span className="font-mono">{appt.time}</span>
                      {appt.isWalkin && <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">WALK-IN</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPostponeTarget(appt)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <ArrowRightLeft className="w-3 h-3" /> Postpone
                  </button>
                  <button
                    onClick={() => handleExpire(appt._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <XCircle className="w-3 h-3" /> Expire
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week Picker */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-slate-700">
            {weekDates[0].month} {weekDates[0].date} — {weekDates[6].month} {weekDates[6].date}
          </h2>
          <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((d) => {
            const isActive = d.full === activeDayFull;
            const isSunday = d.day === 'Sun';
            return (
              <button
                key={d.full}
                onClick={() => setSelectedDay(d.full)}
                disabled={isSunday}
                className={`flex flex-col items-center py-3 rounded-xl font-medium transition-all ${
                  isSunday ? 'bg-red-50 text-red-300 cursor-not-allowed' :
                  isActive ? 'bg-blue-600 text-white shadow-md scale-105' :
                  d.isToday ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' :
                  'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs uppercase tracking-wider">{d.day}</span>
                <span className="text-lg font-bold mt-1">{d.date}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Day Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-slate-700">Booked</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{activeSlots.length}</span>
              </div>
              {missedAppointments.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm text-slate-700">Missed</span>
                  </div>
                  <span className="text-sm font-bold text-amber-700">{missedAppointments.length}</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm">
            <Calendar className="w-8 h-8 mb-3 opacity-80" />
            <p className="text-2xl font-extrabold">{activeSlots.length}</p>
            <p className="text-sm text-blue-100 mt-1">Appointments Today</p>
          </div>
        </div>

        {/* Time Slots */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Appointments
            </h2>
          </div>
          <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
            {activeSlots.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No appointments booked for this day.</p>
            ) : (
              activeSlots.map((slot) => (
                <div key={slot._id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  slot.isWalkin ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-bold text-slate-700 w-20">{slot.time}</span>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-slate-800">{slot.patientId?.name || slot.patientName || 'Patient'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {slot.isWalkin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">WALK-IN</span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      slot.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                      slot.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                      slot.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      slot.status === 'Postponed' ? 'bg-amber-100 text-amber-700' :
                      slot.status === 'Missed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{slot.status || 'Confirmed'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Postpone Modal */}
      {postponeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Postpone Appointment</h2>
            <p className="text-sm text-slate-600">
              Reschedule <strong>{postponeTarget.patientId?.name || 'Patient'}</strong>'s missed appointment from{' '}
              <span className="font-mono">{postponeTarget.date}</span>.
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
              <button onClick={handlePostpone} disabled={!postponeDate || !postponeTime} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
