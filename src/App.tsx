import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth, RequireRole } from '@/components/auth/RequireAuth'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/types'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Appointments from '@/pages/Appointments'
import Patients from '@/pages/Patients'
import Doctors from '@/pages/Doctors'
import MedicalRecords from '@/pages/MedicalRecords'
import Pharmacy from '@/pages/Pharmacy'
import Billing from '@/pages/Billing'

/** Keeps signed-in users away from the public login/register screens. */
function PublicOnly({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  if (currentUser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <Register />
            </PublicOnly>
          }
        />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/appointments"
            element={
              <RequireRole roles={[UserRole.Admin, UserRole.Doctor, UserRole.Receptionist, UserRole.Nurse]}>
                <Appointments />
              </RequireRole>
            }
          />
          <Route
            path="/patients"
            element={
              <RequireRole roles={[UserRole.Admin, UserRole.Doctor, UserRole.Receptionist, UserRole.Nurse]}>
                <Patients />
              </RequireRole>
            }
          />
          <Route
            path="/doctors"
            element={
              <RequireRole roles={[UserRole.Admin, UserRole.Doctor]}>
                <Doctors />
              </RequireRole>
            }
          />
          <Route
            path="/records"
            element={
              <RequireRole roles={[UserRole.Admin, UserRole.Doctor, UserRole.Nurse]}>
                <MedicalRecords />
              </RequireRole>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <RequireRole roles={[UserRole.Admin, UserRole.Pharmacist]}>
                <Pharmacy />
              </RequireRole>
            }
          />
          <Route
            path="/billing"
            element={
              <RequireRole roles={[UserRole.Admin, UserRole.Receptionist]}>
                <Billing />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  )
}
