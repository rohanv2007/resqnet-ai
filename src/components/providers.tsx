import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/auth-context";
import { LocationProvider } from "@/lib/hooks/useLocation";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <LocationProvider>{children}</LocationProvider>
        </AuthProvider>
        <Toaster richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
