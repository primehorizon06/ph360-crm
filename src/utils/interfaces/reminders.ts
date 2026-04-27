export interface Reminder {
  id: number;
  scheduledAt: string;
  reason: string;
  status: string;
  leadId: number;
  lead: { firstName: string; lastName: string; phone1: string };
  assignedTo: { id: number; name: string; role: string };
  createdBy: { id: number; name: string };
  createdAt: string;
}

export interface Agent {
  id: number;
  name: string;
  role: string;
}

export interface Props {
  leadId: number;
}

export interface UpdateReminderData {
  status?: string;
  reason?: string;
  scheduledAt?: Date;
  assignedToId?: number;
  lastNotifiedAt?: Date;
}

export interface ReminderWhere {
  assignedToId: number;
  status?: string;
  leadId?: number;
  scheduledAt?: { gte: Date } | { lt: Date };
}
