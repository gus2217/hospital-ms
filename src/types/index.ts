// ============================================================
// Domain models — mirror backend DTOs exactly.
// ============================================================

export enum UserRole {
  Admin = 'Admin',
  Doctor = 'Doctor',
  Pharmacist = 'Pharmacist',
  Receptionist = 'Receptionist',
  Nurse = 'Nurse',
  LabTechnician = 'LabTechnician',
  // Kept for the patient data model — patient records still carry this role.
  Patient = 'Patient',
}

/**
 * Fine-grained permissions. Roles map to a set of these in `lib/permissions`.
 * Route guards and UI elements must check permissions, never roles directly.
 */
export enum Permission {
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_PATIENTS = 'VIEW_PATIENTS',
  MANAGE_PATIENTS = 'MANAGE_PATIENTS',
  VIEW_APPOINTMENTS = 'VIEW_APPOINTMENTS',
  MANAGE_APPOINTMENTS = 'MANAGE_APPOINTMENTS',
  CANCEL_APPOINTMENTS = 'CANCEL_APPOINTMENTS',
  VIEW_MEDICAL_RECORDS = 'VIEW_MEDICAL_RECORDS',
  MANAGE_MEDICAL_RECORDS = 'MANAGE_MEDICAL_RECORDS',
  CREATE_CONSULTATION = 'CREATE_CONSULTATION',
  VIEW_CONSULTATION = 'VIEW_CONSULTATION',
  VIEW_DOCTORS = 'VIEW_DOCTORS',
  MANAGE_DOCTORS = 'MANAGE_DOCTORS',
  VIEW_PHARMACY = 'VIEW_PHARMACY',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  VIEW_DRUG_TRACKING = 'VIEW_DRUG_TRACKING',
  CREATE_PRESCRIPTION = 'CREATE_PRESCRIPTION',
  DISPENSE_PRESCRIPTION = 'DISPENSE_PRESCRIPTION',
  CANCEL_PRESCRIPTION = 'CANCEL_PRESCRIPTION',
  VIEW_BILLING = 'VIEW_BILLING',
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  MANAGE_INVOICES = 'MANAGE_INVOICES',
  VIEW_LAB = 'VIEW_LAB',
  ORDER_LAB_TEST = 'ORDER_LAB_TEST',
  MANAGE_LAB_TESTS = 'MANAGE_LAB_TESTS',
  VIEW_WARDS = 'VIEW_WARDS',
  MANAGE_ADMISSIONS = 'MANAGE_ADMISSIONS',
  UPDATE_NURSING_NOTES = 'UPDATE_NURSING_NOTES',
  MANAGE_TREATMENT_PLANS = 'MANAGE_TREATMENT_PLANS',
  VIEW_STAFF = 'VIEW_STAFF',
  MANAGE_STAFF = 'MANAGE_STAFF',
  MANAGE_LEAVE = 'MANAGE_LEAVE',
  MANAGE_SHIFTS = 'MANAGE_SHIFTS',
  MANAGE_PERFORMANCE = 'MANAGE_PERFORMANCE',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_DATA = 'EXPORT_DATA',
  PATIENT_SELF_SERVICE = 'PATIENT_SELF_SERVICE',
}

export enum LabTestStatus {
  Ordered = 'Ordered',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum AdmissionStatus {
  Active = 'Active',
  Discharged = 'Discharged',
  Cancelled = 'Cancelled',
}

export enum AppointmentStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  NoShow = 'NoShow',
}

export enum PrescriptionStatus {
  Ordered = 'Ordered',
  Dispensed = 'Dispensed',
  Cancelled = 'Cancelled',
}

export enum InvoiceStatus {
  Draft = 'Draft',
  Issued = 'Issued',
  Paid = 'Paid',
  Overdue = 'Overdue',
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  /** Plain-text password for mock/local authentication. */
  password: string
  role: UserRole
  phoneNumber?: string
  /** HR fields — present for staff accounts. */
  employeeId?: string
  department?: string
  hireDate?: string
}

export interface Patient extends User {
  dateOfBirth: string
  emergencyContact: string
  insurancePolicyNumber?: string
}

export interface Doctor extends User {
  specialization: string
  licenseNumber: string
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  scheduledStart: string
  scheduledEnd: string
  status: AppointmentStatus
  reasonForVisit: string
  medicalRecordId?: string
}

export interface MedicalRecord {
  id: string
  patientId: string
  doctorId: string
  appointmentId: string
  diagnosis: string
  treatmentPlan: string
  clinicalNotes: string
  recordedAt: string
  version: number
  /** Consultation fee charged for this record (KES). Auto-invoiced on completion. */
  consultationFee?: number
  feeCurrency?: string
}

export interface LabTest {
  id: string
  patientId: string
  doctorId: string
  appointmentId?: string
  testName: string
  testCategory: string
  orderedAt: string
  status: LabTestStatus
  result?: string
  resultFileUrl?: string
  completedAt?: string
  performedBy?: string
  notes?: string
  /** Clinical flag for the “abnormal results” dashboard widget. */
  isAbnormal?: boolean
}

export interface Ward {
  id: string
  name: string
  totalBeds: number
  /** Staff id of the nurse in charge. */
  nurseInCharge?: string
}

export interface Admission {
  id: string
  patientId: string
  wardId: string
  bedNumber: number
  admittedAt: string
  expectedDischargeDate?: string
  actualDischargeDate?: string
  status: AdmissionStatus
  admittingDoctorId?: string
  diagnosis: string
  notes?: string
}

export interface StaffShift {
  day: string
  shift: string
}

export interface StaffRecord {
  /** Matches the user id (STF-xxx / DOC-xxx). */
  id: string
  leaveBalance: number
  performanceRating?: number
  certifications: string[]
  shiftSchedule: StaffShift[]
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  changes?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
  /** True for suspicious activity (failed logins, off-hours access). */
  flagged?: boolean
}

export interface Drug {
  id: string
  name: string
  genericName: string
  manufacturer: string
  unitPrice: number
  stockQuantity: number
  reorderPoint: number
  category: string
  batchNumber: string
  expiryDate: string
}

export interface PrescriptionItem {
  id: string
  drugId: string
  quantity: number
  dosageInstructions: string
}

export interface Prescription {
  id: string
  medicalRecordId: string
  pharmacistId?: string
  issuedAt: string
  dispensedAt?: string
  status: PrescriptionStatus
  items: PrescriptionItem[]
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sourceReferenceId?: string
  sourceType?: string
}

export interface Invoice {
  id: string
  patientId: string
  issuedDate: string
  dueDate: string
  subTotal: number
  tax: number
  totalAmount: number
  amountPaid: number
  status: InvoiceStatus
  items: InvoiceItem[]
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: string
  transactionId?: string
}

export type AppointmentStatusFilter = AppointmentStatus | 'All'
