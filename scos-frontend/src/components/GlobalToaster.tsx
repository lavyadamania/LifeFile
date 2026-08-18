import { useEffect, useState } from 'react';
import { Bell, X, AlertTriangle, CheckCircle2, UserCheck } from 'lucide-react';
import useStreamingStore from '../services/streaming';
import useNotificationStore from '../store/useNotificationStore';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export default function GlobalToaster() {
  const { lastEvent } = useStreamingStore();
  const { addNotification } = useNotificationStore();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const myPatientId = 'PAT-004'; 

  useEffect(() => {
    if (!lastEvent) return;

    let message = '';
    let title = '';
    let type: 'info' | 'success' | 'warning' = 'info';

    const { topic, data } = lastEvent;

    if (topic === 'scos.queue.updates' || topic === 'lifefile.queue.updates') {
      const action = data?.action;
      if (action === 'CALL_NEXT') {
        title = 'Patient Called';
        message = data?.tokenNumber ? `Started consultation for Token #${data.tokenNumber}` : 'Next patient called into consultation.';
        type = 'info';
      } else if (action === 'SKIP_PATIENT') {
        title = 'Patient Skipped';
        message = 'Patient moved to Skipped Queue (Skip penalty applied).';
        type = 'warning';
      } else if (action === 'CONSULTATION_COMPLETE') {
        title = 'Consultation Completed';
        message = 'Patient consultation completed.';
        type = 'success';
      } else if (action === 'ADD_TO_QUEUE') {
        title = 'New Patient Added';
        message = `${data?.patientName || 'A patient'} has joined the queue.`;
        type = 'info';
      }
    } else if (topic === 'scos.prescriptions' && data?.patientId === myPatientId) {
      title = 'Prescription Ready';
      message = 'Your doctor has issued a new prescription.';
      type = 'success';
    }

    if (message) {
      addNotification({ title, message, type: type === 'warning' ? 'warning' : type });

      const newToast = { id: Math.random().toString(), title, message, type };
      setToasts(prev => [...prev.slice(-2), newToast]); // Limit to max 3 on screen

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 4000);
    }
  }, [lastEvent, addNotification]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 w-80 p-3.5 rounded-xl shadow-xl border animate-fade-in-down transition-all ${
            toast.type === 'success' 
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
              : toast.type === 'warning'
              ? 'bg-amber-900 text-amber-100 border-amber-700'
              : 'bg-slate-900 text-slate-100 border-slate-700'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <UserCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}

          <div className="flex-1">
            <h4 className="font-bold text-xs uppercase tracking-wider">{toast.title}</h4>
            <p className="text-xs font-medium mt-0.5 leading-snug">{toast.message}</p>
          </div>

          <button 
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
