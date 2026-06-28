import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChartNoAxesCombined,
  ClipboardList,
  Gauge,
  Map,
  Menu,
  Package,
  Route,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useAuth } from "@/lib/hooks/useAuth";

const allItems = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/risk-map", label: "Risk Map", icon: Map },
  { href: "/simulation", label: "Simulation", icon: ChartNoAxesCombined, authorityOnly: true },
  { href: "/evacuation", label: "Evacuation", icon: Route },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/alerts", label: "Alerts", icon: Bell, authorityOnly: true },
  { href: "/resources", label: "Resources", icon: Package, authorityOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const { user } = useAuth();
  const isAuthority = user?.role === "authority" || user?.role === "admin";
  const items = allItems.filter((i) => isAuthority || !i.authorityOnly);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
              <Shield className="h-4 w-4" />
            </span>
            ResQNet
          </SheetTitle>
        </SheetHeader>
        <nav className="grid gap-1 px-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
