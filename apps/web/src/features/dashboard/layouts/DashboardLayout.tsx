import { useState } from "react";
import { Outlet } from "react-router-dom";
import { GlobalFooter } from "../components/GlobalFooter";
import { Sidebar } from "../components/Sidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { useDashboardTitle } from "../hooks/useDashboardTitle";

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerTitle = useDashboardTitle(); // <-- Magia pura en una sola línea

  return (
    <div className="flex h-screen bg-app-bg text-app-text-main overflow-hidden app-tech-grid">
  
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-app-bg/75 backdrop-blur-md md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar-bg md:flex flex-col shadow-2xl transition-transform duration-500 md:relative md:translate-x-0 ${
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
        <main className="flex-1 overflow-y-auto p-8 md:p-10 lg:p-12 scroll-smooth bg-app-bg">
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
};