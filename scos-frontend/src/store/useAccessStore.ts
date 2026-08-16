import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccessState {
  // Mapping: patientId -> doctorId -> boolean (hasAccess)
  permissions: Record<string, Record<string, boolean>>;
  toggleAccess: (patientId: string, doctorId: string, hasAccess: boolean) => void;
  checkAccess: (patientId: string, doctorId: string) => boolean;
}

const useAccessStore = create<AccessState>()(
  persist(
    (set, get) => ({
      permissions: {},
      toggleAccess: (patientId, doctorId, hasAccess) => set((state) => ({
        permissions: {
          ...state.permissions,
          [patientId]: {
            ...(state.permissions[patientId] || {}),
            [doctorId]: hasAccess
          }
        }
      })),
      checkAccess: (patientId, doctorId) => {
        const patientPerms = get().permissions[patientId];
        // Default to false if not explicitly granted
        return patientPerms ? !!patientPerms[doctorId] : false;
      }
    }),
    {
      name: 'scos-access-storage', // Persist to localStorage
    }
  )
);

export default useAccessStore;
