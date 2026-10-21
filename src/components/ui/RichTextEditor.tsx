"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  LucideIcon,
  Underline,
} from "lucide-react";
import { RICH_TEXT_ALIGNMENTS, RICH_TEXT_CLASSES } from "@/lib/richText";

interface Props {
  value: string;
  onChange: (html: string) => void;
  label: string;
  placeholder?: string;
  invalid?: boolean;
}

interface ToolbarAction {
  label: string;
  icon: LucideIcon;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const TOOLBAR: ToolbarAction[][] = [
  [
    {
      label: "Negrita",
      icon: Bold,
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: "Cursiva",
      icon: Italic,
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: "Subrayado",
      icon: Underline,
      isActive: (e) => e.isActive("underline"),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Resaltar",
      icon: Highlighter,
      isActive: (e) => e.isActive("highlight"),
      run: (e) => e.chain().focus().toggleHighlight().run(),
    },
  ],
  [
    {
      label: "Alinear a la izquierda",
      icon: AlignLeft,
      isActive: (e) => e.isActive({ textAlign: "left" }),
      run: (e) => e.chain().focus().setTextAlign("left").run(),
    },
    {
      label: "Centrar",
      icon: AlignCenter,
      isActive: (e) => e.isActive({ textAlign: "center" }),
      run: (e) => e.chain().focus().setTextAlign("center").run(),
    },
    {
      label: "Alinear a la derecha",
      icon: AlignRight,
      isActive: (e) => e.isActive({ textAlign: "right" }),
      run: (e) => e.chain().focus().setTextAlign("right").run(),
    },
  ],
  [
    {
      label: "Lista con viñetas",
      icon: List,
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().unsetTextAlign().toggleBulletList().run(),
    },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      isActive: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().unsetTextAlign().toggleOrderedList().run(),
    },
  ],
];

export function RichTextEditor({ value, onChange, label, placeholder, invalid }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
        trailingNode: false,
      }),
      Highlight,
      TextAlign.configure({ types: ["paragraph"], alignments: [...RICH_TEXT_ALIGNMENTS] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        class: `min-h-32 max-h-72 overflow-y-auto px-3 py-2 text-lg text-white outline-none ${RICH_TEXT_CLASSES}`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }): Record<string, boolean> =>
      editor
        ? Object.fromEntries(TOOLBAR.flat().map((a) => [a.label, a.isActive(editor)]))
        : {},
  });

  return (
    <div
      className={`w-full bg-white/5 border rounded-lg transition-colors focus-within:border-tertiary/50 ${
        invalid ? "border-error/60" : "border-white/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-white/10">
        {TOOLBAR.map((group, groupIdx) => (
          <div
            key={groupIdx}
            className={`flex items-center gap-0.5 ${groupIdx > 0 ? "pl-1 border-l border-white/10" : ""}`}
          >
            {group.map((action) => {
              const Icon = action.icon;
              const isActive = active?.[action.label] ?? false;
              return (
                <button
                  key={action.label}
                  type="button"
                  title={action.label}
                  aria-label={action.label}
                  aria-pressed={isActive}
                  disabled={!editor}
                  onClick={() => editor && action.run(editor)}
                  className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                    isActive
                      ? "bg-tertiary/15 text-tertiary"
                      : "text-on-surface-variant hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
