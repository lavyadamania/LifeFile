import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import useStreamingStore from '../services/streaming';
import useNotificationStore from '../store/useNotificationStore';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success';
}

export default function GlobalToaster() {
  const { lastEvent } = useStreamingStore();
  const { addNotification } = useNotificationStore();
  const [toasts, setToasts] = useState<Toast[]>([]);

  // We are simulating the logged-in patient as PAT-004
  const myPatientId = 'PAT-004'; 

  useEffect(() => {
    if (!lastEvent) return;

    let message = '';
    let title = '';
    let type: 'info' | 'success' = 'info';

    if (lastEvent.topic === 'scos.queue.updates') {
      title = 'Queue Update';
      message = 'The queue has moved forward. Your estimated wait time has been updated.';
      type = 'info';
    } else if (lastEvent.topic === 'scos.prescriptions' && lastEvent.data?.patientId === myPatientId) {
      title = 'Prescription Ready';
      message = 'Your doctor has issued a new prescription. You can view the PDF in your Medical Timeline.';
      type = 'success';
    }

    if (message) {
      // 1. Add to global persistent store for the Bell panel
      addNotification({ title, message, type });

      // 2. Add to transient toasts array for on-screen display
      const newToast = { id: Math.random().toString(), message, type };
      setToasts(prev => [...prev, newToast]);

      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
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
          className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-lg border animate-fade-in-down ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <Bell className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
          <button 
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-1 rounded-full opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
