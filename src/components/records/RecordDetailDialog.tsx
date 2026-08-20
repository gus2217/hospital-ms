import { FileText, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/PageHeader'
import { appointmentStatusStyle } from '@/lib/status'
import type { MedicalRecord } from '@/types'
import { formatCurrency, formatDateTime, formatTime, relativeDayLabel } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

/**
 * Full consultation record with its source visit — links the Appointments
 * and Consultations views together (two-way drill-down).
 */
export function RecordDetailDialog({
  record,
  open,
  onOpenChange,
}: {
  record: MedicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { patientById, doctorById, appointmentById, prescriptions, drugById } = useEntityMaps()

  if (!record) return null

  const appointment = record.appointmentId
    ? appointmentById.get(record.appointmentId)
    : undefined
  const rx = prescriptions.filter((p) => p.medicalRecordId === record.id)
  const isWalkIn = appointment?.reasonForVisit === 'Walk-in consultation'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-primary size-5" /> {record.id}
            </DialogTitle>
            <Badge variant="secondary">
              <History /> v{record.version}
            </Badge>
          </div>
          <DialogDescription>
            {fullName(patientById, record.patientId)} · Dr.{' '}
            {fullName(doctorById, record.doctorId)} · {formatDateTime(record.recordedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1 text-sm">
          {/* Source visit */}
          {appointment && (
            <div className="flex items-center justify-between rounded-lg border-l-4 border-l-teal-500 bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  {isWalkIn ? 'Visit (walk-in)' : 'Source appointment'}
                </p>
                <p className="font-mono text-xs font-semibold">
                  {appointment.id}
                  {!isWalkIn && (
                    <span className="text-muted-foreground font-sans font-normal">
                      {' '}
                      · {relativeDayLabel(appointment.scheduledStart)} at{' '}
                      {formatTime(appointment.scheduledStart)}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {appointment.reasonForVisit}
                </p>
              </div>
              <StatusBadge
                label={appointment.status}
                variant={appointmentStatusStyle[appointment.status].variant}
                dot={appointmentStatusStyle[appointment.status].dot}
              />
            </div>
          )}

          <div className="rounded-lg border-l-4 border-l-teal-500 bg-muted/30 p-3">
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Diagnosis
            </p>
            <p className="font-medium">{record.diagnosis}</p>
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Treatment plan
            </p>
            <p className="whitespace-pre-wrap">{record.treatmentPlan}</p>
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Clinical notes
            </p>
            <p className="whitespace-pre-wrap">{record.clinicalNotes}</p>
          </div>

          {record.consultationFee && (
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Consultation fee</span>
              <span className="font-semibold">{formatCurrency(record.consultationFee)}</span>
            </div>
          )}

          {rx.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                Prescriptions ({rx.length})
              </p>
              {rx.map((p) => (
                <div key={p.id} className="mb-2 rounded-lg border p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold">{p.id}</span>
                    <Badge
                      variant={
                        p.status === 'Dispensed'
                          ? 'success'
                          : p.status === 'Cancelled'
                            ? 'slate'
                            : 'warning'
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {p.items.map((item) => (
                      <li key={item.id} className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {drugById.get(item.drugId)?.name ?? item.drugId}
                        </span>{' '}
                        × {item.quantity} — {item.dosageInstructions}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
