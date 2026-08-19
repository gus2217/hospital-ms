// ============================================================
// Domain models — mirror backend DTOs exactly.
// ============================================================

export enum UserRole {
  Admin = 'Admin',
  Doctor = 'Doctor',
  Pharmacist = 'Pharmacist',
  Receptionist = 'Receptionist',
  Patient = 'Patient',
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
  role: UserRole
  phoneNumber?: string
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
}

export interface Drug {
  id: string
  name: string
  genericName: string
  manufacturer: string
  unitPrice: number
  stockQuantity: number
  reorderLevel: number
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
