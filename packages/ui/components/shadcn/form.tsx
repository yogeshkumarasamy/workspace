import * as React from "react";
import { cn } from "./utils";

const field = "flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-9", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-[80px] py-2", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(field, "h-9 bg-background", className)} {...p} />
));
Select.displayName = "Select";

export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-medium leading-none", className)} {...p} />
);

export function Switch({ checked, onCheckedChange, id, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} disabled={disabled} onClick={() => onCheckedChange(!checked)}
      className={cn("inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors", checked ? "bg-primary" : "bg-input")}>
      <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

export function Checkbox({ checked, onCheckedChange, ...p }: { checked: boolean; onCheckedChange: (v: boolean) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked">) {
  return <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" {...p} />;
}
