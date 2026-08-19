import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Calendar, CheckCircle, Loader2, Building2, Activity, AlertTriangle } from 'lucide-react';
import { getDoctors, createAppointment } from '../../lib/api';
import useAuthStore from '../../store/useAuthStore';

export default function DoctorBooking() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const hospitalId = searchParams.get('hospitalId') || null;
  const hospitalName = searchParams.get('hospitalName') || '';
  
  const [doctor, setDoctor] = useState<any>(null);
  const [availableDates, setAvailableDates] = useState<{date: Date, display: string}[]>([]);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [classifiedTriage, setClassifiedTriage] = useState(1);
  const [classifiedCategory, setClassifiedCategory] = useState('Standard OPD');
  const [isBooking, setIsBooking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const classifySymptoms = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('chest pain') || lower.includes('heart attack') || lower.includes('severe breath') || lower.includes('left arm pain') || lower.includes('unconscious')) {
      return { level: 5, category: 'Cardiac Event (Emergency)' };
    }
    if (lower.includes('headache') || lower.includes('dizzy') || lower.includes('stiff neck') || lower.includes('stroke') || lower.includes('fainted') || lower.includes('vision')) {
      return { level: 4, category: 'Neurological / Acute Pain' };
    }
    if (lower.includes('fever') || lower.includes('cough') || lower.includes('vomit') || lower.includes('stomach') || lower.includes('abdomen') || lower.includes('diarrhea')) {
      return { level: 3, category: 'Urgent Systemic Infection / Gastro' };
    }
    if (lower.includes('rash') || lower.includes('itch') || lower.includes('allergy') || lower.includes('earache') || lower.includes('sprain') || lower.includes('swelling')) {
      return { level: 2, category: 'Moderate Allergic / Musculoskeletal' };
    }
    return { level: 1, category: 'Standard Outpatient Consultation' };
  };

  useEffect(() => {
    // Generate next 5 days
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      let display = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (i === 0) display = 'Today';
      if (i === 1) display = 'Tomorrow';
      dates.push({ date: d, display });
    }
    setAvailableDates(dates);
    setSelectedDateObj(dates[0].date);
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    getDoctors().then(res => {
      const match = res.data.find((d: any) => d._id === doctorId);
      if (match) setDoctor(match);
    }).catch(console.error);
  }, [doctorId]);

  const handleBook = async () => {
    if (!selectedSlot || !doctor || !user || !selectedDateObj) return;
    setIsBooking(true);
    
    try {
      // Create date string in YYYY-MM-DD format
      const dateStr = selectedDateObj.toISOString().split('T')[0];
      
      await createAppointment({
        patientId: user.id,
        doctorId: doctor._id,
        patientName: user.name,
        doctorName: doctor.name,
        date: dateStr,
        time: selectedSlot,
        type: 'Consultation',
        hospitalId: hospitalId || undefined,
        hospitalName: hospitalName || undefined,
        chiefComplaint: chiefComplaint || 'General OPD Consultation',
        triageLevel: classifiedTriage,
      });
      setIsConfirmed(true);
    } catch (err) {
      console.error(err);
    }
    setIsBooking(false);
  };

  const generateTimeSlots = (start: string, end: string) => {
    if (!start || !end) return [];
    const slots = [];
    let [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let current = startHour * 60 + startMin;
    const endLimit = endHour * 60 + endMin;
    
    while (current < endLimit) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      slots.push({
        display: `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`,
        totalMins: current,
      });
      current += 30; // 30 min intervals
    }
    return slots;
  };

  const getAvailableSlots = () => {
    if (!doctor || !selectedDateObj) return [];
    
    // Check for unavailable dates at this specific hospital
    if (hospitalId) {
      // Create local YYYY-MM-DD
      const year = selectedDateObj.getFullYear();
      const monthStr = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
      const dateStr = String(selectedDateObj.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${monthStr}-${dateStr}`;
      
      const isUnavailable = doctor.unavailableDates?.some((ud: any) => ud.date === formattedDate && ud.hospitalId === hospitalId);
      if (isUnavailable) return [];
    }
    
    if (!doctor.schedule || !Array.isArray(doctor.schedule.days) || doctor.schedule.days.length === 0) {
      // Fallback if no valid schedule is set
      return generateTimeSlots('09:00', '17:00').map(s => s.display);
    }

    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][selectedDateObj.getDay()];
    
    let daySchedule;
    if (doctor.schedule.isSameEveryday) {
      daySchedule = doctor.schedule.days[0];
    } else {
      daySchedule = doctor.schedule.days.find((d: any) => d.day === dayOfWeek);
    }

    if (!daySchedule || !daySchedule.isAvailable) return [];
    const allSlots = generateTimeSlots(daySchedule.startTime, daySchedule.endTime);

    // Filter out past time slots if the selected date is TODAY
    const now = new Date();
    const isToday = selectedDateObj.toDateString() === now.toDateString();
    if (isToday) {
      const currentMins = now.getHours() * 60 + now.getMinutes();
      return allSlots.filter(slot => slot.totalMins > currentMins).map(s => s.display);
    }
    return allSlots.map(s => s.display);
  };

  if (!doctor) return <div className="p-12 text-center text-slate-500 font-medium">Loading booking page...</div>;

  if (isConfirmed) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Booking Confirmed!</h2>
        <p className="text-slate-600 mb-8">Your appointment with {doctor.name} has been successfully scheduled.</p>
        
        <div className="bg-slate-50 p-6 rounded-xl text-left mb-8 space-y-3">
          <div className="flex items-center gap-3 text-slate-700">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-medium">{selectedDateObj?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-700">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-medium">{selectedSlot}</span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/patient/appointments')}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          View My Appointments
        </button>
      </div>
    );
  }

  const availableTimeSlots = getAvailableSlots();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back to Search
      </button>

      {/* Doctor Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row gap-6">
        <div className="w-24 h-24 bg-slate-100 rounded-2xl flex-shrink-0 flex items-center justify-center">
           <span className="text-3xl font-bold text-slate-400">
             {doctor.name ? doctor.name.replace(/^Dr\.\s*/i, '').charAt(0) || doctor.name.charAt(0) : 'D'}
           </span>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">{doctor.name}</h1>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-amber-700">{doctor.rating || 'New'}</span>
            </div>
          </div>
          <p className="text-blue-600 font-medium mb-3">{doctor.specialization}</p>
          {hospitalName && (
            <div className="flex items-center gap-2 mb-3 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium w-max">
              <Building2 className="w-4 h-4" />
              Booking appointment at {hospitalName}
            </div>
          )}
          <p className="text-slate-600 leading-relaxed text-sm max-w-2xl">{doctor.bio || 'No summary available.'}</p>
        </div>
      </div>

      {/* Chief Complaint / Health Problem Input with Live Auto-Triage */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Describe Health Problem / Symptoms
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Automated NLP Triage engine dynamically classifies urgency for queue ranking</p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
              classifiedTriage === 5 ? 'bg-red-600 text-white animate-pulse' :
              classifiedTriage === 4 ? 'bg-orange-500 text-white' :
              classifiedTriage === 3 ? 'bg-amber-500 text-white' :
              classifiedTriage === 2 ? 'bg-blue-600 text-white' :
              'bg-slate-700 text-white'
            }`}>
              {classifiedTriage >= 4 && <AlertTriangle className="w-3.5 h-3.5" />}
              Level {classifiedTriage}: {classifiedCategory}
            </span>
          </div>
        </div>

        <div className="p-6">
          <textarea
            rows={3}
            value={chiefComplaint}
            onChange={(e) => {
              const text = e.target.value;
              setChiefComplaint(text);
              const res = classifySymptoms(text);
              setClassifiedTriage(res.level);
              setClassifiedCategory(res.category);
            }}
            placeholder="Describe your health problem or symptoms (e.g. 'Severe chest pain radiating to left arm' or 'Routine blood pressure follow-up')..."
            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium placeholder:text-slate-400 bg-slate-50"
          />
        </div>
      </div>

      {/* Booking Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Select Date & Time</h2>
        </div>
        
        <div className="p-6">
          {/* Date Selector */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Available Dates</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {availableDates.map(item => (
                <button
                  key={item.display}
                  onClick={() => { setSelectedDateObj(item.date); setSelectedSlot(null); }}
                  className={`px-5 py-3 rounded-xl border font-medium whitespace-nowrap transition-all ${
                    selectedDateObj?.getTime() === item.date.getTime() 
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {item.display}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selector */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Select Time for {selectedDateObj?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
            <div className="flex flex-col gap-2">
              <input 
                type="time" 
                min="09:00" 
                max="17:00" 
                value={selectedSlot ? (() => {
                  if (selectedSlot.includes('AM') || selectedSlot.includes('PM')) {
                    const [time, modifier] = selectedSlot.split(' ');
                    let [hours, minutes] = time.split(':');
                    if (hours === '12') hours = '00';
                    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
                    return `${hours.padStart(2, '0')}:${minutes}`;
                  }
                  return selectedSlot;
                })() : ''} 
                onChange={(e) => {
                  const timeStr = e.target.value;
                  if (timeStr) {
                    const [h] = timeStr.split(':').map(Number);
                    if (h >= 9 && h <= 17) {
                      let hours = h;
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      const strTime = hours.toString().padStart(2, '0') + ':' + timeStr.split(':')[1] + ' ' + ampm;
                      setSelectedSlot(strTime);
                    } else {
                      alert('Please select a time between 09:00 AM and 05:00 PM');
                    }
                  } else {
                    setSelectedSlot(null);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 shadow-sm transition-all hover:border-blue-400" 
              />
              <span className="text-sm text-slate-500 font-medium">Working hours: 09:00 AM - 05:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Action */}
      <div className="flex justify-end">
        <button
          onClick={handleBook}
          disabled={!selectedSlot || isBooking}
          className="px-8 py-3 bg-slate-900 text-white text-lg font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg flex items-center gap-2"
        >
          {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Appointment'}
        </button>
      </div>

    </div>
  );
}
