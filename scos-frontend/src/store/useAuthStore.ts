import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
}

type Role = 'patient' | 'doctor' | 'admin' | null;

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role;
  setAuth: (user: User, token: string, role: Role) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      
      setAuth: (user, token, role) => set({ user, token, role }),
      
      logout: () => set({ user: null, token: null, role: null }),
      
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'scos-auth-storage', // unique name for localStorage key
    }
  )
);

export default useAuthStore;
