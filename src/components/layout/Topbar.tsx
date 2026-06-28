
import { useMemo, useState } from "react";
import { Bell, Check, ChevronDown, Search, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DataSourceIndicator } from "@/components/shared";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLocation } from "@/lib/hooks/useLocation";
import { useRiskData } from "@/lib/hooks/useRiskData";
import { cn } from "@/lib/utils";
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
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof locations>();
    for (const loc of locations) {
      const code = loc.id.split("-")[0].toUpperCase();
      const arr = map.get(code) ?? [];
      arr.push(loc);
      map.set(code, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [locations]);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              size="sm"
              className="ml-auto h-9 min-w-0 max-w-[160px] flex-shrink justify-between rounded-full bg-card px-3 sm:ml-0 sm:max-w-[210px]"
            >
              <span className="truncate text-xs sm:text-sm">
                {selectedStateCode} · {selectedLocation.name}
              </span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-60 sm:ml-2 sm:h-4 sm:w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[260px] p-0 sm:w-[280px]">
            <Command>
              <CommandInput placeholder="Search city or state..." />
              <CommandList className="max-h-[320px]">
                <CommandEmpty>No location found.</CommandEmpty>
                {grouped.map(([code, locs]) => (
                  <CommandGroup key={code} heading={code}>
                    {locs.map((location) => (
                      <CommandItem
                        key={location.id}
                        value={`${code} ${location.name}`}
                        onSelect={() => {
                          setSelectedLocationId(location.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedLocationId === location.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {location.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="hidden sm:block">
          <DataSourceIndicator activeSources={activeSources} />
        </div>
        <ThemeToggle />
        <Button variant="outline" size="icon" className="hidden h-9 w-9 rounded-full sm:inline-flex">
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
              {user?.role === "authority" ? "Control room" : user?.role ?? "offline"} access
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

