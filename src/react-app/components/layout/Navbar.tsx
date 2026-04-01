import { Link, useLocation, useParams } from "react-router-dom";
import { Menu, Home, Activity, BarChart2, UserPlus, LogIn } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavLinkItem = {
  name: string;
  path: string;
  icon: LucideIcon;
  /** If set, navigates to `/#${hash}` on the home page (scroll + highlight handled by LandingPage). */
  hash?: string;
};

export default function Navbar() {
  const { pathname, hash: locationHash } = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const [open, setOpen] = useState(false);

  const baseItems: NavLinkItem[] = [
    { name: "Home", path: "/", icon: Home },
    { name: "Create a Khatam", path: "/", hash: "create-khatam", icon: UserPlus },
    { name: "Join a Khatam", path: "/", hash: "join-khatam", icon: LogIn },
  ];

  const navItems = slug
    ? [
      ...baseItems,
      { name: "Tracker", path: `/k/${slug}`, icon: Activity },
      { name: "Metrics", path: `/k/${slug}/metrics`, icon: BarChart2 },
    ]
    : baseItems;

  const isNavItemActive = (item: NavLinkItem) => {
    if (item.hash) {
      return pathname === "/" && locationHash === `#${item.hash}`;
    }
    if (item.path === "/") {
      return pathname === "/" && !locationHash;
    }
    return pathname === item.path;
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Warm accent hairline */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-linear-to-r from-transparent via-[#8B0000]/35 to-transparent"
        aria-hidden
      />
      <nav
        className={cn(
          "relative border-b border-[#8B0000]/[0.08] bg-white/80 backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_12px_40px_-16px_rgba(58,0,0,0.08)]",
        )}
      >
        <div className="container mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          {/* Logo */}
          <Link
            to="/"
            className="group relative flex min-w-0 shrink items-center gap-3 rounded-xl py-1.5 pl-1 pr-2 transition-colors duration-300 hover:bg-[#8B0000]/[0.04]"
          >
            <span
              className="hidden h-9 w-[3px] shrink-0 rounded-full bg-linear-to-b from-[#C9A227]/90 via-[#8B0000] to-[#4A0000] sm:block"
              aria-hidden
            />
            <span className="flex min-w-0 flex-col">
              <span
                className="truncate text-lg font-semibold tracking-tight text-[#2C2C2C] transition-colors group-hover:text-[#8B0000]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Quran Khatam
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.28em] text-[#888]/90 sm:block">
                Together in recitation
              </span>
            </span>
          </Link>

          {/* Desktop: pill rail */}
          <div className="hidden min-w-0 flex-1 justify-end md:flex">
            <div
              className={cn(
                "nav-pill-rail flex max-w-full flex-wrap items-center justify-end gap-0.5 rounded-full border border-[#8B0000]/[0.12] p-1",
              )}
            >
              {navItems.map((item) => {
                const to = item.hash ? { pathname: "/", hash: item.hash } : item.path;
                const active = isNavItemActive(item);
                return (
                  <Link
                    key={item.hash ? `${item.path}#${item.hash}` : item.path}
                    to={to}
                    className={cn(
                      "relative whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-medium tracking-wide transition-all duration-300 sm:px-3.5 sm:text-[13px]",
                      "font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0000]/35 focus-visible:ring-offset-2",
                      active
                        ? "bg-[#8B0000] text-white shadow-md shadow-[#8B0000]/25"
                        : "text-[#4A4A4A] hover:bg-[#8B0000]/[0.07] hover:text-[#8B0000] active:scale-[0.98]",
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Drawer direction="right" open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full border border-[#8B0000]/15 bg-white/95 text-[#8B0000]",
                    "shadow-sm transition-all duration-300",
                    "hover:border-[#8B0000]/40 hover:bg-[#FFF8F8] hover:shadow-md",
                    "active:scale-[0.97]",
                  )}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent
                className={cn(
                  "ml-auto flex h-full w-[min(100vw,20rem)] flex-col rounded-l-3xl border-l border-[#8B0000]/10",
                  "bg-linear-to-b from-[#FFFCFC] via-white to-[#F9F8F7] p-0 shadow-2xl shadow-[#1a0000]/12 outline-none",
                )}
              >


                <div className="flex flex-col gap-2 p-4">
                  {navItems.map((item) => {
                    const to = item.hash ? { pathname: "/", hash: item.hash } : item.path;
                    const active = isNavItemActive(item);
                    return (
                      <Link
                        key={item.hash ? `${item.path}#${item.hash}` : item.path}
                        to={to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-300",
                          active
                            ? "bg-[#8B0000] text-white shadow-lg shadow-[#8B0000]/30"
                            : "text-[#3D3D3D] hover:bg-[#8B0000]/[0.08] hover:text-[#8B0000]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-[#8B0000]/[0.08] text-[#8B0000] group-hover:bg-[#8B0000]/15",
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        <span className="leading-snug">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-auto border-t border-[#8B0000]/10 p-4">
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-full border-[#8B0000]/25 bg-white/80 text-[#8B0000] hover:bg-[#FFF5F5]"
                    >
                      Close
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </nav>
    </header>
  );
}
