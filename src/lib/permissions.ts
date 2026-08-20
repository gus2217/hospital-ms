import { useMemo } from 'react'
import { Permission, UserRole } from '@/types'
import { useAuthStore } from '@/store/authStore'

/**
 * Role → permission mapping. Admin holds every permission.
 * Components and route guards must check permissions — never roles directly.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.Admin]: Object.values(Permission),
  [UserRole.Doctor]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.MANAGE_APPOINTMENTS,
    Permission.CANCEL_APPOINTMENTS,
    Permission.VIEW_MEDICAL_RECORDS,
    Permission.MANAGE_MEDICAL_RECORDS,
    Permission.CREATE_CONSULTATION,
    Permission.VIEW_CONSULTATION,
    Permission.VIEW_DOCTORS,
    Permission.VIEW_PHARMACY,
    Permission.CREATE_PRESCRIPTION,
    Permission.VIEW_LAB,
    Permission.ORDER_LAB_TEST,
    Permission.VIEW_WARDS,
    Permission.MANAGE_TREATMENT_PLANS,
  ],
  [UserRole.Pharmacist]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PATIENTS,
    Permission.VIEW_PHARMACY,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_DRUG_TRACKING,
    Permission.DISPENSE_PRESCRIPTION,
    Permission.CANCEL_PRESCRIPTION,
    Permission.VIEW_BILLING,
    Permission.RECORD_PAYMENT,
    Permission.MANAGE_INVOICES,
  ],
  [UserRole.Receptionist]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PATIENTS,
    Permission.MANAGE_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.MANAGE_APPOINTMENTS,
    Permission.CANCEL_APPOINTMENTS,
    Permission.VIEW_BILLING,
    Permission.RECORD_PAYMENT,
    Permission.MANAGE_INVOICES,
  ],
  [UserRole.Nurse]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.MANAGE_APPOINTMENTS,
    Permission.VIEW_MEDICAL_RECORDS,
    Permission.VIEW_WARDS,
    Permission.MANAGE_ADMISSIONS,
    Permission.UPDATE_NURSING_NOTES,
  ],
  [UserRole.LabTechnician]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.VIEW_LAB,
    Permission.MANAGE_LAB_TESTS,
  ],
  [UserRole.Patient]: [Permission.VIEW_DASHBOARD, Permission.PATIENT_SELF_SERVICE],
}

export function permissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return permissionsForRole(role).includes(permission)
}

/** React hook — re-renders when the signed-in user's role changes. */
export function usePermission(permission: Permission): boolean {
  const role = useAuthStore((s) => s.currentUser?.role)
  return useMemo(() => hasPermission(role, permission), [role, permission])
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.VIEW_DASHBOARD]: 'View dashboard',
  [Permission.VIEW_PATIENTS]: 'View patients',
  [Permission.MANAGE_PATIENTS]: 'Manage patients',
  [Permission.VIEW_APPOINTMENTS]: 'View appointments',
  [Permission.MANAGE_APPOINTMENTS]: 'Manage appointments',
  [Permission.CANCEL_APPOINTMENTS]: 'Cancel appointments',
  [Permission.VIEW_MEDICAL_RECORDS]: 'View medical records',
  [Permission.MANAGE_MEDICAL_RECORDS]: 'Manage medical records',
  [Permission.CREATE_CONSULTATION]: 'Run consultations',
  [Permission.VIEW_CONSULTATION]: 'Consultation queue',
  [Permission.VIEW_DOCTORS]: 'View doctors',
  [Permission.MANAGE_DOCTORS]: 'Manage doctors',
  [Permission.VIEW_PHARMACY]: 'View pharmacy',
  [Permission.MANAGE_INVENTORY]: 'Manage inventory',
  [Permission.VIEW_DRUG_TRACKING]: 'Pharmacy tracking',
  [Permission.CREATE_PRESCRIPTION]: 'Create prescriptions',
  [Permission.DISPENSE_PRESCRIPTION]: 'Dispense prescriptions',
  [Permission.CANCEL_PRESCRIPTION]: 'Cancel prescriptions',
  [Permission.VIEW_BILLING]: 'View billing',
  [Permission.RECORD_PAYMENT]: 'Record payments',
  [Permission.MANAGE_INVOICES]: 'Manage invoices',
  [Permission.VIEW_LAB]: 'View laboratory',
  [Permission.ORDER_LAB_TEST]: 'Order lab tests',
  [Permission.MANAGE_LAB_TESTS]: 'Manage lab results',
  [Permission.VIEW_WARDS]: 'View wards',
  [Permission.MANAGE_ADMISSIONS]: 'Manage admissions',
  [Permission.UPDATE_NURSING_NOTES]: 'Update nursing notes',
  [Permission.MANAGE_TREATMENT_PLANS]: 'Manage treatment plans',
  [Permission.VIEW_STAFF]: 'View staff',
  [Permission.MANAGE_STAFF]: 'Manage staff',
  [Permission.MANAGE_LEAVE]: 'Manage leave',
  [Permission.MANAGE_SHIFTS]: 'Manage shifts',
  [Permission.MANAGE_PERFORMANCE]: 'Performance appraisals',
  [Permission.VIEW_AUDIT_LOGS]: 'View audit logs',
  [Permission.VIEW_REPORTS]: 'View reports',
  [Permission.EXPORT_DATA]: 'Export data',
  [Permission.PATIENT_SELF_SERVICE]: 'Patient portal',
}
