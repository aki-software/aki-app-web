import { type KeyboardEvent, useId, useState } from "react";

interface ChipInputProps {
  label: string;
  hint?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export function ChipInput({ label, hint, value, onChange }: ChipInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const draftItem = draft.trim();
  const canAdd = Boolean(draftItem) && !value.includes(draftItem);
  const add = () => {
    if (!canAdd) return;
    onChange([...value, draftItem]);
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <label
        className="block text-sm font-semibold text-app-text-main"
        htmlFor={inputId}
      >
        {label}
      </label>
      {hint && <p className="text-xs text-app-text-muted">{hint}</p>}
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-app-border bg-app-bg p-2 focus-within:border-app-primary focus-within:ring-2 focus-within:ring-app-primary/15">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-lg bg-app-primary/10 px-2 py-1 text-xs font-medium text-app-text-main"
          >
            {item}
            <button
              type="button"
              aria-label={`Quitar ${item}`}
              onClick={() =>
                onChange(value.filter((valueItem) => valueItem !== item))
              }
              className="rounded p-0.5 text-app-text-muted hover:text-app-text-main focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-primary"
            >
              ×
            </button>
          </span>
        ))}
        <div className="flex min-w-36 flex-1 items-center gap-1.5">
          <input
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribí y presioná Enter"
            className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-app-text-main outline-none placeholder:text-app-text-muted/70"
          />
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="min-h-6 rounded-lg border border-app-border px-2 py-1 text-xs font-semibold text-app-text-main transition-colors hover:border-app-primary hover:text-app-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-primary"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
