import { useState } from 'react'
import {
  CheckCircle2,
  FlaskConical,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { Appointment, PrescriptionItem } from '@/types'
import { TriageLevel } from '@/types'
import { formatCurrency } from '@/lib/format'
import { CONSULTATION_FEE_OPTIONS } from '@/lib/fees'
import { fullName, useEntityMaps } from '@/lib/useEntities'

interface RxDraftItem {
  drugId: string
  quantity: number
  dosageInstructions: string
}

interface LabDraftItem {
  testName: string
  testCategory: string
}

const LAB_CATEGORIES = [
  'Haematology',
  'Chemistry',
  'Microbiology',
  'Pathology',
  'Immunology',
  'Radiology',
]

export function ConsultationDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { doctorById, patientById, drugs } = useEntityMaps()
  const completeConsultation = useHospitalStore((s) => s.completeConsultation)
  const triageRecords = useHospitalStore((s) => s.triageRecords)

  const latestTriage = appointment
    ? triageRecords
        .filter((t) => t.patientId === appointment.patientId)
        .sort((a, b) => new Date(b.triagedAt).getTime() - new Date(a.triagedAt).getTime())[0]
    : undefined

  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [feeOption, setFeeOption] = useState<string>(CONSULTATION_FEE_OPTIONS[0].label)
  const [withRx, setWithRx] = useState(true)
  const [rxItems, setRxItems] = useState<RxDraftItem[]>([
    { drugId: '', quantity: 1, dosageInstructions: '' },
  ])
  const [withLab, setWithLab] = useState(false)
  const [labItems, setLabItems] = useState<LabDraftItem[]>([
    { testName: '', testCategory: 'Haematology' },
  ])

  const valid = diagnosis.trim() && treatmentPlan.trim() && clinicalNotes.trim()
  const rxValid = !withRx || rxItems.every((i) => i.drugId && i.quantity > 0)
  const labValid = !withLab || labItems.every((i) => i.testName.trim())

  const feeAmount = CONSULTATION_FEE_OPTIONS.find((o) => o.label === feeOption)?.amount ?? 0

  function handleComplete() {
    if (!appointment || !valid || !rxValid || !labValid) return

    const rx = withRx
      ? {
          items: rxItems
            .filter((i) => i.drugId)
            .map(
              (i): PrescriptionItem => ({
                id: `draft-${i.drugId}-${i.quantity}`,
                drugId: i.drugId,
                quantity: i.quantity,
                dosageInstructions: i.dosageInstructions || 'As directed by physician.',
              }),
            ),
        }
      : undefined

    completeConsultation(appointment.id, appointment.doctorId, {
      diagnosis: diagnosis.trim(),
      treatmentPlan: treatmentPlan.trim(),
      clinicalNotes: clinicalNotes.trim(),
      consultationFee: feeAmount,
      feeCurrency: 'KES',
      prescription: rx,
      labTests: withLab
        ? labItems.filter((i) => i.testName.trim()).map((i) => ({
            testName: i.testName.trim(),
            testCategory: i.testCategory,
          }))
        : undefined,
    })
    toast.success(
      `Consultation completed for ${fullName(patientById, appointment.patientId)}${
        feeAmount ? ` — ${formatCurrency(feeAmount)} invoiced.` : ''
      }`,
    )
    onOpenChange(false)
    setDiagnosis('')
    setTreatmentPlan('')
    setClinicalNotes('')
    setFeeOption(CONSULTATION_FEE_OPTIONS[0].label)
    setRxItems([{ drugId: '', quantity: 1, dosageInstructions: '' }])
    setLabItems([{ testName: '', testCategory: 'Haematology' }])
    setWithRx(true)
    setWithLab(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete consultation</DialogTitle>
          <DialogDescription>
            {appointment
              ? `${fullName(patientById, appointment.patientId)} with ${fullName(doctorById, appointment.doctorId)}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1">
          {latestTriage && (
            <div className="rounded-lg border-l-4 border-l-amber-400 bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Triage vitals
                </p>
                <Badge
                  variant={
                    latestTriage.triageLevel === TriageLevel.Emergency ||
                    latestTriage.triageLevel === TriageLevel.Urgent
                      ? 'destructive'
                      : latestTriage.triageLevel === TriageLevel.SemiUrgent
                        ? 'warning'
                        : 'success'
                  }
                >
                  {latestTriage.triageLevel}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['BP', `${latestTriage.systolicBP}/${latestTriage.diastolicBP}`],
                  ['Temp', `${latestTriage.temperatureC}°C`],
                  ['HR', `${latestTriage.heartRate} bpm`],
                  ['RR', `${latestTriage.respiratoryRate}/min`],
                  ['SpO₂', `${latestTriage.oxygenSat}%`],
                  ['Wt/Ht', `${latestTriage.weightKg}kg / ${latestTriage.heightCm}cm`],
                ].map(([label, value]) => (
                  <span
                    key={label}
                    className="rounded-md bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {label} <span className="text-foreground">{value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="cx-diagnosis">Diagnosis</Label>
            <Input
              id="cx-diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute sinusitis"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cx-plan">Treatment plan</Label>
            <Textarea
              id="cx-plan"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="Medications, follow-up, lifestyle advice…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cx-notes">Clinical notes</Label>
            <Textarea
              id="cx-notes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Objective findings, vitals, observations…"
            />
          </div>

          {/* Consultation fee */}
          <div className="grid gap-2">
            <Label htmlFor="cx-fee">Consultation fee (auto-invoiced)</Label>
            <Select value={feeOption} onValueChange={setFeeOption}>
              <SelectTrigger id="cx-fee" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSULTATION_FEE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.label} value={opt.label}>
                    {opt.label} — {formatCurrency(opt.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(feeAmount)} will be added to the patient's invoice as a
              Consultation line item.
            </p>
          </div>

          {/* Prescription */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Issue prescription</p>
              <p className="text-muted-foreground text-xs">
                Forward to pharmacy for dispensing and billing
              </p>
            </div>
            <Button
              type="button"
              variant={withRx ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWithRx((v) => !v)}
            >
              {withRx ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {withRx && (
            <div className="space-y-3 rounded-lg border p-3">
              {rxItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_80px_1fr_auto]">
                  <Select
                    value={item.drugId}
                    onValueChange={(v) =>
                      setRxItems((items) =>
                        items.map((it, i) => (i === idx ? { ...it, drugId: v } : it)),
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Drug" />
                    </SelectTrigger>
                    <SelectContent>
                      {drugs.map((drug) => (
                        <SelectItem key={drug.id} value={drug.id}>
                          {drug.name} ({drug.stockQuantity} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      setRxItems((items) =>
                        items.map((it, i) =>
                          i === idx ? { ...it, quantity: Number(e.target.value) } : it,
                        ),
                      )
                    }
                    placeholder="Qty"
                  />
                  <Input
                    value={item.dosageInstructions}
                    onChange={(e) =>
                      setRxItems((items) =>
                        items.map((it, i) =>
                          i === idx ? { ...it, dosageInstructions: e.target.value } : it,
                        ),
                      )
                    }
                    placeholder="Dosage instructions"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRxItems((items) => items.filter((_, i) => i !== idx))}
                    disabled={rxItems.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRxItems((items) => [
                    ...items,
                    { drugId: '', quantity: 1, dosageInstructions: '' },
                  ])
                }
              >
                <Plus /> Add item
              </Button>
            </div>
          )}

          {/* Lab tests */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Order lab tests</p>
              <p className="text-muted-foreground text-xs">
                e.g. CBC, blood glucose — queued for the laboratory
              </p>
            </div>
            <Button
              type="button"
              variant={withLab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWithLab((v) => !v)}
            >
              {withLab ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {withLab && (
            <div className="space-y-3 rounded-lg border p-3">
              {labItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                  <Input
                    value={item.testName}
                    onChange={(e) =>
                      setLabItems((items) =>
                        items.map((it, i) =>
                          i === idx ? { ...it, testName: e.target.value } : it,
                        ),
                      )
                    }
                    placeholder="Test name — e.g. Complete Blood Count"
                  />
                  <Select
                    value={item.testCategory}
                    onValueChange={(v) =>
                      setLabItems((items) =>
                        items.map((it, i) => (i === idx ? { ...it, testCategory: v } : it)),
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAB_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLabItems((items) => items.filter((_, i) => i !== idx))}
                    disabled={labItems.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLabItems((items) => [
                    ...items,
                    { testName: '', testCategory: 'Haematology' },
                  ])
                }
              >
                <Plus /> Add test
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="items-center">
          <p className="text-muted-foreground mr-auto flex items-center gap-1.5 text-xs">
            <FlaskConical className="size-3.5" />
            Fee {formatCurrency(feeAmount)} · {withRx ? 'RX included' : 'No RX'} ·{' '}
            {withLab ? `${labItems.filter((i) => i.testName.trim()).length} lab order(s)` : 'No lab'}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!valid || !rxValid || !labValid}>
            <CheckCircle2 /> Complete & record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
