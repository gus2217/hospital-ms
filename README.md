# MediCore HMS — Hospital Management System Dashboard

A production-grade, single-page Hospital Management System dashboard demonstrating the complete
patient flow: **Booking → Consultation → Pharmacy Dispensing → Billing/Payment**.

Built with a mock-data backend (Zustand store) that implements **full CRUD + workflow actions**,
ready to be swapped for real API calls once the backend is live.

## Tech Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| Framework        | React 19 + Vite 8 + TypeScript                    |
| Styling          | Tailwind CSS v4 (CSS-first config)                |
| UI Library       | shadcn/ui-style components on Radix UI primitives |
| State Management | Zustand (mock data + CRUD + workflow actions)     |
| Routing          | React Router DOM v7                               |
| Tables           | TanStack React Table v9                           |
| Icons            | Lucide React                                      |
| Charts           | Recharts                                          |
| Toasts           | Sonner                                            |

## Getting Started

```bash
npm install
npm run dev        # start dev server (Vite)
npm run build      # type-check + production build
npm run preview    # serve the production build locally
```

## Feature Map

### Dashboard
- KPI cards: today's appointments, registered patients, revenue collected, pending prescriptions
- Revenue trend (last 7 days), appointment status donut chart
- Upcoming appointments + low-stock pharmacy alerts

### Appointments (Booking)
- Book / edit / delete appointments; status filter chips
- Workflow: **Pending → Confirmed → In Progress → Completed**, plus Cancel / No-show
- Completing a consultation opens the consultation form (see below)

### Consultation (Medical Records)
- Completing an in-progress appointment writes a **versioned medical record**
- Optionally issues a **prescription** (multi-drug, dosage instructions) forwarded to pharmacy
- Records are amendable — each amendment increments `version`

### Pharmacy
- **Drug inventory**: full CRUD, stock tracking, reorder-level alerts, one-click restock
- **Prescriptions**: view items, cancel, or **dispense**
  - Dispensing deducts stock and **auto-generates a billing invoice** (16% VAT)

### Billing
- **Invoices**: itemized breakdown, draft → issued, outstanding/overdue summaries
- **Payments**: record partial/full payments (M-Pesa, Card, Cash, Insurance, Bank)
  - Payments update `amountPaid` and roll invoice status to **Paid** when settled
  - Reversing a payment restores the balance

### Patients & Doctors
- Full registries with CRUD, search, and per-patient drill-down
  (medical history, invoices, upcoming appointments)

## Project Structure

```
src/
├── components/
│   ├── layout/AppLayout.tsx     # Sidebar + topbar shell
│   ├── DataTable.tsx            # TanStack v9 wrapper (sorting, pagination, search)
│   ├── PageHeader.tsx           # Shared page header + status badges
│   └── ui/                      # shadcn/ui-style primitives (Radix + Tailwind)
├── data/mock.ts                 # Initial mock dataset
├── lib/                         # utils, formatters, status styles, entity lookups
├── pages/                       # Dashboard, Appointments, Patients, Doctors,
│                                # MedicalRecords, Pharmacy, Billing
├── store/hospitalStore.ts       # Zustand store — CRUD + workflow actions
└── types/index.ts               # Domain models mirroring backend DTOs
```

## Notes

- **TanStack Table v9** uses the new feature-registry API (`tableFeatures`,
  `useTable`, `table.FlexRender`) — see `src/components/DataTable.tsx`.
- All amounts are in **KES**; tax is 16% VAT.
- Data is seeded relative to "today", so the dashboard always looks alive.
- Use the avatar menu (top right) → **Reset demo data** to restore the initial state.
