import { create } from 'zustand'
import type {
  Admission,
  Appointment,
  Doctor,
  Drug,
  Invoice,
  InvoiceItem,
  LabTest,
  MedicalRecord,
  Patient,
  Payment,
  Prescription,
  StaffRecord,
  TriageRecord,
  User,
  Ward,
} from '@/types'
import {
  AdmissionStatus,
  AppointmentStatus,
  InvoiceStatus,
  LabTestStatus,
  PrescriptionStatus,
  UserRole,
} from '@/types'
import {
  mockAdmissions,
  mockAppointments,
  mockDoctors,
  mockDrugs,
  mockInvoices,
  mockLabTests,
  mockMedicalRecords,
  mockPatients,
  mockPayments,
  mockPrescriptions,
  mockStaff,
  mockStaffRecords,
  mockTriageRecords,
  mockWards,
} from '@/data/mock'
import { useAuditStore } from '@/store/auditStore'
import { useAuthStore } from '@/store/authStore'

const TAX_RATE = 0.16

function nextId(prefix: string, items: { id: string }[]): string {
  const max = items.reduce((acc, item) => {
    const num = parseInt(item.id.replace(prefix + '-', ''), 10)
    return Number.isNaN(num) ? acc : Math.max(acc, num)
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

/** SRS — sequential facility patient number, e.g. PT-2026-0007. */
function nextPatientNumber(patients: Patient[]): string {
  const year = new Date().getFullYear()
  const max = patients.reduce((acc, p) => {
    const match = p.patientNumber?.match(/(\d+)$/)
    const num = match ? parseInt(match[1], 10) : 0
    return Number.isNaN(num) ? acc : Math.max(acc, num)
  }, 0)
  return `PT-${year}-${String(max + 1).padStart(4, '0')}`
}

function computeTotals(items: InvoiceItem[]): {
  subTotal: number
  tax: number
  totalAmount: number
} {
  const subTotal = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const tax = Math.round(subTotal * TAX_RATE * 100) / 100
  return { subTotal, tax, totalAmount: Math.round((subTotal + tax) * 100) / 100 }
}

/** Resolve the signed-in user id for audit trails (falls back to 'system'). */
function currentUserId(): string {
  return useAuthStore.getState().currentUser?.id ?? 'system'
}

export interface CompleteConsultationInput {
  diagnosis: string
  treatmentPlan: string
  clinicalNotes: string
  consultationFee?: number
  feeCurrency?: string
  prescription?: {
    items: { drugId: string; quantity: number; dosageInstructions: string }[]
  }
  labTests?: { testName: string; testCategory: string }[]
}

export interface CreateConsultationInput {
  patientId: string
  doctorId: string
  diagnosis: string
  treatmentPlan: string
  clinicalNotes: string
  consultationFee?: number
  feeCurrency?: string
  prescription?: CompleteConsultationInput['prescription']
  labTests?: CompleteConsultationInput['labTests']
}

/**
 * Shared post-record work for consultations: fee invoice, prescription,
 * lab orders and audit trail. Used by both appointment-based and direct
 * (walk-in) consultation creation.
 */
function finalizeConsultation(
  get: () => HospitalState,
  record: MedicalRecord,
  input: {
    consultationFee?: number
    feeCurrency?: string
    prescription?: { items: { drugId: string; quantity: number; dosageInstructions: string }[] }
    labTests?: { testName: string; testCategory: string }[]
  },
) {
  const state = get()

  // Consultation fee → auto-invoice
  if (input.consultationFee && input.consultationFee > 0) {
    const feeItem: InvoiceItem = {
      id: nextId('INVI', state.invoices.flatMap((i) => i.items)),
      description: 'Consultation fee',
      quantity: 1,
      unitPrice: input.consultationFee,
      totalPrice: input.consultationFee,
      sourceReferenceId: record.id,
      sourceType: 'Consultation',
    }
    state.addInvoice({
      patientId: record.patientId,
      issuedDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      amountPaid: 0,
      status: InvoiceStatus.Issued,
      items: [feeItem],
    })
  }

  // Prescription
  if (input.prescription && input.prescription.items.length > 0) {
    state.addPrescription({
      medicalRecordId: record.id,
      issuedAt: new Date().toISOString(),
      status: PrescriptionStatus.Ordered,
      items: input.prescription.items.map((item) => ({
        ...item,
        id: nextId('RXI', get().prescriptions.flatMap((p) => p.items)),
      })),
    })
  }

  // Lab tests ordered during consultation
  for (const test of input.labTests ?? []) {
    state.addLabTest({
      patientId: record.patientId,
      doctorId: record.doctorId,
      appointmentId: record.appointmentId,
      testName: test.testName,
      testCategory: test.testCategory,
    })
  }

  useAuditStore.getState().logAudit({
    userId: currentUserId(),
    action: 'CREATE_MEDICAL_RECORD',
    entityType: 'MedicalRecord',
    entityId: record.id,
    changes: `Consultation completed for ${record.patientId}${
      input.consultationFee ? ` — fee KES ${input.consultationFee}` : ''
    }`,
  })
}

export interface AdmitPatientInput {
  patientId: string
  wardId: string
  admittingDoctorId?: string
  diagnosis: string
  expectedDischargeDate?: string
  notes?: string
}

interface HospitalState {
  patients: Patient[]
  doctors: Doctor[]
  staff: User[]
  appointments: Appointment[]
  medicalRecords: MedicalRecord[]
  drugs: Drug[]
  prescriptions: Prescription[]
  invoices: Invoice[]
  payments: Payment[]
  labTests: LabTest[]
  wards: Ward[]
  admissions: Admission[]
  staffRecords: StaffRecord[]
  triageRecords: TriageRecord[]

  // ---- Patients ----
  addPatient: (p: Omit<Patient, 'id' | 'role' | 'password' | 'patientNumber'>) => Patient
  updatePatient: (id: string, patch: Partial<Patient>) => void
  deletePatient: (id: string) => void

  // ---- Doctors ----
  addDoctor: (d: Omit<Doctor, 'id' | 'role' | 'password'>) => Doctor
  updateDoctor: (id: string, patch: Partial<Doctor>) => void
  deleteDoctor: (id: string) => void

  // ---- Appointments ----
  addAppointment: (a: Omit<Appointment, 'id'>) => Appointment
  updateAppointment: (id: string, patch: Partial<Appointment>) => void
  deleteAppointment: (id: string) => void
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void

  // ---- Medical records ----
  addMedicalRecord: (r: Omit<MedicalRecord, 'id' | 'version'>) => MedicalRecord
  updateMedicalRecord: (id: string, patch: Partial<MedicalRecord>) => void
  deleteMedicalRecord: (id: string) => void
  /** Booking → Consultation: completes an appointment and writes a medical record (+ optional prescription, fee invoice and lab orders). */
  completeConsultation: (
    appointmentId: string,
    doctorId: string,
    input: CompleteConsultationInput,
  ) => MedicalRecord | undefined
  /** Direct / walk-in consultation without an appointment. */
  createConsultation: (input: CreateConsultationInput) => MedicalRecord

  // ---- Drugs ----
  addDrug: (d: Omit<Drug, 'id'>) => Drug
  updateDrug: (id: string, patch: Partial<Drug>) => void
  deleteDrug: (id: string) => void
  restockDrug: (id: string, quantity: number) => void

  // ---- Prescriptions ----
  addPrescription: (p: Omit<Prescription, 'id'>) => Prescription
  updatePrescription: (id: string, patch: Partial<Prescription>) => void
  deletePrescription: (id: string) => void
  /** Pharmacy dispensing: marks dispensed, decrements stock, and generates a billing invoice. */
  dispensePrescription: (id: string, pharmacistId: string) => void
  cancelPrescription: (id: string) => void

  // ---- Invoices ----
  addInvoice: (inv: Omit<Invoice, 'id' | 'subTotal' | 'tax' | 'totalAmount'>) => Invoice
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  issueInvoice: (id: string) => void

  // ---- Payments ----
  addPayment: (pay: Omit<Payment, 'id'>) => Payment
  deletePayment: (id: string) => void
  recordPayment: (invoiceId: string, amount: number, method: string) => Payment | undefined

  // ---- Laboratory ----
  addLabTest: (t: Omit<LabTest, 'id' | 'status' | 'orderedAt'>) => LabTest
  updateLabTest: (id: string, patch: Partial<LabTest>) => void
  deleteLabTest: (id: string) => void

  // ---- Wards & admissions ----
  addWard: (w: Omit<Ward, 'id'>) => Ward
  updateWard: (id: string, patch: Partial<Ward>) => void
  admitPatient: (input: AdmitPatientInput) => Admission | undefined
  updateAdmission: (id: string, patch: Partial<Admission>) => void
  dischargeAdmission: (id: string) => void

  // ---- Staff records ----
  addStaffRecord: (r: Omit<StaffRecord, 'id'> & { id: string }) => void
  updateStaffRecord: (id: string, patch: Partial<StaffRecord>) => void

  // ---- Triage ----
  addTriageRecord: (t: Omit<TriageRecord, 'id' | 'triagedAt' | 'triagedBy'>) => TriageRecord

  resetDemo: () => void
}

export const useHospitalStore = create<HospitalState>()((set, get) => ({
  patients: mockPatients,
  doctors: mockDoctors,
  staff: mockStaff,
  appointments: mockAppointments,
  medicalRecords: mockMedicalRecords,
  drugs: mockDrugs,
  prescriptions: mockPrescriptions,
  invoices: mockInvoices,
  payments: mockPayments,
  labTests: mockLabTests,
  wards: mockWards,
  admissions: mockAdmissions,
  staffRecords: mockStaffRecords,
  triageRecords: mockTriageRecords,

  // ---------------- Patients ----------------
  addPatient: (p) => {
    const patient: Patient = {
      ...p,
      id: nextId('PAT', get().patients),
      patientNumber: nextPatientNumber(get().patients),
      role: UserRole.Patient,
      password: 'patient123',
    }
    set((s) => ({ patients: [patient, ...s.patients] }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'CREATE_PATIENT',
      entityType: 'Patient',
      entityId: patient.id,
      changes: `${patient.firstName} ${patient.lastName} registered`,
    })
    return patient
  },
  updatePatient: (id, patch) =>
    set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  deletePatient: (id) =>
    set((s) => ({
      patients: s.patients.filter((p) => p.id !== id),
      appointments: s.appointments.filter((a) => a.patientId !== id),
      invoices: s.invoices.filter((i) => i.patientId !== id),
    })),

  // ---------------- Doctors ----------------
  addDoctor: (d) => {
    const doctor: Doctor = {
      ...d,
      id: nextId('DOC', get().doctors),
      role: UserRole.Doctor,
      password: 'doctor123',
    }
    set((s) => ({ doctors: [doctor, ...s.doctors] }))
    return doctor
  },
  updateDoctor: (id, patch) =>
    set((s) => ({ doctors: s.doctors.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  deleteDoctor: (id) =>
    set((s) => ({
      doctors: s.doctors.filter((d) => d.id !== id),
      appointments: s.appointments.map((a) =>
        a.doctorId === id ? { ...a, status: AppointmentStatus.Cancelled } : a,
      ),
    })),

  // ---------------- Appointments ----------------
  addAppointment: (a) => {
    const appointment: Appointment = { ...a, id: nextId('APT', get().appointments) }
    set((s) => ({ appointments: [appointment, ...s.appointments] }))
    return appointment
  },
  updateAppointment: (id, patch) =>
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  deleteAppointment: (id) =>
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),
  setAppointmentStatus: (id, status) =>
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  // ---------------- Medical records ----------------
  addMedicalRecord: (r) => {
    const record: MedicalRecord = { ...r, id: nextId('MR', get().medicalRecords), version: 1 }
    set((s) => ({
      medicalRecords: [record, ...s.medicalRecords],
      appointments: s.appointments.map((a) =>
        a.id === r.appointmentId ? { ...a, medicalRecordId: record.id } : a,
      ),
    }))
    return record
  },
  updateMedicalRecord: (id, patch) =>
    set((s) => ({
      medicalRecords: s.medicalRecords.map((r) =>
        r.id === id ? { ...r, ...patch, version: r.version + 1 } : r,
      ),
    })),
  deleteMedicalRecord: (id) =>
    set((s) => ({ medicalRecords: s.medicalRecords.filter((r) => r.id !== id) })),

  completeConsultation: (appointmentId, doctorId, input) => {
    const state = get()
    const appointment = state.appointments.find((a) => a.id === appointmentId)
    if (!appointment) return undefined

    const record = state.addMedicalRecord({
      patientId: appointment.patientId,
      doctorId,
      appointmentId,
      diagnosis: input.diagnosis,
      treatmentPlan: input.treatmentPlan,
      clinicalNotes: input.clinicalNotes,
      recordedAt: new Date().toISOString(),
      consultationFee: input.consultationFee,
      feeCurrency: input.feeCurrency ?? 'KES',
    })

    state.setAppointmentStatus(appointmentId, AppointmentStatus.Completed)
    finalizeConsultation(get, record, input)
    return record
  },

  createConsultation: (input) => {
    const state = get()
    const record = state.addMedicalRecord({
      patientId: input.patientId,
      doctorId: input.doctorId,
      appointmentId: undefined,
      diagnosis: input.diagnosis,
      treatmentPlan: input.treatmentPlan,
      clinicalNotes: input.clinicalNotes,
      recordedAt: new Date().toISOString(),
      consultationFee: input.consultationFee,
      feeCurrency: input.feeCurrency ?? 'KES',
    })
    finalizeConsultation(get, record, input)
    return record
  },

  // ---------------- Drugs ----------------
  addDrug: (d) => {
    const drug: Drug = { ...d, id: nextId('DRG', get().drugs) }
    set((s) => ({ drugs: [drug, ...s.drugs] }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'ADD_DRUG',
      entityType: 'Drug',
      entityId: drug.id,
      changes: `${drug.name} added (${drug.stockQuantity} units)`,
    })
    return drug
  },
  updateDrug: (id, patch) => {
    set((s) => ({ drugs: s.drugs.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'UPDATE_DRUG',
      entityType: 'Drug',
      entityId: id,
      changes: JSON.stringify(patch),
    })
  },
  deleteDrug: (id) => {
    const inUse = get().prescriptions.some((p) => p.items.some((i) => i.drugId === id))
    if (inUse) return
    set((s) => ({ drugs: s.drugs.filter((d) => d.id !== id) }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'DELETE_DRUG',
      entityType: 'Drug',
      entityId: id,
    })
  },
  restockDrug: (id, quantity) => {
    set((s) => ({
      drugs: s.drugs.map((d) =>
        d.id === id ? { ...d, stockQuantity: d.stockQuantity + quantity } : d,
      ),
    }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'RESTOCK_DRUG',
      entityType: 'Drug',
      entityId: id,
      changes: `+${quantity} units`,
    })
  },

  // ---------------- Prescriptions ----------------
  addPrescription: (p) => {
    const prescription: Prescription = { ...p, id: nextId('RX', get().prescriptions) }
    set((s) => ({ prescriptions: [prescription, ...s.prescriptions] }))
    return prescription
  },
  updatePrescription: (id, patch) =>
    set((s) => ({
      prescriptions: s.prescriptions.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  deletePrescription: (id) =>
    set((s) => ({ prescriptions: s.prescriptions.filter((p) => p.id !== id) })),
  cancelPrescription: (id) =>
    set((s) => ({
      prescriptions: s.prescriptions.map((p) =>
        p.id === id ? { ...p, status: PrescriptionStatus.Cancelled } : p,
      ),
    })),

  dispensePrescription: (id, pharmacistId) => {
    const state = get()
    const prescription = state.prescriptions.find((p) => p.id === id)
    if (!prescription || prescription.status !== PrescriptionStatus.Ordered) return

    const record = state.medicalRecords.find((r) => r.id === prescription.medicalRecordId)
    if (!record) return

    const items: InvoiceItem[] = prescription.items.map((item) => {
      const drug = state.drugs.find((d) => d.id === item.drugId)
      const unitPrice = drug?.unitPrice ?? 0
      return {
        id: nextId('INVI', state.invoices.flatMap((i) => i.items)),
        description: drug ? `${drug.name} × ${item.quantity}` : `Medication × ${item.quantity}`,
        quantity: item.quantity,
        unitPrice,
        totalPrice: Math.round(unitPrice * item.quantity * 100) / 100,
        sourceReferenceId: prescription.id,
        sourceType: 'Prescription',
      }
    })

    // Decrement stock
    set((s) => ({
      drugs: s.drugs.map((drug) => {
        const item = prescription.items.find((i) => i.drugId === drug.id)
        return item ? { ...drug, stockQuantity: Math.max(0, drug.stockQuantity - item.quantity) } : drug
      }),
      prescriptions: s.prescriptions.map((p) =>
        p.id === id
          ? { ...p, status: PrescriptionStatus.Dispensed, dispensedAt: new Date().toISOString(), pharmacistId }
          : p,
      ),
    }))

    // Generate billing invoice from dispensed items
    const totals = computeTotals(items)
    state.addInvoice({
      patientId: record.patientId,
      issuedDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      amountPaid: 0,
      status: InvoiceStatus.Issued,
      items,
      ...totals,
    })

    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'DISPENSE_PRESCRIPTION',
      entityType: 'Prescription',
      entityId: id,
      changes: `Dispensed by ${pharmacistId}; invoice issued for ${record.patientId}`,
    })
  },

  // ---------------- Invoices ----------------
  addInvoice: (inv) => {
    const totals = computeTotals(inv.items)
    const invoice: Invoice = {
      ...inv,
      ...totals,
      id: nextId('INV', get().invoices),
    }
    set((s) => ({ invoices: [invoice, ...s.invoices] }))
    return invoice
  },
  updateInvoice: (id, patch) =>
    set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  deleteInvoice: (id) =>
    set((s) => ({
      invoices: s.invoices.filter((i) => i.id !== id),
      payments: s.payments.filter((p) => p.invoiceId !== id),
    })),
  issueInvoice: (id) =>
    set((s) => ({
      invoices: s.invoices.map((i) =>
        i.id === id && i.status === InvoiceStatus.Draft ? { ...i, status: InvoiceStatus.Issued } : i,
      ),
    })),

  // ---------------- Payments ----------------
  addPayment: (pay) => {
    const payment: Payment = { ...pay, id: nextId('PAY', get().payments) }
    set((s) => ({ payments: [payment, ...s.payments] }))
    return payment
  },
  deletePayment: (id) => {
    const payment = get().payments.find((p) => p.id === id)
    if (!payment) return
    set((s) => ({
      payments: s.payments.filter((p) => p.id !== id),
      invoices: s.invoices.map((inv) => {
        if (inv.id !== payment.invoiceId) return inv
        const amountPaid = Math.max(0, inv.amountPaid - payment.amount)
        const status =
          amountPaid <= 0 ? InvoiceStatus.Issued : amountPaid < inv.totalAmount ? inv.status : InvoiceStatus.Paid
        return { ...inv, amountPaid, status }
      }),
    }))
  },

  recordPayment: (invoiceId, amount, method) => {
    const state = get()
    const invoice = state.invoices.find((i) => i.id === invoiceId)
    if (!invoice) return undefined

    const payment = state.addPayment({
      invoiceId,
      amount,
      paymentDate: new Date().toISOString(),
      paymentMethod: method,
      transactionId: `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    })

    const amountPaid = Math.round((invoice.amountPaid + amount) * 100) / 100
    const status =
      amountPaid >= invoice.totalAmount
        ? InvoiceStatus.Paid
        : invoice.status === InvoiceStatus.Paid
          ? InvoiceStatus.Paid
          : InvoiceStatus.Issued

    state.updateInvoice(invoiceId, { amountPaid, status })

    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'RECORD_PAYMENT',
      entityType: 'Invoice',
      entityId: invoiceId,
      changes: `KES ${amount} via ${method} — invoice ${status}`,
    })
    return payment
  },

  // ---------------- Laboratory ----------------
  addLabTest: (t) => {
    const test: LabTest = {
      ...t,
      id: nextId('LT', get().labTests),
      status: LabTestStatus.Ordered,
      orderedAt: new Date().toISOString(),
    }
    set((s) => ({ labTests: [test, ...s.labTests] }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'ORDER_LAB_TEST',
      entityType: 'LabTest',
      entityId: test.id,
      changes: `${test.testName} (${test.testCategory}) ordered for ${test.patientId}`,
    })
    return test
  },
  updateLabTest: (id, patch) => {
    const existing = get().labTests.find((t) => t.id === id)
    set((s) => ({
      labTests: s.labTests.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              ...(patch.status === LabTestStatus.Completed && !t.completedAt
                ? { completedAt: new Date().toISOString(), performedBy: currentUserId() }
                : {}),
            }
          : t,
      ),
    }))
    if (existing && patch.status === LabTestStatus.Completed) {
      useAuditStore.getState().logAudit({
        userId: currentUserId(),
        action: 'UPDATE_LAB_RESULT',
        entityType: 'LabTest',
        entityId: id,
        changes: `Result entered — ${patch.result ?? 'completed'}${patch.isAbnormal ? ' (abnormal)' : ''}`,
      })
    }
  },
  deleteLabTest: (id) =>
    set((s) => ({ labTests: s.labTests.filter((t) => t.id !== id) })),

  // ---------------- Wards & admissions ----------------
  addWard: (w) => {
    const ward: Ward = { ...w, id: nextId('WRD', get().wards) }
    set((s) => ({ wards: [ward, ...s.wards] }))
    return ward
  },
  updateWard: (id, patch) =>
    set((s) => ({ wards: s.wards.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

  admitPatient: (input) => {
    const state = get()
    const ward = state.wards.find((w) => w.id === input.wardId)
    if (!ward) return undefined

    const active = state.admissions.filter(
      (a) => a.wardId === input.wardId && a.status === AdmissionStatus.Active,
    )
    const usedBeds = new Set(active.map((a) => a.bedNumber))
    if (usedBeds.size >= ward.totalBeds) return undefined

    let bedNumber = 1
    while (usedBeds.has(bedNumber)) bedNumber += 1

    const admission: Admission = {
      id: nextId('ADM', state.admissions),
      patientId: input.patientId,
      wardId: input.wardId,
      bedNumber,
      admittedAt: new Date().toISOString(),
      expectedDischargeDate: input.expectedDischargeDate,
      status: AdmissionStatus.Active,
      admittingDoctorId: input.admittingDoctorId,
      diagnosis: input.diagnosis,
      notes: input.notes,
    }
    set((s) => ({ admissions: [admission, ...s.admissions] }))

    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'ADMIT_PATIENT',
      entityType: 'Admission',
      entityId: admission.id,
      changes: `${input.patientId} admitted to ${ward.name} bed ${bedNumber}`,
    })
    return admission
  },
  updateAdmission: (id, patch) => {
    set((s) => ({
      admissions: s.admissions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
    if (patch.notes) {
      useAuditStore.getState().logAudit({
        userId: currentUserId(),
        action: 'UPDATE_NURSING_NOTES',
        entityType: 'Admission',
        entityId: id,
        changes: 'Nursing notes updated',
      })
    }
  },
  dischargeAdmission: (id) => {
    set((s) => ({
      admissions: s.admissions.map((a) =>
        a.id === id
          ? { ...a, status: AdmissionStatus.Discharged, actualDischargeDate: new Date().toISOString() }
          : a,
      ),
    }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'DISCHARGE_PATIENT',
      entityType: 'Admission',
      entityId: id,
      changes: 'Patient discharged — bed released',
    })
  },

  // ---------------- Staff records ----------------
  addStaffRecord: (r) =>
    set((s) => ({ staffRecords: [r as StaffRecord, ...s.staffRecords] })),
  updateStaffRecord: (id, patch) =>
    set((s) => ({
      staffRecords: s.staffRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),

  // ---------------- Triage ----------------
  addTriageRecord: (t) => {
    const record: TriageRecord = {
      ...t,
      id: nextId('TR', get().triageRecords),
      triagedAt: new Date().toISOString(),
      triagedBy: currentUserId(),
    }
    set((s) => ({ triageRecords: [record, ...s.triageRecords] }))
    useAuditStore.getState().logAudit({
      userId: currentUserId(),
      action: 'TRIAGE_COMPLETED',
      entityType: 'TriageRecord',
      entityId: record.id,
      changes: `${t.patientId} triaged as ${t.triageLevel}`,
    })
    return record
  },

  resetDemo: () =>
    set({
      patients: mockPatients,
      doctors: mockDoctors,
      staff: mockStaff,
      appointments: mockAppointments,
      medicalRecords: mockMedicalRecords,
      drugs: mockDrugs,
      prescriptions: mockPrescriptions,
      invoices: mockInvoices,
      payments: mockPayments,
      labTests: mockLabTests,
      wards: mockWards,
      admissions: mockAdmissions,
      staffRecords: mockStaffRecords,
      triageRecords: mockTriageRecords,
    }),
}))
