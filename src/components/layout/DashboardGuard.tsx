"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/shared";
import { useAuth } from "@/lib/hooks/useAuth";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const isClient = useIsClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isClient && !isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isClient, isLoading, pathname, router, user]);

  if (!isClient) {
    return null;
  }

  if (isLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md space-y-4">
          <LoadingSkeleton />
          <LoadingSkeleton variant="list-item" />
        </div>
      </div>
    );
  }

  return children;
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
