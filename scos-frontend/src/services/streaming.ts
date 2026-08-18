import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { getQueueList, callNextPatient } from '../lib/api';

export type KafkaEvent = {
  topic: string;
  data: any;
  timestamp: string;
};

export interface PriorityDetails {
  score: number;
  slotContribution: number;
  agingContribution: number;
  triageContribution: number;
  penaltyContribution: number;
  priorityLevel: string;
  reason: string;
  waitMinutes: number;
  token: number;
}

export interface QueuePatient {
  id: string; // appointmentId
  patientId: string;
  name: string;
  status: string;
  hospitalId: string | null;
  hospitalName: string;
  baseToken?: number;
  triageLevel?: number;
  missedCalls?: number;
  priority?: PriorityDetails;
}

interface StreamingState {
  isConnected: boolean;
  lastEvent: KafkaEvent | null;
  events: KafkaEvent[];
  currentServingId: string | null; // appointmentId
  currentServingName: string | null; 
  currentServingPatientId: string | null;
  currentServingHospitalId: string | null;
  currentServingHospitalName: string;
  queueList: QueuePatient[];
  socket: Socket | null;
  activeDoctorId: string | null;
  // Actions
  connect: () => void;
  disconnect: () => void;
  fetchQueue: (doctorId: string) => Promise<void>;
  callNext: (doctorId: string, hospitalId?: string, hospitalName?: string) => void;
  addToQueue: (patientId: string, patientName: string, doctorId: string, hospitalId?: string, hospitalName?: string) => void;
}

const QUEUE_STORAGE_KEY = 'lifefile-queue-state';

const loadPersistedQueue = (): { queueList: QueuePatient[]; currentServingId: string | null; currentServingName: string | null; currentServingPatientId: string | null } => {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { queueList: [], currentServingId: null, currentServingName: null, currentServingPatientId: null };
};

const saveQueueToStorage = (queueList: QueuePatient[], currentServingId: string | null, currentServingName: string | null, currentServingPatientId: string | null) => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ queueList, currentServingId, currentServingName, currentServingPatientId }));
  } catch {}
};

const persisted = loadPersistedQueue();

const useStreamingStore = create<StreamingState>((set, get) => ({
  isConnected: false,
  lastEvent: null,
  events: [],
  currentServingId: persisted.currentServingId,
  currentServingName: persisted.currentServingName,
  currentServingPatientId: persisted.currentServingPatientId,
  currentServingHospitalId: null,
  currentServingHospitalName: '',
  queueList: persisted.queueList,
  socket: null,
  activeDoctorId: null,

  fetchQueue: async (doctorId: string) => {
    try {
      set({ activeDoctorId: doctorId });
      const res = await getQueueList({ doctorId });
      const queueData = res.data.map((q: any) => ({
        id: q._id, // appointmentId
        patientId: q.patientId,
        name: q.patientName,
        status: q.status,
        hospitalId: q.hospitalId,
        hospitalName: q.hospitalName,
        baseToken: q.baseToken,
        triageLevel: q.triageLevel,
        missedCalls: q.missedCalls,
        priority: q.priority
      }));
      
      // Prevent the active patient from appearing in the waiting queue list
      const filteredQueue = queueData.filter((q: any) => q.id !== get().currentServingId);
      
      set({ queueList: filteredQueue });
      saveQueueToStorage(filteredQueue, get().currentServingId, get().currentServingName, get().currentServingPatientId);
    } catch (err) {
      console.error('Failed to fetch authoritative queue:', err);
    }
  },

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io('http://localhost:5000', {
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true, socket });
      console.log('[Socket.io] Connected to backend');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('[Socket.io] Disconnected');
    });

    socket.on('kafka-event', (event: KafkaEvent) => {
      console.log(`[Kafka Event] ${event.topic}:`, event.data);
      
      set((state) => ({
        lastEvent: event,
        events: [event, ...state.events].slice(0, 50),
      }));

      // DWPA Backend Authoritative: always refetch on relevant updates
      const doctorId = get().activeDoctorId;
      if (doctorId && (event.topic === 'lifefile.queue.updates' || event.topic === 'scos.queue.updates')) {
        const { action } = event.data;
        if (['ADD_TO_QUEUE', 'CALL_NEXT', 'SKIP_PATIENT', 'CONSULTATION_COMPLETE'].includes(action)) {
          get().fetchQueue(doctorId);
        }

        // Local state updates for the active patient
        if (action === 'CALL_NEXT') {
          const { appointmentId, patientId, hospitalId, hospitalName } = event.data;
          set((state) => {
            const queue = [...state.queueList];
            // Find the specific patient if appointmentId is provided (e.g. from postponed list)
            let nextIndex = 0;
            if (appointmentId) {
              const foundIdx = queue.findIndex(q => q.id === appointmentId);
              if (foundIdx !== -1) nextIndex = foundIdx;
            }
            
            if (queue.length > 0) {
              // Extract that specific patient
              const next = queue.splice(nextIndex, 1)[0];
              saveQueueToStorage(queue, next.id, next.name, next.patientId);
              return {
                currentServingId: next.id,
                currentServingName: next.name,
                currentServingPatientId: next.patientId,
                currentServingHospitalId: next.hospitalId || hospitalId || null,
                currentServingHospitalName: next.hospitalName || hospitalName || '',
                queueList: queue,
              };
            }
            return state;
          });
        }

        if (action === 'CONSULTATION_COMPLETE' || action === 'SKIP_PATIENT') {
          set((state) => {
            saveQueueToStorage(state.queueList, null, null, null);
            return {
              currentServingId: null,
              currentServingName: null,
              currentServingPatientId: null,
              currentServingHospitalId: null,
              currentServingHospitalName: '',
            };
          });
        }
      }
    });
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
      await callNextPatient({
        doctorId,
        patientId: queue[0].patientId || queue[0].id,
        appointmentId: queue[0].id,
        hospitalId: hospitalId || queue[0].hospitalId || undefined,
        hospitalName: hospitalName || queue[0].hospitalName || '',
      });
    } catch (err) {
      console.error('[Queue] Call next failed:', err);
    }
  },

  addToQueue: async (patientId: string, patientName: string, doctorId: string, hospitalId?: string, hospitalName?: string) => {
    try {
      // NOTE: We don't use this directly anymore due to DWPA backend calculation, 
      // but keeping it authenticated just in case it's called somewhere else.
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
