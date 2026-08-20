import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth, RequirePermission } from '@/components/auth/RequireAuth'
import { useAuthStore } from '@/store/authStore'
import { Permission, UserRole } from '@/types'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Appointments from '@/pages/Appointments'
import Patients from '@/pages/Patients'
import Doctors from '@/pages/Doctors'
import MedicalRecords from '@/pages/MedicalRecords'
import Pharmacy from '@/pages/Pharmacy'
import Billing from '@/pages/Billing'
import Lab from '@/pages/Lab'
import Wards from '@/pages/Wards'
import Staff from '@/pages/Staff'
import Reports from '@/pages/Reports'
import AuditLogs from '@/pages/AuditLogs'
import PharmacyTracking from '@/pages/PharmacyTracking'
import Patient360 from '@/pages/Patient360'
import Triage from '@/pages/Triage'
import Consultation from '@/pages/Consultation'
import PatientPortal from '@/pages/PatientPortal'

/** Keeps signed-in users away from the public login/register screens. */
function PublicOnly({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  if (currentUser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Patients land on their self-service portal instead of the staff dashboard. */
function DashboardRoute() {
  const role = useAuthStore((s) => s.currentUser?.role)
  if (role === UserRole.Patient) return <Navigate to="/portal" replace />
  return <Dashboard />
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
          <Route
            path="/dashboard"
            element={
              <RequirePermission permission={Permission.VIEW_DASHBOARD}>
                <DashboardRoute />
              </RequirePermission>
            }
          />
          <Route
            path="/appointments"
            element={
              <RequirePermission permission={Permission.VIEW_APPOINTMENTS}>
                <Appointments />
              </RequirePermission>
            }
          />
          <Route
            path="/patients"
            element={
              <RequirePermission permission={Permission.VIEW_PATIENTS}>
                <Patients />
              </RequirePermission>
            }
          />
          <Route
            path="/patient-360"
            element={
              <RequirePermission permission={Permission.VIEW_PATIENT_360}>
                <Patient360 />
              </RequirePermission>
            }
          />
          <Route
            path="/doctors"
            element={
              <RequirePermission permission={Permission.VIEW_DOCTORS}>
                <Doctors />
              </RequirePermission>
            }
          />
          <Route
            path="/records"
            element={
              <RequirePermission permission={Permission.VIEW_MEDICAL_RECORDS}>
                <MedicalRecords />
              </RequirePermission>
            }
          />
          <Route
            path="/consultation"
            element={
              <RequirePermission permission={Permission.VIEW_CONSULTATION}>
                <Consultation />
              </RequirePermission>
            }
          />
          <Route
            path="/triage"
            element={
              <RequirePermission permission={Permission.PERFORM_TRIAGE}>
                <Triage />
              </RequirePermission>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <RequirePermission permission={Permission.VIEW_PHARMACY}>
                <Pharmacy />
              </RequirePermission>
            }
          />
          <Route
            path="/pharmacy-tracking"
            element={
              <RequirePermission permission={Permission.VIEW_DRUG_TRACKING}>
                <PharmacyTracking />
              </RequirePermission>
            }
          />
          <Route
            path="/lab"
            element={
              <RequirePermission permission={Permission.VIEW_LAB}>
                <Lab />
              </RequirePermission>
            }
          />
          <Route
            path="/wards"
            element={
              <RequirePermission permission={Permission.VIEW_WARDS}>
                <Wards />
              </RequirePermission>
            }
          />
          <Route
            path="/billing"
            element={
              <RequirePermission permission={Permission.VIEW_BILLING}>
                <Billing />
              </RequirePermission>
            }
          />
          <Route
            path="/staff"
            element={
              <RequirePermission permission={Permission.VIEW_STAFF}>
                <Staff />
              </RequirePermission>
            }
          />
          <Route
            path="/reports"
            element={
              <RequirePermission permission={Permission.VIEW_REPORTS}>
                <Reports />
              </RequirePermission>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <RequirePermission permission={Permission.VIEW_AUDIT_LOGS}>
                <AuditLogs />
              </RequirePermission>
            }
          />
          <Route
            path="/portal"
            element={
              <RequirePermission permission={Permission.PATIENT_SELF_SERVICE}>
                <PatientPortal />
              </RequirePermission>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  )
}
