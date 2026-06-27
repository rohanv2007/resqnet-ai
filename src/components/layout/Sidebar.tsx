import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  ClipboardList,
  Gauge,
  LifeBuoy,
  LogOut,
  Map,
  Package,
  Route,
  Settings,
  Shield,
  Waves,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";

const navItems = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/risk-map", label: "Risk Map", icon: Map },
  { href: "/earthquakes", label: "Earthquakes", icon: Activity },
  { href: "/simulation", label: "Simulation", icon: ChartNoAxesCombined },
  { href: "/evacuation", label: "Evacuation", icon: Route },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/resources", label: "Resources", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-sidebar lg:block">
      <div className="flex h-full flex-col">
        <Link to="/overview" className="flex h-16 items-center gap-3 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">ResQNet</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Disaster Intelligence
            </p>
          </div>
        </Link>
        <Separator />
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Operations
          </p>
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <div className="mb-3 rounded-lg border bg-brand-light p-3 text-brand-dark dark:text-teal-100">
            <Waves className="mb-2 h-4 w-4" />
            <p className="text-xs font-semibold">Field mode ready</p>
            <p className="mt-1 text-[11px] opacity-80">
              Mock feeds available offline for demo response drills.
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <div className="mt-2 flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
            <LifeBuoy className="h-3.5 w-3.5" />
            NDRF control room profile
          </div>
        </div>
      </div>
    </aside>
  );
}
