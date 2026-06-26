import { DatabaseZap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function DataSourceIndicator({
  activeSources,
  totalSources = 7,
}: {
  activeSources: string[];
  totalSources?: number;
}) {
  const degraded = activeSources.length < totalSources;

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="gap-2 rounded-full" />}
      >
          <span
            className={
              degraded
                ? "h-2 w-2 rounded-full bg-risk-watch"
                : "h-2 w-2 rounded-full bg-risk-low"
            }
          />
          <DatabaseZap className="h-4 w-4" />
          <span className="hidden sm:inline">
            {activeSources.length}/{totalSources} sources
          </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Active data sources</p>
            <p className="text-xs text-muted-foreground">
              Live mock feed for the current operational area.
            </p>
          </div>
          <div className="grid gap-2">
            {activeSources.map((source) => (
              <div key={source} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-risk-low" />
                {source}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
