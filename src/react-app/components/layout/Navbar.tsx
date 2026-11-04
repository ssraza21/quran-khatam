import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { btn } from "@/lib/ui";
import LogoMark from "./LogoMark";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <LogoMark className="h-7 w-7 shrink-0" />
          <span className="truncate font-heading text-lg font-semibold text-stone-900">Quran Khatam</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <NavLink
            to="/campaigns"
            className={({ isActive }) =>
              cn(
                "rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
                isActive ? "text-primary" : "text-stone-600 hover:text-stone-900",
              )
            }
          >
            <span className="sm:hidden">Find</span>
            <span className="hidden sm:inline">Find a khatam</span>
          </NavLink>
          <Link to="/new" className={btn("primary", "sm")}>
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start a khatam</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
