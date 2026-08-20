import { useState } from 'react'
import { CheckCircle2, FlaskConical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { CONSULTATION_FEE_OPTIONS } from '@/lib/fees'
import { formatCurrency } from '@/lib/format'
import { useEntityMaps } from '@/lib/useEntities'

const LAB_CATEGORIES = [
  'Haematology',
  'Chemistry',
  'Microbiology',
  'Pathology',
  'Immunology',
  'Radiology',
]

interface RxDraftItem {
  drugId: string
  quantity: number
  dosageInstructions: string
}

interface LabDraftItem {
  testName: string
  testCategory: string
}

/**
 * Direct / walk-in consultation — no appointment required.
 * Creates a medical record with fee invoice, optional prescription and lab orders.
 */
export function CreateConsultationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createConsultation = useHospitalStore((s) => s.createConsultation)
  const { patients, doctors, drugs } = useEntityMaps()

  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [feeOption, setFeeOption] = useState<string>(CONSULTATION_FEE_OPTIONS[0].label)
  const [withRx, setWithRx] = useState(false)
  const [rxItems, setRxItems] = useState<RxDraftItem[]>([
    { drugId: '', quantity: 1, dosageInstructions: '' },
  ])
  const [withLab, setWithLab] = useState(false)
  const [labItems, setLabItems] = useState<LabDraftItem[]>([
    { testName: '', testCategory: 'Haematology' },
  ])

  const feeAmount = CONSULTATION_FEE_OPTIONS.find((o) => o.label === feeOption)?.amount ?? 0
  const valid =
    patientId &&
    doctorId &&
    diagnosis.trim() &&
    treatmentPlan.trim() &&
    clinicalNotes.trim() &&
    (!withRx || rxItems.every((i) => i.drugId && i.quantity > 0)) &&
    (!withLab || labItems.every((i) => i.testName.trim()))

  function handleCreate() {
    if (!valid) return
    const patient = patients.find((p) => p.id === patientId)
    createConsultation({
      patientId,
      doctorId,
      diagnosis: diagnosis.trim(),
      treatmentPlan: treatmentPlan.trim(),
      clinicalNotes: clinicalNotes.trim(),
      consultationFee: feeAmount,
      feeCurrency: 'KES',
      prescription: withRx
        ? {
            items: rxItems
              .filter((i) => i.drugId)
              .map((i) => ({
                drugId: i.drugId,
                quantity: i.quantity,
                dosageInstructions: i.dosageInstructions || 'As directed by physician.',
              })),
          }
        : undefined,
      labTests: withLab
        ? labItems
            .filter((i) => i.testName.trim())
            .map((i) => ({ testName: i.testName.trim(), testCategory: i.testCategory }))
        : undefined,
    })
    toast.success(
      `Consultation created for ${patient?.firstName ?? ''} ${
        patient?.lastName ?? ''
      }${feeAmount ? ` — ${formatCurrency(feeAmount)} invoiced.` : ''}`,
    )
    onOpenChange(false)
    setPatientId('')
    setDoctorId('')
    setDiagnosis('')
    setTreatmentPlan('')
    setClinicalNotes('')
    setFeeOption(CONSULTATION_FEE_OPTIONS[0].label)
    setRxItems([{ drugId: '', quantity: 1, dosageInstructions: '' }])
    setLabItems([{ testName: '', testCategory: 'Haematology' }])
    setWithRx(false)
    setWithLab(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-primary size-5" /> New consultation
          </DialogTitle>
          <DialogDescription>
            Direct / walk-in consultation — no appointment required. Fee, prescription and lab
            orders are applied automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} · {p.patientNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Doctor *</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.lastName} · {d.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Diagnosis *</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute sinusitis"
            />
          </div>
          <div className="grid gap-2">
            <Label>Treatment plan *</Label>
            <Textarea
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="Medications, follow-up, lifestyle advice…"
            />
          </div>
          <div className="grid gap-2">
            <Label>Clinical notes *</Label>
            <Textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Objective findings, vitals, observations…"
            />
          </div>

          <div className="grid gap-2">
            <Label>Consultation fee (auto-invoiced)</Label>
            <Select value={feeOption} onValueChange={setFeeOption}>
              <SelectTrigger className="w-full">
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
                  setLabItems((items) => [...items, { testName: '', testCategory: 'Haematology' }])
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
          <Button onClick={handleCreate} disabled={!valid}>
            <CheckCircle2 /> Create consultation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
