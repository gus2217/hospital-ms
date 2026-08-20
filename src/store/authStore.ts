import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { UserRole } from '@/types'
import { mockDoctors, mockStaff } from '@/data/mock'

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  role: UserRole
  password: string
}

export type AuthResult = { ok: boolean; error?: string }

interface AuthState {
  /** All accounts that can sign in (staff + doctors). New registrations are added here. */
  users: User[]
  currentUser: User | null
  login: (email: string, password: string) => AuthResult
  register: (input: RegisterInput) => AuthResult
  logout: () => void
}

/** Seeded accounts: staff + doctors. Patients are not part of the staff console. */
const seededUsers: User[] = [...mockStaff, ...mockDoctors]

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: seededUsers,
      currentUser: null,

      login: (email, password) => {
        const user = get().users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
        )
        if (!user) {
          return { ok: false, error: 'No account found with that email.' }
        }
        if (user.password !== password) {
          return { ok: false, error: 'Incorrect password. Please try again.' }
        }
        set({ currentUser: user })
        return { ok: true }
      },

      register: (input) => {
        const users = get().users
        const exists = users.some(
          (u) => u.email.toLowerCase() === input.email.trim().toLowerCase(),
        )
        if (exists) {
          return { ok: false, error: 'An account with that email already exists.' }
        }

        const max = users.reduce((acc, u) => {
          const num = parseInt(u.id.replace('STF-', ''), 10)
          return Number.isNaN(num) ? acc : Math.max(acc, num)
        }, 0)

        const user: User = {
          id: `STF-${String(max + 1).padStart(3, '0')}`,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email.trim().toLowerCase(),
          phoneNumber: input.phoneNumber?.trim() || undefined,
          role: input.role,
          password: input.password,
        }

        set({ users: [user, ...users], currentUser: user })
        return { ok: true }
      },

      logout: () => set({ currentUser: null }),
    }),
    {
      name: 'medicore-auth',
      partialize: (state) => ({ users: state.users, currentUser: state.currentUser }),
    },
  ),
)
