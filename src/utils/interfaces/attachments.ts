export interface Attachment {
  id: number;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
  author: {
    id: number;
    name: string;
  };
}

export interface PropsAttachmentsTab {
  leadId: string | number;
}
