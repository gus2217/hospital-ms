import { useMemo, useState } from 'react'
import {
  Activity,
  Gauge,
  HeartPulse,
  Stethoscope,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, StatusBadge } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHospitalStore } from '@/store/hospitalStore'
import { appointmentStatusStyle } from '@/lib/status'
import { AppointmentStatus, TriageLevel, type Appointment, type TriageRecord } from '@/types'
import { formatTime, initials, relativeDayLabel } from '@/lib/format'
import { fullName, isToday, useEntityMaps } from '@/lib/useEntities'

const LEVEL_STYLES: Record<TriageLevel, { variant: 'destructive' | 'warning' | 'success' | 'secondary'; label: string }> = {
  [TriageLevel.Emergency]: { variant: 'destructive', label: 'Emergency' },
  [TriageLevel.Urgent]: { variant: 'warning', label: 'Urgent' },
  [TriageLevel.SemiUrgent]: { variant: 'warning', label: 'Semi-urgent' },
  [TriageLevel.NonUrgent]: { variant: 'success', label: 'Non-urgent' },
}

function VitalsChips({ t }: { t: TriageRecord }) {
  const items = [
    { label: 'BP', value: `${t.systolicBP}/${t.diastolicBP}` },
    { label: 'Temp', value: `${t.temperatureC}°C` },
    { label: 'HR', value: `${t.heartRate} bpm` },
    { label: 'RR', value: `${t.respiratoryRate}/min` },
    { label: 'SpO₂', value: `${t.oxygenSat}%` },
    { label: 'Wt/Ht', value: `${t.weightKg}kg / ${t.heightCm}cm` },
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span
          key={i.label}
          className="rounded-md bg-muted/70 px-2 py-1 text-[11px] font-medium text-muted-foreground"
        >
          {i.label} <span className="text-foreground">{i.value}</span>
        </span>
      ))}
    </div>
  )
}

function TriageDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const addTriageRecord = useHospitalStore((s) => s.addTriageRecord)
  const { patientById } = useEntityMaps()

  const [systolicBP, setSystolicBP] = useState('120')
  const [diastolicBP, setDiastolicBP] = useState('80')
  const [temperatureC, setTemperatureC] = useState('36.5')
  const [heartRate, setHeartRate] = useState('80')
  const [respiratoryRate, setRespiratoryRate] = useState('16')
  const [weightKg, setWeightKg] = useState('70')
  const [heightCm, setHeightCm] = useState('170')
  const [oxygenSat, setOxygenSat] = useState('97')
  const [triageLevel, setTriageLevel] = useState<TriageLevel>(TriageLevel.NonUrgent)
  const [notes, setNotes] = useState('')

  const valid =
    Number(systolicBP) > 0 &&
    Number(diastolicBP) > 0 &&
    Number(temperatureC) > 0 &&
    Number(heartRate) > 0 &&
    Number(oxygenSat) > 0

  function handleSave() {
    if (!appointment || !valid) return
    addTriageRecord({
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      systolicBP: Number(systolicBP),
      diastolicBP: Number(diastolicBP),
      temperatureC: Number(temperatureC),
      heartRate: Number(heartRate),
      respiratoryRate: Number(respiratoryRate),
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      oxygenSat: Number(oxygenSat),
      chiefComplaint: appointment.reasonForVisit,
      notes: notes.trim() || undefined,
      triageLevel,
    })
    toast.success(
      `${fullName(patientById, appointment.patientId)} triaged as ${triageLevel}.`,
    )
    onOpenChange(false)
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="text-primary size-5" /> Triage — {appointment?.id}
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? `${fullName(patientById, appointment.patientId)} · ${appointment.reasonForVisit}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Systolic BP</Label>
              <Input type="number" value={systolicBP} onChange={(e) => setSystolicBP(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Diastolic BP</Label>
              <Input type="number" value={diastolicBP} onChange={(e) => setDiastolicBP(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Temp (°C)</Label>
              <Input type="number" step="0.1" value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Heart rate</Label>
              <Input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Resp. rate</Label>
              <Input type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>SpO₂ (%)</Label>
              <Input type="number" value={oxygenSat} onChange={(e) => setOxygenSat(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Weight (kg)</Label>
              <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Height (cm)</Label>
              <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Triage level</Label>
              <Select value={triageLevel} onValueChange={(v) => setTriageLevel(v as TriageLevel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TriageLevel).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LEVEL_STYLES[l].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, pain scale, allergies confirmed…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            <Gauge /> Complete triage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Triage() {
  const appointments = useHospitalStore((s) => s.appointments)
  const triageRecords = useHospitalStore((s) => s.triageRecords)
  const { patientById, doctorById } = useEntityMaps()

  const [triaging, setTriaging] = useState<Appointment | null>(null)

  const triagedByAppointment = useMemo(
    () => new Set(triageRecords.map((t) => t.appointmentId).filter(Boolean)),
    [triageRecords],
  )

  const candidates = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            isToday(a.scheduledStart) &&
            (a.status === AppointmentStatus.Confirmed ||
              a.status === AppointmentStatus.InProgress),
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
        ),
    [appointments],
  )

  const awaiting = candidates.filter((a) => !triagedByAppointment.has(a.id))
  const triagedToday = candidates.filter((a) => triagedByAppointment.has(a.id))
  const urgent = triageRecords.filter(
    (t) =>
      t.triageLevel === TriageLevel.Emergency || t.triageLevel === TriageLevel.Urgent,
  ).length

  const latestTriage = (appointmentId?: string) =>
    triageRecords
      .filter((t) => t.appointmentId === appointmentId)
      .sort((a, b) => new Date(b.triagedAt).getTime() - new Date(a.triagedAt).getTime())[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Triage"
        description="Vitals and priority assessment before the doctor's consultation."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">Awaiting triage</p>
              <p className="mt-1 text-2xl font-bold">{awaiting.length}</p>
            </div>
            <Gauge className="text-sky-600 size-5" />
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">Triaged today</p>
              <p className="mt-1 text-2xl font-bold">{triagedToday.length}</p>
            </div>
            <HeartPulse className="text-emerald-600 size-5" />
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">Emergency / urgent</p>
              <p className="mt-1 text-2xl font-bold">{urgent}</p>
            </div>
            <Activity className="text-rose-600 size-5" />
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="flex items-center justify-between px-5">
            <div>
              <p className="text-muted-foreground text-sm">In queue today</p>
              <p className="mt-1 text-2xl font-bold">{candidates.length}</p>
            </div>
            <Stethoscope className="text-violet-600 size-5" />
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 border-0 py-0 shadow-none">
        <div className="space-y-3">
          {candidates.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No appointments in today's triage queue. 🎉
            </p>
          ) : (
            candidates.map((a) => {
              const triage = latestTriage(a.id)
              const doc = doctorById.get(a.doctorId)
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold">
                    {patientById.get(a.patientId)
                      ? initials(
                          patientById.get(a.patientId)!.firstName,
                          patientById.get(a.patientId)!.lastName,
                        )
                      : '—'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {fullName(patientById, a.patientId)}
                      <span className="text-muted-foreground text-xs font-normal">
                        {' '}
                        · Dr. {doc?.lastName} · {doc?.specialization}
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                      <Activity className="size-3.5" />
                      {relativeDayLabel(a.scheduledStart)} · {formatTime(a.scheduledStart)} ·{' '}
                      {a.reasonForVisit}
                    </p>
                    {triage && (
                      <div className="mt-2">
                        <VitalsChips t={triage} />
                        <p className="text-muted-foreground mt-1.5 text-xs">{triage.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={a.status}
                      variant={appointmentStatusStyle[a.status].variant}
                      dot={appointmentStatusStyle[a.status].dot}
                    />
                    {triage ? (
                      <>
                        <Badge variant={LEVEL_STYLES[triage.triageLevel].variant}>
                          {LEVEL_STYLES[triage.triageLevel].label}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setTriaging(a)}>
                          Re-triage
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => setTriaging(a)}>
                        <Gauge /> Triage
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      <TriageDialog
        appointment={triaging}
        open={triaging !== null}
        onOpenChange={() => setTriaging(null)}
      />
    </div>
  )
}
