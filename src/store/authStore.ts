import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { UserRole } from '@/types'
import { mockDoctors, mockPatients, mockStaff } from '@/data/mock'
import { useAuditStore } from '@/store/auditStore'

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

/**
 * Seeded accounts: staff + doctors + patients (patients get the self-service portal).
 */
const seededUsers: User[] = [...mockStaff, ...mockDoctors, ...mockPatients]

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
          useAuditStore.getState().logAudit({
            userId: 'unknown',
            action: 'FAILED_LOGIN',
            entityType: 'User',
            entityId: email.trim().toLowerCase(),
            changes: 'No account found',
            flagged: true,
          })
          return { ok: false, error: 'No account found with that email.' }
        }
        if (user.password !== password) {
          useAuditStore.getState().logAudit({
            userId: user.id,
            action: 'FAILED_LOGIN',
            entityType: 'User',
            entityId: user.id,
            changes: 'Incorrect password',
            flagged: true,
          })
          return { ok: false, error: 'Incorrect password. Please try again.' }
        }
        set({ currentUser: user })
        useAuditStore.getState().logAudit({
          userId: user.id,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          changes: 'Successful sign-in',
        })
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
      // v3: SRS roles (Records Officer, Cashier, Store Keeper, Accountant, CEO).
      name: 'medicore-auth-v3',
      partialize: (state) => ({ users: state.users, currentUser: state.currentUser }),
    },
  ),
)
