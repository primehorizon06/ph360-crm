import { Lead } from "./leads";

export interface Props {
  lead: Lead;
  onClose: () => void;
  onSave: () => void;
}
