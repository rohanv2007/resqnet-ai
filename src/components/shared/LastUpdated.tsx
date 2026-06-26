
import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";

export function LastUpdated({ timestamp }: { timestamp: string }) {
  const [now, setNow] = useState<number | null>(null);
  const date = new Date(timestamp);
  const isStale = now !== null && now - date.getTime() > 30 * 60_000;

  useEffect(() => {
    const timeout = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <span
      className={cn(
        "text-xs text-muted-foreground",
        isStale && "text-risk-watch",
      )}
    >
      Updated {formatDistanceToNowStrict(date, { addSuffix: true })}
      {isStale ? " - data may be stale" : ""}
    </span>
  );
}
