import { Link, useLocation } from "react-router-dom";
import { Menu, Home, Activity, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Tracker", path: "/khatam", icon: Activity },
    { name: "Metrics", path: "/metrics", icon: BarChart2 },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <span className="text-lg font-semibold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Quran Khatam
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                isActive(item.path) ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.name}
              {isActive(item.path) && (
                <span className="absolute inset-x-0 -bottom-[19px] h-0.5 bg-primary animate-fadeIn" />
              )}
            </Link>
          ))}
        </div>

        {/* Mobile Navigation (Drawer) */}
        <div className="md:hidden">
          <Drawer direction="right" open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-full w-[300px] rounded-l-2xl border-l outline-none">
              <DrawerHeader className="border-b pb-4 pt-6 px-6">
                <DrawerTitle className="flex items-center gap-2">
                  <span style={{ fontFamily: "'Playfair Display', serif" }}>Quran Khatam</span>
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Navigation Menu
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-2 p-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                      isActive(item.path)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="mt-auto p-4 border-t">
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full">Close</Button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
}
