import { create } from 'zustand';

interface DoctorStore {
  activeHospitalId: string; // 'all', 'private', or specific hospitalId
  hospitals: { _id: string; name: string }[];
  setActiveHospitalId: (id: string) => void;
  setHospitals: (hospitals: { _id: string; name: string }[]) => void;
}

const useDoctorStore = create<DoctorStore>((set) => ({
  activeHospitalId: 'all',
  hospitals: [],
  setActiveHospitalId: (id) => set({ activeHospitalId: id }),
  setHospitals: (hospitals) => set({ hospitals }),
}));

export default useDoctorStore;
