import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Optional back link shown above the title. */
  back?: { to: string; label: string };
  /** Small line above the title, e.g. the campaign a page belongs to. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Longer free text (campaign descriptions). Clamped with a "Show more" toggle. */
  description?: string | null;
  /** Buttons/links aligned to the right on desktop, below the title on mobile. */
  actions?: ReactNode;
  /** Extra content rendered under the title block (stats, tabs…). */
  children?: ReactNode;
  className?: string;
  /** Max width of the inner container. */
  width?: "md" | "lg";
}

export default function PageHeader({
  back,
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  width = "lg",
}: PageHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const desc = description?.trim();
  const isLong = !!desc && (desc.length > 180 || desc.split("\n").length > 3);

  return (
    <header className={cn("border-b border-stone-200 bg-white", className)}>
      <div className={cn("mx-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6", width === "md" ? "max-w-3xl" : "max-w-6xl")}>
        {back && (
          <Link
            to={back.to}
            className="-ml-1 mb-3 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
          >
            <ChevronLeft size={16} />
            {back.label}
          </Link>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 truncate text-sm text-stone-500">{eyebrow}</p>}
            <h1 className="break-words font-heading text-[28px] font-semibold leading-tight text-stone-900 sm:text-4xl">
              {title}
            </h1>
            {desc && (
              <div className="mt-2 max-w-2xl">
                <p
                  className={cn(
                    "whitespace-pre-line break-words text-[15px] leading-relaxed text-stone-600",
                    isLong && !expanded && "line-clamp-3",
                  )}
                >
                  {desc}
                </p>
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="mt-1 text-sm font-medium text-primary hover:underline"
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}
