import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardGuard } from "@/components/layout/DashboardGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <DashboardGuard>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-60">
          <Topbar />
          <main className="p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
