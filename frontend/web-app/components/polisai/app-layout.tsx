"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNavbar } from "@/components/polisai/app-navbar";
import { AppSidebar } from "@/components/polisai/app-sidebar";
import { cn } from "@/lib/utils";

export function PolisAppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[5.5rem]" : "w-[17.5rem]"
        )}
      >
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 transition lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-city-graphite/28 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className={cn(
            "absolute inset-y-3 left-3 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg shadow-glass transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-[110%]"
          )}
        >
          <AppSidebar mobile onClose={() => setMobileOpen(false)} />
        </div>
      </div>

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[5.5rem]" : "lg:pl-[17.5rem]"
        )}
      >
        <AppNavbar
          collapsed={collapsed}
          onSidebarToggle={() => setCollapsed((value) => !value)}
          onMobileMenu={() => setMobileOpen(true)}
        />
        <main id="main-content" tabIndex={-1} className="min-w-0 px-3 pb-8 pt-4 outline-none sm:px-5 sm:pb-10 lg:px-7">
          <div className="page-frame">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
