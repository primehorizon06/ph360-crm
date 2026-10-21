export const RICH_TEXT_CLASSES =
  "[&_p]:min-h-[1lh] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_mark]:bg-warning/40 [&_mark]:text-inherit [&_mark]:rounded-sm [&_mark]:px-0.5";

export const RICH_TEXT_ALIGNMENTS = ["left", "center", "right"] as const;

export const RICH_TEXT_TAGS = ["p", "br", "strong", "em", "u", "mark", "ul", "ol", "li"];

export function richTextLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#?\w+;/g, "_")
    .replace(/\s+/g, " ")
    .trim().length;
}
