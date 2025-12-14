import { Decimal } from "@prisma/client/runtime/library"

export interface User {
  id: string
  email: string
  name?: string
  passwordHash: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export interface PayPalAccount {
  id: string
  userId?: string
  accountName: string
  email: string
  clientId: string // encrypted
  secretKey: string // encrypted
  sandboxMode: boolean
  active: boolean
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Dispute {
  id: string
  paypalAccountId: string
  disputeId: string
  transactionId?: string
  disputeAmount?: Decimal | number
  disputeCurrency?: string
  customerEmail?: string
  customerName?: string
  disputeType?: string
  disputeReason?: string
  disputeStatus?: string
  disputeOutcome?: string
  description?: string
  disputeChannel?: string
  disputeCreateTime?: Date
  disputeUpdateTime?: Date
  responseDueDate?: Date
  resolvedAt?: Date
  rawData?: any
  createdAt: Date
  updatedAt: Date
}

export interface DisputeHistory {
  id: string
  disputeId: string
  actionType: string
  actionBy?: string
  oldValue?: string
  newValue?: string
  description?: string
  metadata?: any
  createdAt: Date
}

export interface DisputeMessage {
  id: string
  disputeId: string
  messageType: string
  postedBy?: string
  content?: string
  attachments?: any
  createdAt: Date
}

export interface SyncLog {
  id: string
  paypalAccountId: string
  syncType: string
  status: string
  disputesSynced?: number
  errors?: string
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
}
