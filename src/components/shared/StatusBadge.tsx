import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  low: "border-risk-low/20 bg-risk-low-bg text-risk-low",
  watch: "border-risk-watch/20 bg-risk-watch-bg text-risk-watch",
  warning: "border-risk-warning/20 bg-risk-warning-bg text-risk-warning",
  danger: "border-risk-danger/20 bg-risk-danger-bg text-risk-danger",
  draft: "border-muted bg-muted text-muted-foreground",
  sent:
    "border-[#bae6fd] bg-[#eff6ff] text-[#1d4ed8] dark:border-[#38bdf8]/40 dark:bg-[#082f49] dark:text-[#bae6fd]",
  delivered: "border-risk-low/20 bg-risk-low-bg text-risk-low",
  failed: "border-risk-danger/20 bg-risk-danger-bg text-risk-danger",
  new:
    "border-[#bae6fd] bg-[#eff6ff] text-[#1d4ed8] dark:border-[#38bdf8]/40 dark:bg-[#082f49] dark:text-[#bae6fd]",
  verified: "border-risk-low/20 bg-risk-low-bg text-risk-low",
  duplicate: "border-muted bg-muted text-muted-foreground",
  resolved: "border-brand/20 bg-brand-light text-brand dark:text-teal-200",
  available: "border-risk-low/20 bg-risk-low-bg text-risk-low",
  deployed:
    "border-[#bae6fd] bg-[#eff6ff] text-[#1d4ed8] dark:border-[#38bdf8]/40 dark:bg-[#082f49] dark:text-[#bae6fd]",
  maintenance: "border-risk-watch/20 bg-risk-watch-bg text-risk-watch",
  open: "border-risk-low/20 bg-risk-low-bg text-risk-low",
  full: "border-risk-warning/20 bg-risk-warning-bg text-risk-warning",
  closed: "border-muted bg-muted text-muted-foreground",
  active: "border-brand/20 bg-brand-light text-brand dark:text-teal-200",
};

export function StatusBadge({
  status,
  className,
  children,
}: {
  status: string;
  variant?: "risk" | "alert" | "report" | "resource";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        statusStyles[status] ?? "border-muted bg-muted text-muted-foreground",
        className,
      )}
    >
      {children ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
