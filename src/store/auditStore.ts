import { create } from 'zustand'
import type { AuditLog } from '@/types'
import { mockAuditLogs } from '@/data/mock'

export interface LogAuditInput {
  userId: string
  action: string
  entityType: string
  entityId: string
  changes?: string
  ipAddress?: string
  userAgent?: string
  /** True for suspicious activity (failed logins, off-hours access). */
  flagged?: boolean
}

interface AuditState {
  auditLogs: AuditLog[]
  logAudit: (input: LogAuditInput) => AuditLog
  clearAudit: () => void
}

export const useAuditStore = create<AuditState>()((set) => ({
  auditLogs: mockAuditLogs,

  logAudit: (input) => {
    const log: AuditLog = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.12',
      userAgent: 'Chrome/126 · Windows 11',
      ...input,
    }
    set((s) => ({ auditLogs: [log, ...s.auditLogs] }))
    return log
  },

  clearAudit: () => set({ auditLogs: [] }),
}))
