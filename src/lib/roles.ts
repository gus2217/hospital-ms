import { UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrator',
  [UserRole.Doctor]: 'Doctor',
  [UserRole.Pharmacist]: 'Pharmacist',
  [UserRole.Receptionist]: 'Receptionist',
  [UserRole.Nurse]: 'Nurse',
  [UserRole.LabTechnician]: 'Lab Technician',
  [UserRole.Patient]: 'Patient',
}
