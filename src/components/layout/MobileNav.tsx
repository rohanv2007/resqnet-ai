"use client";

import Link from "next/link";
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

const items = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/risk-map", label: "Risk Map", icon: Map },
  { href: "/simulation", label: "Simulation", icon: ChartNoAxesCombined },
  { href: "/evacuation", label: "Evacuation", icon: Route },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/resources", label: "Resources", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="icon" />}>
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open navigation</span>
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
                href={item.href}
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
