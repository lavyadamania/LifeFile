import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type KafkaEvent = {
  topic: string;
  data: any;
  timestamp: string;
};

interface QueuePatient {
  id: string;
  name: string;
  status: string;
  hospitalId: string | null;
  hospitalName: string;
}

interface StreamingState {
  isConnected: boolean;
  lastEvent: KafkaEvent | null;
  events: KafkaEvent[];
  currentServingId: string | null;
  currentServingName: string | null; // BUG 8 FIX: store name separately
  currentServingHospitalId: string | null;
  currentServingHospitalName: string;
  queueList: QueuePatient[];
  socket: Socket | null;
  // Actions
  connect: () => void;
  disconnect: () => void;
  callNext: (doctorId: string, hospitalId?: string, hospitalName?: string) => void;
  addToQueue: (patientId: string, patientName: string, doctorId: string, hospitalId?: string, hospitalName?: string) => void;
}

// BUG 1 FIX: Persist queue to localStorage so it survives page refresh
const QUEUE_STORAGE_KEY = 'lifefile-queue-state';

const loadPersistedQueue = (): { queueList: QueuePatient[]; currentServingId: string | null; currentServingName: string | null } => {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { queueList: [], currentServingId: null, currentServingName: null };
};

const saveQueueToStorage = (queueList: QueuePatient[], currentServingId: string | null, currentServingName: string | null) => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ queueList, currentServingId, currentServingName }));
  } catch {}
};

const persisted = loadPersistedQueue();

const useStreamingStore = create<StreamingState>((set, get) => ({
  isConnected: false,
  lastEvent: null,
  events: [],
  currentServingId: persisted.currentServingId,       // BUG 1 FIX
  currentServingName: persisted.currentServingName,   // BUG 8 FIX
  currentServingHospitalId: null,
  currentServingHospitalName: '',
  queueList: persisted.queueList,                     // BUG 1 FIX
  socket: null,

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true, socket });
      console.log('[Socket.io] Connected to backend');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('[Socket.io] Disconnected');
    });

    // Listen for real Kafka events bridged through Socket.io
    socket.on('kafka-event', (event: KafkaEvent) => {
      console.log(`[Kafka Event] ${event.topic}:`, event.data);
      
      set((state) => ({
        lastEvent: event,
        events: [event, ...state.events].slice(0, 50), // Keep last 50
      }));

      // Handle queue-specific events
      if (event.topic === 'lifefile.queue.updates' || event.topic === 'scos.queue.updates') {
        const { action, patientId, patientName } = event.data;
        
        if (action === 'ADD_TO_QUEUE') {
          set((state) => {
            // BUG 9 FIX: Guard against duplicate adds
            if (state.queueList.find(p => p.id === patientId)) return state;
            const newQueue = [...state.queueList, {
              id: patientId,
              name: patientName || 'Unknown Patient',
              status: 'Waiting',
              hospitalId: event.data.hospitalId || null,
              hospitalName: event.data.hospitalName || '',
            }];
            saveQueueToStorage(newQueue, state.currentServingId, state.currentServingName);
            return { queueList: newQueue };
          });
        }
        
        if (action === 'CALL_NEXT') {
          set((state) => {
            const queue = [...state.queueList];
            if (queue.length > 0) {
              const next = queue.shift()!;
              saveQueueToStorage(queue, next.id, next.name); // BUG 1 + 8 FIX
              return {
                currentServingId: next.id,
                currentServingName: next.name,           // BUG 8 FIX
                currentServingHospitalId: next.hospitalId || null,
                currentServingHospitalName: next.hospitalName || '',
                queueList: queue,
              };
            }
            return state;
          });
        }

        if (action === 'CONSULTATION_COMPLETE') {
          set((state) => {
            saveQueueToStorage(state.queueList, null, null);
            return {
              currentServingId: null,
              currentServingName: null,
              currentServingHospitalId: null,
              currentServingHospitalName: '',
            };
          });
        }
      }
    });

    socket.connect();
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  callNext: async (doctorId: string, hospitalId?: string, hospitalName?: string) => {
    const queue = get().queueList;
    if (queue.length === 0) return;
    
    try {
      // BUG 4 FIX: consistent localStorage key
      const token = JSON.parse(localStorage.getItem('scos-auth-storage') || '{}')?.state?.token;
      await fetch('http://localhost:5000/api/queue/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          doctorId,
          patientId: queue[0].id,
          hospitalId: hospitalId || queue[0].hospitalId || null,
          hospitalName: hospitalName || queue[0].hospitalName || '',
        }),
      });
    } catch (err) {
      console.error('[Queue] Call next failed:', err);
    }
  },

  addToQueue: async (patientId: string, patientName: string, doctorId: string, hospitalId?: string, hospitalName?: string) => {
    try {
      const token = JSON.parse(localStorage.getItem('scos-auth-storage') || '{}')?.state?.token;
      await fetch('http://localhost:5000/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId,
          patientName,
          doctorId,
          hospitalId: hospitalId || null,
          hospitalName: hospitalName || '',
        }),
      });
    } catch (err) {
      console.error('[Queue] Add to queue failed:', err);
    }
  },
}));

export default useStreamingStore;
