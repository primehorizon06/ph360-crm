import z from "zod";

export interface NoteAttachment {
  id: number;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author: { id: number; name: string };
  attachments: NoteAttachment[];
}

export const noteSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  content: z.string().min(5, "Mínimo 5 caracteres"),
});

export type NoteFormData = z.infer<typeof noteSchema>;

export interface Props {
  leadId: number;
  onClose: () => void;
  onSave: () => void;
}

export interface PropsNotesTab {
  leadId: number;
}
