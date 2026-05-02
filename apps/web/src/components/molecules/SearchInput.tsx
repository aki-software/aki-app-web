import { Search } from "lucide-react";
import { InputHTMLAttributes } from "react";

export const SearchInput = (props: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <div className="relative max-w-lg w-full">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted/50" />
      <input
        type="text"
        className="w-full rounded-2xl border border-app-border bg-app-surface py-3 pl-11 pr-4 text-sm text-app-text-main placeholder:text-app-text-muted/60 focus:border-app-primary focus:outline-none transition-all"
        {...props}
      />
    </div>
  );
};