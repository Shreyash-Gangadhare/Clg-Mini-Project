import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      role: null,   // 'student' | 'staff'

      setAuth: ({ token, refreshToken, user, role }) => {
        set({ token, refreshToken, user, role })
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null, role: null })
      },

      isAuthenticated: () => !!get().token,

      isStudent: () => get().role === 'student',
      isStaff: () => get().role === 'staff',
    }),
    {
      name: 'campuseats-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        role: state.role,
      }),
    }
  )
)
