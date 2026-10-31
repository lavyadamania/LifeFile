import { create } from 'zustand';

export type DoctorMode = 'hospital' | 'private';

interface DoctorStore {
  /** 'all', 'private', 'hospital', or a specific hospitalId */
  activeHospitalId: string;
  /** Current UI mode — drives which dashboard panel is shown */
  mode: DoctorMode;
  hospitals: { _id: string; name: string }[];
  setActiveHospitalId: (id: string) => void;
  setMode: (mode: DoctorMode) => void;
  setHospitals: (hospitals: { _id: string; name: string }[]) => void;
}

const useDoctorStore = create<DoctorStore>((set) => ({
  // Keep the initial filter aligned with the initial Hospital mode. Leaving
  // this as "all" made the first queue load include private-clinic visits.
  activeHospitalId: 'hospital',
  mode: 'hospital',
  hospitals: [],
  setActiveHospitalId: (id) => set({ activeHospitalId: id }),
  setMode: (mode) => set({
    mode,
    activeHospitalId: mode === 'private' ? 'private' : 'hospital',
  }),
  setHospitals: (hospitals) => set({ hospitals }),
}));

export default useDoctorStore;
