import "server-only";
import sanitizeHtml from "sanitize-html";
import { RICH_TEXT_ALIGNMENTS, RICH_TEXT_TAGS } from "@/lib/richText";

const NOTE_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: RICH_TEXT_TAGS,
  allowedAttributes: { p: ["style"] },
  allowedStyles: {
    p: { "text-align": [new RegExp(`^(${RICH_TEXT_ALIGNMENTS.join("|")})$`)] },
  },
};

export function sanitizeNoteHtml(html: string): string {
  return sanitizeHtml(html, NOTE_HTML_OPTIONS).replace(/(<p>(\s|<br\s*\/?>)*<\/p>)+$/, "");
}
