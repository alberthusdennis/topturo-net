import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tokenManager } from '../lib/tokenManager';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'owner';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (user, token) => {
        // Write token to localStorage FIRST, synchronously
        tokenManager.set(token);
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        tokenManager.clear();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'el-matadore-auth',
      // Only persist user+auth state, token is kept separately in localStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Auto-logout when api.ts fires 401
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.getState().logout();
  });
}
