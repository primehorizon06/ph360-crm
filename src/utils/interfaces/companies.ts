export interface Team {
  id: number;
  name: string;
  companyId: number;
  _count: { users: number };
  users?: { id: number; name: string }[]; // <-- agregar esto
}

export interface TeamModalProps {
  team: Team | null;
  companyId: number;
  onClose: () => void;
  onSave: () => void;
}

export interface CompanyGoals {
  id: number;
  name: string;
  active?: boolean;
  _count: { teams: number; users: number };
  teams?: Team[];
}
