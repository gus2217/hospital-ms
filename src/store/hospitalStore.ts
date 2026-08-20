import { create } from 'zustand'
import type {
  Appointment,
  Doctor,
  Drug,
  Invoice,
  InvoiceItem,
  MedicalRecord,
  Patient,
  Payment,
  Prescription,
  User,
} from '@/types'
import {
  AppointmentStatus,
  InvoiceStatus,
  PrescriptionStatus,
  UserRole,
} from '@/types'
import {
  mockAppointments,
  mockDoctors,
  mockDrugs,
  mockInvoices,
  mockMedicalRecords,
  mockPatients,
  mockPayments,
  mockPrescriptions,
  mockStaff,
} from '@/data/mock'

const TAX_RATE = 0.16

function nextId(prefix: string, items: { id: string }[]): string {
  const max = items.reduce((acc, item) => {
    const num = parseInt(item.id.replace(prefix + '-', ''), 10)
    return Number.isNaN(num) ? acc : Math.max(acc, num)
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
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

export interface CompleteConsultationInput {
  diagnosis: string
  treatmentPlan: string
  clinicalNotes: string
  prescription?: {
    items: { drugId: string; quantity: number; dosageInstructions: string }[]
  }
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

  // ---- Patients ----
  addPatient: (p: Omit<Patient, 'id' | 'role' | 'password'>) => Patient
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
  /** Booking → Consultation: completes an appointment and writes a medical record (+ optional prescription). */
  completeConsultation: (
    appointmentId: string,
    doctorId: string,
    input: CompleteConsultationInput,
  ) => MedicalRecord | undefined

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

  // ---------------- Patients ----------------
  addPatient: (p) => {
    const patient: Patient = {
      ...p,
      id: nextId('PAT', get().patients),
      role: UserRole.Patient,
      password: 'patient123',
    }
    set((s) => ({ patients: [patient, ...s.patients] }))
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
    })

    state.setAppointmentStatus(appointmentId, AppointmentStatus.Completed)

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
    return record
  },

  // ---------------- Drugs ----------------
  addDrug: (d) => {
    const drug: Drug = { ...d, id: nextId('DRG', get().drugs) }
    set((s) => ({ drugs: [drug, ...s.drugs] }))
    return drug
  },
  updateDrug: (id, patch) =>
    set((s) => ({ drugs: s.drugs.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  deleteDrug: (id) => {
    const inUse = get().prescriptions.some((p) => p.items.some((i) => i.drugId === id))
    if (inUse) return
    set((s) => ({ drugs: s.drugs.filter((d) => d.id !== id) }))
  },
  restockDrug: (id, quantity) =>
    set((s) => ({
      drugs: s.drugs.map((d) =>
        d.id === id ? { ...d, stockQuantity: d.stockQuantity + quantity } : d,
      ),
    })),

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
    return payment
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
    }),
}))
