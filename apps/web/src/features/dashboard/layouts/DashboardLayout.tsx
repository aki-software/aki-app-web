import { useState } from "react";
import { Outlet } from "react-router-dom";
import { GlobalFooter } from "../components/GlobalFooter";
import { Sidebar } from "../components/Sidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { useDashboardTitle } from "../hooks/useDashboardTitle";

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerTitle = useDashboardTitle();

  return (
    <div className="flex h-dvh overflow-hidden bg-app-bg text-app-text-main app-tech-grid">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-app-bg/75 backdrop-blur-md xl:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar-bg shadow-2xl transition-transform duration-500 xl:relative xl:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader
          title={headerTitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto scroll-smooth bg-app-bg p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col animate-in">
            <div className="flex-1">
              <Outlet />
            </div>
            <GlobalFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
