import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** A titled card used to group related admin settings. */
export function AdminSection({
  title,
  description,
  danger,
  children,
  className,
  id,
}: {
  title: string;
  description?: ReactNode;
  danger?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn(ui.card, "p-4 sm:p-5", danger && "border-red-200", className)}>
      <h2 className={cn("text-base font-semibold", danger ? "text-red-800" : "text-stone-900")}>{title}</h2>
      {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A card whose body is hidden until the header is tapped. */
export function AdminDisclosure({
  title,
  description,
  open,
  onOpenChange,
  children,
  id,
}: {
  title: string;
  description?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  id?: string;
}) {
  const bodyId = useId();
  return (
    <section id={id} className={ui.card}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-stone-50 sm:px-5"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-stone-900">{title}</span>
          {description && <span className="mt-0.5 block text-sm text-stone-500">{description}</span>}
        </span>
        <ChevronDown size={18} className={cn("shrink-0 text-stone-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={bodyId} className="border-t border-stone-200 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

/** On/off switch with a label. Changes apply immediately. */
export function AdminSwitch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-stone-800">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="-my-1.5 flex h-10 shrink-0 items-center disabled:opacity-50"
      >
        <span
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            checked ? "bg-primary" : "bg-stone-300",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform",
              checked ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
    </div>
  );
}

/** A small set of radio-style option cards (title + one-line hint). */
export function AdminOptions<T extends string | boolean>({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; title: string; hint: string }[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
              active ? "border-primary bg-primary/[0.04]" : "border-stone-300 bg-white hover:bg-stone-50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                active ? "border-primary" : "border-stone-400",
              )}
            >
              {active && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-stone-900">{option.title}</span>
              <span className="block text-xs text-stone-500">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
