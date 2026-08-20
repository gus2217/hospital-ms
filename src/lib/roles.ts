import { UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrator',
  [UserRole.Doctor]: 'Doctor',
  [UserRole.Pharmacist]: 'Pharmacist',
  [UserRole.Receptionist]: 'Receptionist',
  [UserRole.Nurse]: 'Nurse',
  [UserRole.LabTechnician]: 'Lab Technician',
  [UserRole.RecordsOfficer]: 'Records Officer',
  [UserRole.Cashier]: 'Cashier',
  [UserRole.StoreKeeper]: 'Store Keeper',
  [UserRole.Accountant]: 'Accountant',
  [UserRole.CEO]: 'Chief Executive Officer',
  [UserRole.Patient]: 'Patient',
}
