// Shared class names for the handful of patterns repeated across pages.
// Keep these small: they exist so buttons, inputs and cards look identical everywhere.

export const ui = {
  /** White content card. */
  card: "rounded-xl border border-stone-200 bg-white",
  /** Form label above an input. */
  label: "mb-1.5 block text-sm font-medium text-stone-700",
  /** Muted helper text under an input. */
  hint: "mt-1.5 text-xs leading-relaxed text-stone-500",
  /** Text input / select / textarea. 16px text avoids iOS zoom-on-focus. */
  input:
    "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 sm:text-sm",
  /** Buttons. Combine one variant with one size. */
  btn: {
    base: "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
    primary: "bg-primary text-white hover:bg-primary-dark",
    secondary: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
    success: "bg-success text-white hover:bg-[#1B5E20]",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    lg: "h-12 px-5 text-base",
    md: "h-10 px-4 text-sm",
    sm: "h-8 px-3 text-sm",
  },
  /** Error message text. */
  error: "text-sm text-red-700",
} as const;

export function btn(variant: "primary" | "secondary" | "ghost" | "success" | "danger" = "primary", size: "lg" | "md" | "sm" = "md") {
  return `${ui.btn.base} ${ui.btn[variant]} ${ui.btn[size]}`;
}
