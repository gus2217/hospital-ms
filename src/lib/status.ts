import {
  AdmissionStatus,
  AppointmentStatus,
  InvoiceStatus,
  LabTestStatus,
  PrescriptionStatus,
} from '@/types'
import type { VariantProps } from 'class-variance-authority'
import type { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export const appointmentStatusStyle: Record<
  AppointmentStatus,
  { variant: BadgeVariant; dot: string }
> = {
  [AppointmentStatus.Pending]: { variant: 'warning', dot: 'bg-amber-500' },
  [AppointmentStatus.Confirmed]: { variant: 'info', dot: 'bg-sky-500' },
  [AppointmentStatus.InProgress]: { variant: 'violet', dot: 'bg-violet-500' },
  [AppointmentStatus.Completed]: { variant: 'success', dot: 'bg-emerald-500' },
  [AppointmentStatus.Cancelled]: { variant: 'slate', dot: 'bg-slate-400' },
  [AppointmentStatus.NoShow]: { variant: 'destructive', dot: 'bg-red-500' },
}

export const prescriptionStatusStyle: Record<
  PrescriptionStatus,
  { variant: BadgeVariant; dot: string }
> = {
  [PrescriptionStatus.Ordered]: { variant: 'warning', dot: 'bg-amber-500' },
  [PrescriptionStatus.Dispensed]: { variant: 'success', dot: 'bg-emerald-500' },
  [PrescriptionStatus.Cancelled]: { variant: 'slate', dot: 'bg-slate-400' },
}

export const invoiceStatusStyle: Record<
  InvoiceStatus,
  { variant: BadgeVariant; dot: string }
> = {
  [InvoiceStatus.Draft]: { variant: 'slate', dot: 'bg-slate-400' },
  [InvoiceStatus.Issued]: { variant: 'info', dot: 'bg-sky-500' },
  [InvoiceStatus.Paid]: { variant: 'success', dot: 'bg-emerald-500' },
  [InvoiceStatus.Overdue]: { variant: 'destructive', dot: 'bg-red-500' },
}

export const labTestStatusStyle: Record<
  LabTestStatus,
  { variant: BadgeVariant; dot: string }
> = {
  [LabTestStatus.Ordered]: { variant: 'info', dot: 'bg-sky-500' },
  [LabTestStatus.InProgress]: { variant: 'violet', dot: 'bg-violet-500' },
  [LabTestStatus.Completed]: { variant: 'success', dot: 'bg-emerald-500' },
  [LabTestStatus.Cancelled]: { variant: 'slate', dot: 'bg-slate-400' },
}

export const admissionStatusStyle: Record<
  AdmissionStatus,
  { variant: BadgeVariant; dot: string }
> = {
  [AdmissionStatus.Active]: { variant: 'success', dot: 'bg-emerald-500' },
  [AdmissionStatus.Discharged]: { variant: 'slate', dot: 'bg-slate-400' },
  [AdmissionStatus.Cancelled]: { variant: 'destructive', dot: 'bg-red-500' },
}

export function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    'M-Pesa': 'M-Pesa',
    Card: 'Card',
    Cash: 'Cash',
    Insurance: 'Insurance',
    Bank: 'Bank Transfer',
  }
  return map[method] ?? method
}
