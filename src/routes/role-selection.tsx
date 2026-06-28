import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, UserRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/role-selection")({
  component: RoleSelectionPage,
});

const roles = [
  { role: "authority" as const, title: "Control Room", icon: Building2 },
  { role: "citizen" as const, title: "Citizen", icon: UserRound },
];

function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setDemoRole } = useAuth();
  return (
    <AuthLayout title="Select operating role" description="Role-aware permissions adjust composer access and navigation context.">
      <div className="grid gap-3">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Button
              key={role.role}
              variant="outline"
              className="h-auto justify-start gap-3 p-4"
              onClick={() => {
                setDemoRole(role.role);
                navigate({ to: "/overview", replace: true });
              }}
            >
              <Icon className="h-5 w-5 text-brand" />
              {role.title}
            </Button>
          );
        })}
      </div>
    </AuthLayout>
  );
}
