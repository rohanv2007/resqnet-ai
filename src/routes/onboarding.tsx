import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, RadioTower, Users } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const steps = [
  { icon: MapPin, title: "Home jurisdiction", text: "Aluva, Ernakulam is selected as the mock operational area." },
  { icon: RadioTower, title: "Alert channels", text: "SMS, WhatsApp, IVR, Telegram, and push alerts are enabled." },
  { icon: Users, title: "Field contacts", text: "Ward volunteers and control room responders are preloaded." },
];

function OnboardingPage() {
  const navigate = useNavigate();
  return (
    <AuthLayout title="Complete setup" description="Review the mock operational defaults for this demo profile.">
      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex gap-3 rounded-lg border bg-card p-4">
              <Icon className="mt-0.5 h-5 w-5 text-brand" />
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
              </div>
            </div>
          );
        })}
        <Button className="h-10 w-full" onClick={() => navigate({ to: "/overview", replace: true })}>
          Enter operations dashboard
        </Button>
      </div>
    </AuthLayout>
  );
}
