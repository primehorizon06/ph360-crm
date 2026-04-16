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
