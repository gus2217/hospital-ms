import { useMemo, useState } from 'react'
import { ClipboardPlus, PlayCircle } from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConsultationDialog } from '@/components/consultation/ConsultationDialog'
import { useHospitalStore } from '@/store/hospitalStore'
import { useAuthStore } from '@/store/authStore'
import { appointmentStatusStyle } from '@/lib/status'
import { AppointmentStatus, type Appointment } from '@/types'
import { formatCurrency, formatTime, relativeDayLabel } from '@/lib/format'
import { fullName, useEntityMaps } from '@/lib/useEntities'

export default function Consultation() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const appointments = useHospitalStore((s) => s.appointments)
  const medicalRecords = useHospitalStore((s) => s.medicalRecords)
  const { patientById } = useEntityMaps()

  const [consulting, setConsulting] = useState<Appointment | null>(null)

  const doctorId = currentUser?.id ?? ''

  const queue = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.doctorId === doctorId &&
            (a.status === AppointmentStatus.Confirmed ||
              a.status === AppointmentStatus.InProgress),
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
        ),
    [appointments, doctorId],
  )

  const stats = useMemo(() => {
    const myRecords = medicalRecords.filter((r) => r.doctorId === doctorId)
    const today = new Date().toDateString()
    const todayRecords = myRecords.filter((r) => new Date(r.recordedAt).toDateString() === today)
    const revenue = todayRecords.reduce((s, r) => s + (r.consultationFee ?? 0), 0)
    const avg =
      todayRecords.length > 0
        ? Math.round((revenue / todayRecords.length) * 100) / 100
        : 0
    return { count: todayRecords.length, revenue, avg }
  }, [medicalRecords, doctorId])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation Queue"
        description="Your confirmed and in-progress appointments — ready to consult."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-2 py-4">
          <CardContent className="px-5">
            <p className="text-muted-foreground text-sm">In your queue</p>
            <p className="mt-1 text-2xl font-bold">{queue.length}</p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-5">
            <p className="text-muted-foreground text-sm">Consultations today</p>
            <p className="mt-1 text-2xl font-bold">{stats.count}</p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-5">
            <p className="text-muted-foreground text-sm">Today's consultation revenue</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Avg fee {formatCurrency(stats.avg)} / consultation
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <div className="space-y-3">
          {queue.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Nothing to consult right now — your queue is clear. 🎉
            </p>
          ) : (
            queue.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <PlayCircle className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">{fullName(patientById, a.patientId)}</p>
                    <p className="text-muted-foreground text-xs">
                      {relativeDayLabel(a.scheduledStart)} · {formatTime(a.scheduledStart)} ·{' '}
                      {a.reasonForVisit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={a.status}
                    variant={appointmentStatusStyle[a.status].variant}
                    dot={appointmentStatusStyle[a.status].dot}
                  />
                  <Badge variant="secondary">{a.id}</Badge>
                  <Button onClick={() => setConsulting(a)}>
                    <ClipboardPlus /> Consult
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <ConsultationDialog
        appointment={consulting}
        open={consulting !== null}
        onOpenChange={(open) => {
          if (!open) setConsulting(null)
        }}
      />
    </div>
  )
}
