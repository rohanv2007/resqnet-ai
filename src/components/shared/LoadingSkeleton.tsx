import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({
  variant = "card",
}: {
  variant?: "card" | "list-item" | "chart" | "map";
}) {
  if (variant === "chart") {
    return <Skeleton className="h-72 w-full rounded-lg" />;
  }

  if (variant === "map") {
    return <Skeleton className="h-[360px] w-full rounded-lg" />;
  }

  if (variant === "list-item") {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }

  return <Skeleton className="h-40 w-full rounded-lg" />;
}
