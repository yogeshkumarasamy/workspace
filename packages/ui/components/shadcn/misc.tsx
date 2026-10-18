import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const badgeVariants = cva("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      destructive: "border-transparent bg-destructive text-destructive-foreground",
      outline: "text-foreground",
      success: "border-transparent bg-emerald-600 text-white",
      warning: "border-transparent bg-amber-500 text-black",
      info: "border-transparent bg-blue-600 text-white",
    },
  },
  defaultVariants: { variant: "default" },
});
export function Badge({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...p} />;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Alert({ className, variant = "default", ...p }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "warning" | "destructive" }) {
  const v = { default: "border-border", warning: "border-amber-500/50 bg-amber-500/10 text-amber-200", destructive: "border-destructive/50 bg-destructive/10 text-red-300" }[variant];
  return <div role="alert" className={cn("relative w-full rounded-lg border px-4 py-3 text-sm", v, className)} {...p} />;
}

export function Tabs<T extends string>({ value, onValueChange, items, className }: { value: T; onValueChange: (v: T) => void; items: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("inline-flex h-9 max-w-full items-center overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground", className)}>
      {items.map((i) => (
        <button key={i.value} type="button" onClick={() => onValueChange(i.value)}
          className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all", value === i.value && "bg-background text-foreground shadow")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** Minimal modal dialog (no portal library). */
export function Dialog({ open, onOpenChange, title, children, className }: { open: boolean; onOpenChange: (o: boolean) => void; title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const ref = React.useRef(onOpenChange);
  ref.current = onOpenChange;
  React.useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") ref.current(false); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-0 sm:p-4" onMouseDown={() => onOpenChange(false)}>
      {/* Full-screen sheet on mobile, centered card from sm: up */}
      <div role="dialog" aria-modal="true" className={cn("min-h-full w-full max-w-3xl border-0 bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-lg sm:mt-8 sm:min-h-0 sm:rounded-xl sm:border sm:p-6", className)} onMouseDown={(e) => e.stopPropagation()}>
        {title && <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between gap-2 bg-background px-4 py-1 sm:static sm:mx-0 sm:px-0"><h2 className="text-lg font-semibold">{title}</h2><button aria-label="Close" onClick={() => onOpenChange(false)} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">✕</button></div>}
        {children}
      </div>
    </div>
  );
}

export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) => <div className="w-full overflow-auto"><table className={cn("w-full caption-bottom text-sm", className)} {...p} /></div>;
export const THead = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className="[&_tr]:border-b" {...p} />;
export const TBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className="[&_tr:last-child]:border-0" {...p} />;
export const TR = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => <tr className={cn("border-b transition-colors hover:bg-muted/50", className)} {...p} />;
export const TH = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground", className)} {...p} />;
export const TD = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn("p-2 align-middle", className)} {...p} />;
