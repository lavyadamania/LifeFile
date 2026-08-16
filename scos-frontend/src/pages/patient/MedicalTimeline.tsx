import { useState, useEffect } from 'react';
import { Activity, Stethoscope, FileText, ChevronDown, ChevronUp, Clock, Pill, Building2, CalendarCheck, MapPin } from 'lucide-react';
import PrescriptionPreview from '../../components/PrescriptionPreview';
import { getPrescriptions, getAppointments } from '../../lib/api';

type TimelineEvent = {
  id: string;
  type: 'prescription' | 'appointment';
  date: Date;
  hospitalName: string;
  title: string;
  subtitle: string;
  rawData: any;
};

export default function MedicalTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [previewPrescription, setPreviewPrescription] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPrescriptions().catch(() => ({ data: [] })),
      getAppointments({ status: 'Completed' }).catch(() => ({ data: [] })),
    ]).then(([rxRes, apptRes]) => {
      const rxEvents: TimelineEvent[] = rxRes.data.map((rx: any) => ({
        id: `rx-${rx._id}`,
        type: 'prescription',
        date: new Date(rx.createdAt),
        hospitalName: rx.hospitalName || 'Individual Clinic',
        title: rx.diagnosis || 'Prescription',
        subtitle: `${rx.doctorName} • ${rx.medications?.length || 0} med(s)`,
        rawData: rx,
      }));

      const apptEvents: TimelineEvent[] = apptRes.data.map((appt: any) => {
        const apptDate = new Date(`${appt.date}T${appt.time || '00:00:00'}`);
        return {
          id: `appt-${appt._id}`,
          type: 'appointment',
          date: isNaN(apptDate.getTime()) ? new Date(appt.date) : apptDate,
          hospitalName: appt.hospitalName || 'Individual Clinic',
          title: `Consultation with Dr. ${appt.doctorName}`,
          subtitle: `Completed • ${appt.spec || 'General'}`,
          rawData: appt,
        };
      });

      const allEvents = [...rxEvents, ...apptEvents].sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(allEvents);
    }).finally(() => setLoading(false));
  }, []);

  const toggleEvent = (id: string) => {
    const newSet = new Set(expandedEvents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedEvents(newSet);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Global Medical Timeline</h1>
        <p className="text-slate-500">A unified, chronological history of your visits, prescriptions, and medical records across all facilities.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg font-medium">No medical history yet.</p>
          <p className="text-sm text-slate-400 mt-1">Your unified records will appear here.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-8">
          {events.map((event) => {
            const isExpanded = expandedEvents.has(event.id);
            const isRx = event.type === 'prescription';
            const rx = event.rawData;

            return (
              <div key={event.id} className="relative pl-8">
                {/* Timeline Dot */}
                <div className={`absolute -left-[11px] top-4 w-5 h-5 rounded-full border-4 border-slate-50 ${isRx ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                
                <div className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden ${isExpanded ? 'border-slate-300 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div
                    onClick={() => toggleEvent(event.id)}
                    className={`p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4 ${isExpanded ? (isRx ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200') : 'bg-white'}`}
                  >
                    <div className={`p-3 rounded-lg border shadow-sm shrink-0 ${isRx ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                      {isRx ? <Pill className="w-6 h-6" /> : <CalendarCheck className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-800 text-lg">{event.title}</h3>
                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">
                        {event.subtitle}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 pt-1">
                        {event.hospitalName === 'Individual Clinic' ? (
                          <Stethoscope className="w-3.5 h-3.5" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5" />
                        )}
                        {event.hospitalName}
                      </div>
                    </div>

                    <div className="text-slate-400 hidden sm:block shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 bg-white space-y-3">
                      {isRx ? (
                        <>
                          {rx.notes && (
                            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100/50 text-sm text-slate-700 italic border-l-4 border-l-amber-300">
                              "{rx.notes}"
                            </div>
                          )}
                          {rx.medications?.map((med: any, i: number) => (
                            <div key={i} className="text-sm pl-3 border-l-2 border-emerald-200">
                              <span className="font-bold text-slate-800">{med.name}</span>
                              <span className="text-slate-500 ml-1">{med.dosage}</span>
                              <span className="text-slate-400 ml-1">• {med.frequency} • {med.duration}</span>
                            </div>
                          ))}
                          <button
                            onClick={() => setPreviewPrescription(rx)}
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                          >
                            <FileText className="w-4 h-4" /> View PDF Prescription
                          </button>
                        </>
                      ) : (
                        <div className="text-sm text-slate-600 space-y-2">
                          <p><strong className="text-slate-800">Date & Time:</strong> {event.date.toLocaleString()}</p>
                          <p><strong className="text-slate-800">Specialization:</strong> {event.rawData.spec || 'General Practice'}</p>
                          {event.rawData.notes && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 italic">
                              "{event.rawData.notes}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewPrescription && (
        <PrescriptionPreview
          onClose={() => setPreviewPrescription(null)}
          patientName={previewPrescription.patientName || 'Patient'}
          doctorName={previewPrescription.doctorName || 'Doctor'}
          date={new Date(previewPrescription.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          medications={previewPrescription.medications || []}
        />
      )}
    </div>
  );
}
