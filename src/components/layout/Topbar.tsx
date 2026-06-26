
import { Bell, Search, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DataSourceIndicator } from "@/components/shared";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLocation } from "@/lib/hooks/useLocation";
import { useRiskData } from "@/lib/hooks/useRiskData";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar() {
  const { user } = useAuth();
  const {
    locations,
    selectedLocation,
    selectedLocationId,
    setSelectedLocationId,
  } = useLocation();
  const { activeSources } = useRiskData();
  const selectedStateCode = selectedLocation.id.split("-")[0].toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <div className="lg:hidden">
          <MobileNav />
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border bg-card px-3 sm:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search tasks and incidents"
            placeholder="Search incidents, shelters, alerts..."
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Select
          value={selectedLocationId}
          onValueChange={(value) => {
            if (value) {
              setSelectedLocationId(value);
            }
          }}
        >
          <SelectTrigger className="max-w-[210px] rounded-full bg-card">
            <span className="truncate">
              {selectedStateCode} - {selectedLocation.name}
            </span>
          </SelectTrigger>
          <SelectContent align="end">
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.id.split("-")[0].toUpperCase()} - {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DataSourceIndicator activeSources={activeSources} />
        <ThemeToggle />
        <Button variant="outline" size="icon" className="rounded-full">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="bg-brand-light text-brand">
              {user?.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2) ?? "RQ"}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="flex items-center gap-1 text-sm font-medium">
              {user?.name ?? "Guest"}
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            </p>
            <p className="text-[11px] capitalize text-muted-foreground">
              {user?.role ?? "offline"} access
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
