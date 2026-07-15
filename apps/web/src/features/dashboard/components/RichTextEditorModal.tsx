import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Save, X } from "lucide-react";
import { useEffect } from "react";

interface RichTextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSave: (html: string) => void;
  title?: string;
}

export const RichTextEditorModal = ({
  isOpen,
  onClose,
  initialContent,
  onSave,
  title = "Edit Content",
}: RichTextEditorModalProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] outline-none text-app-text-main px-4 py-3",
      },
    },
  });

  // Sync content when modal opens with new initialContent
  useEffect(() => {
    if (isOpen && editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, false);
    }
  }, [isOpen, initialContent, editor]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (editor) {
      onSave(editor.getHTML());
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
      aria-modal="true"
      role="dialog"
      aria-label={title}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-app-bg/80 backdrop-blur-md" />

      {/* Modal container */}
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-app-border bg-app-surface shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-app-border bg-app-surface/95 px-8 py-6 backdrop-blur">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-6 bg-app-primary rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">
                Rich Text Editor
              </p>
            </div>
            <h3 className="text-xl font-black text-app-text-main truncate tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close editor"
            title="Close editor"
            className="rounded-full p-2 text-app-text-muted hover:bg-app-bg hover:text-app-text-main transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b border-app-border bg-app-bg/60 px-6 py-2">
          <button
            id="rte-bold"
            type="button"
            aria-label="Toggle bold"
            title="Bold"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`rounded-lg p-2 text-sm font-bold transition-colors ${
              editor?.isActive("bold")
                ? "bg-app-primary/20 text-app-primary"
                : "text-app-text-muted hover:bg-app-bg hover:text-app-text-main"
            }`}
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            id="rte-italic"
            type="button"
            aria-label="Toggle italic"
            title="Italic"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`rounded-lg p-2 text-sm transition-colors ${
              editor?.isActive("italic")
                ? "bg-app-primary/20 text-app-primary"
                : "text-app-text-muted hover:bg-app-bg hover:text-app-text-main"
            }`}
          >
            <Italic className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-app-border mx-1" />

          <button
            id="rte-bullet-list"
            type="button"
            aria-label="Toggle bullet list"
            title="Bullet list"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`rounded-lg p-2 text-sm transition-colors ${
              editor?.isActive("bulletList")
                ? "bg-app-primary/20 text-app-primary"
                : "text-app-text-muted hover:bg-app-bg hover:text-app-text-main"
            }`}
          >
            <List className="h-4 w-4" />
          </button>

          <button
            id="rte-ordered-list"
            type="button"
            aria-label="Toggle ordered list"
            title="Ordered list"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`rounded-lg p-2 text-sm transition-colors ${
              editor?.isActive("orderedList")
                ? "bg-app-primary/20 text-app-primary"
                : "text-app-text-muted hover:bg-app-bg hover:text-app-text-main"
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <EditorContent
            editor={editor}
            className="min-h-[240px] cursor-text"
          />
        </div>

        {/* Footer */}
        <div className="border-t border-app-border bg-app-surface/95 px-8 py-6 flex justify-end items-center gap-4">
          <button
            id="rte-cancel"
            type="button"
            onClick={onClose}
            className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-semibold text-app-text-muted hover:bg-app-bg hover:text-app-text-main transition-colors"
          >
            Cancel
          </button>
          <button
            id="rte-save"
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-app-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-app-primary/20 hover:opacity-90 transition-opacity"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
