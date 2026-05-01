import { Team } from "./companies";
import { Company } from "./dashboard";

export interface Goal {
  id: number;
  year: number;
  month: number;
  quincena: number;
  amount: number;
  companyId?: number;
  teamId?: number;
  userId?: number;
  company?: { id: number; name: string };
  team?: { id: number; name: string; companyId: number };
  user?: { id: number; name: string; teamId: number };
  createdBy: { id: number; name: string };
  createdAt: string;
}

export interface GoalsData {
  goals: Goal[];
  companies: Company[];
  teams: Team[];
}
