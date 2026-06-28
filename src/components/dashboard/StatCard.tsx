import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "brand" | "danger";
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-lg shadow-sm",
        tone === "brand" &&
          "border-brand bg-brand text-white dark:border-brand/40 dark:bg-brand-light dark:text-brand-dark",
        tone === "danger" &&
          "border-risk-danger/40 bg-risk-danger-bg text-risk-danger",
      )}
    >
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs font-medium text-muted-foreground sm:text-sm",
                tone === "brand" && "text-white/80 dark:text-brand-dark",
                tone === "danger" && "text-risk-danger",
              )}
            >
              {title}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl">{value}</p>
          </div>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand sm:h-9 sm:w-9",
              tone === "brand" && "bg-white/15 text-white dark:bg-brand/15 dark:text-brand",
              tone === "danger" && "bg-risk-danger/15 text-risk-danger",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p
          className={cn(
            "mt-2 text-[11px] leading-snug text-muted-foreground sm:mt-3 sm:text-xs",
            tone === "brand" && "text-white/80 dark:text-brand-dark",
            tone === "danger" && "text-risk-danger",
          )}
        >
          {detail}
        </p>
      </CardContent>
    </Card>
  );
}
