import { useMemo } from 'react'
import { useHospitalStore } from '@/store/hospitalStore'
import type { Appointment, Drug, Invoice, MedicalRecord, Prescription } from '@/types'

export function useEntityMaps() {
  const patients = useHospitalStore((s) => s.patients)
  const doctors = useHospitalStore((s) => s.doctors)
  const drugs = useHospitalStore((s) => s.drugs)
  const appointments = useHospitalStore((s) => s.appointments)
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)
  const prescriptions = useHospitalStore((s) => s.prescriptions)
  const invoices = useHospitalStore((s) => s.invoices)
  const payments = useHospitalStore((s) => s.payments)

  const patientById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const doctorById = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors])
  const drugById = useMemo(() => new Map(drugs.map((d) => [d.id, d])), [drugs])
  const appointmentById = useMemo(
    () => new Map(appointments.map((a) => [a.id, a])),
    [appointments],
  )
  const recordById = useMemo(
    () => new Map(medicalRecords.map((r) => [r.id, r])),
    [medicalRecords],
  )
  const prescriptionById = useMemo(
    () => new Map(prescriptions.map((p) => [p.id, p])),
    [prescriptions],
  )
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices])

  return {
    patients,
    doctors,
    drugs,
    appointments,
    medicalRecords,
    prescriptions,
    invoices,
    payments,
    patientById,
    doctorById,
    drugById,
    appointmentById,
    recordById,
    prescriptionById,
    invoiceById,
  }
}

export function fullName(
  map: Map<string, { firstName: string; lastName: string }>,
  id?: string,
): string {
  if (!id) return '—'
  const entity = map.get(id)
  return entity ? `${entity.firstName} ${entity.lastName}` : '—'
}

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function upcomingAppointments(appointments: Appointment[]): Appointment[] {
  const now = Date.now()
  return appointments
    .filter(
      (a) =>
        new Date(a.scheduledStart).getTime() >= now - 30 * 60 * 1000 &&
        a.status !== 'Cancelled' &&
        a.status !== 'Completed' &&
        a.status !== 'NoShow',
    )
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
}

export function openInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft')
}

export function lowStockDrugs(drugs: Drug[]): Drug[] {
  return drugs.filter((d) => d.stockQuantity <= d.reorderLevel)
}

export function orderedPrescriptions(prescriptions: Prescription[]): Prescription[] {
  return prescriptions.filter((p) => p.status === 'Ordered')
}

export function recordForAppointment(
  records: MedicalRecord[],
  appointmentId: string,
): MedicalRecord | undefined {
  return records.find((r) => r.appointmentId === appointmentId)
}

export function recordsForPatient(records: MedicalRecord[], patientId: string): MedicalRecord[] {
  return records
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
}

export function invoicesForPatient(invoices: Invoice[], patientId: string): Invoice[] {
  return invoices
    .filter((i) => i.patientId === patientId)
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
}
