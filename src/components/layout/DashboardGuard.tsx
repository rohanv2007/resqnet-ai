import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LoadingSkeleton } from "@/components/shared";
import { useAuth } from "@/lib/hooks/useAuth";

export function DashboardGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isLoading && !user) {
      navigate({
        to: "/login",
        search: { next: pathname },
        replace: true,
      });
    }
    if (isClient && !isLoading && user) {
      const authorityOnly = ["/simulation", "/alerts", "/resources"];
      const isAuthority = user.role === "authority" || user.role === "admin";
      if (!isAuthority && authorityOnly.some((p) => pathname.startsWith(p))) {
        navigate({ to: "/overview", replace: true });
      }
    }
  }, [isClient, isLoading, pathname, navigate, user]);

  if (!isClient) return null;

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

  return <>{children}</>;
}
