import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { getQueueList, callNextPatient, completeConsultation as apiCompleteConsultation, skipPatient as apiSkipPatient, API_BASE_URL } from '../lib/api';

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
  _id?: string;
  patientId: string;
  patientName?: string;
  name: string;
  status: string;
  hospitalId: string | null;
  hospitalName: string;
  baseToken?: number;
  tokenNumber?: number;
  queuePosition?: number;
  triageLevel?: number;
  missedCalls?: number;
  time?: string;
  priority?: PriorityDetails;
}

interface StreamingState {
  isConnected: boolean;
  lastEvent: KafkaEvent | null;
  events: KafkaEvent[];
  nowServing: QueuePatient | null;
  currentServingId: string | null; // For backward compatibility
  currentServingName: string | null;
  currentServingPatientId: string | null;
  queueList: QueuePatient[];
  socket: Socket | null;
  activeDoctorId: string | null;
  activeHospitalId: string | undefined;
  // Actions
  connect: () => void;
  disconnect: () => void;
  fetchQueue: (doctorId: string, hospitalId?: string) => Promise<void>;
  callNext: (doctorId: string, hospitalId?: string, hospitalName?: string, appointmentId?: string, patientId?: string) => Promise<void>;
  completeConsult: (doctorId: string, appointmentId: string) => Promise<void>;
  skipAppt: (doctorId: string, appointmentId: string) => Promise<void>;
}

const useStreamingStore = create<StreamingState>((set, get) => ({
  isConnected: false,
  lastEvent: null,
  events: [],
  nowServing: null,
  currentServingId: null,
  currentServingName: null,
  currentServingPatientId: null,
  queueList: [],
  socket: null,
  activeDoctorId: null,
  activeHospitalId: undefined,

  fetchQueue: async (doctorId: string, hospitalId?: string) => {
    try {
      set({ activeDoctorId: doctorId, activeHospitalId: hospitalId });
      const res = await getQueueList({ doctorId, hospitalId });
      
      let nowServingItem: QueuePatient | null = null;
      let waitingList: QueuePatient[] = [];

      if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        nowServingItem = res.data.nowServing || null;
        waitingList = res.data.waitingQueue || [];
      } else if (Array.isArray(res.data)) {
        waitingList = res.data.map((q: any) => ({
          id: q._id || q.id,
          _id: q._id || q.id,
          patientId: q.patientId,
          name: q.patientName || q.name,
          patientName: q.patientName || q.name,
          status: q.status,
          hospitalId: q.hospitalId,
          hospitalName: q.hospitalName,
          baseToken: q.baseToken || q.tokenNumber,
          tokenNumber: q.tokenNumber || q.baseToken,
          queuePosition: q.queuePosition,
          triageLevel: q.triageLevel,
          missedCalls: q.missedCalls,
          time: q.time,
          priority: q.priority
        }));
      }

      set({
        nowServing: nowServingItem,
        currentServingId: nowServingItem ? nowServingItem.id : null,
        currentServingName: nowServingItem ? nowServingItem.name : null,
        currentServingPatientId: nowServingItem ? nowServingItem.patientId : null,
        queueList: waitingList
      });
    } catch (err) {
      console.error('Failed to fetch authoritative queue:', err);
    }
  },

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(API_BASE_URL, {
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

      // Refetch authoritative backend queue state on socket event
      const doctorId = get().activeDoctorId;
      const hospitalId = get().activeHospitalId;
      if (doctorId && (event.topic === 'lifefile.queue.updates' || event.topic === 'scos.queue.updates')) {
        const { action } = event.data;
        if (['ADD_TO_QUEUE', 'CALL_NEXT', 'SKIP_PATIENT', 'CONSULTATION_COMPLETE'].includes(action)) {
          get().fetchQueue(doctorId, hospitalId);
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

  callNext: async (doctorId: string, hospitalId?: string, hospitalName?: string, appointmentId?: string, patientId?: string) => {
    try {
      await callNextPatient({
        doctorId,
        patientId: patientId || '',
        appointmentId: appointmentId || '',
        hospitalId,
        hospitalName
      });
      await get().fetchQueue(doctorId, hospitalId);
    } catch (err) {
      console.error('[Queue] Call next failed:', err);
    }
  },

  completeConsult: async (doctorId: string, appointmentId: string) => {
    try {
      await apiCompleteConsultation({
        doctorId,
        patientId: '',
        appointmentId
      });
      await get().fetchQueue(doctorId, get().activeHospitalId);
    } catch (err) {
      console.error('[Queue] Complete consultation failed:', err);
    }
  },

  skipAppt: async (doctorId: string, appointmentId: string) => {
    try {
      await apiSkipPatient({
        doctorId,
        patientId: '',
        appointmentId
      });
      await get().fetchQueue(doctorId, get().activeHospitalId);
    } catch (err) {
      console.error('[Queue] Skip appointment failed:', err);
    }
  }
}));

export default useStreamingStore;
