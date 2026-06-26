import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/verify-otp")({
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const complete = digits.every(Boolean);
  return (
    <AuthLayout title="Verify access" description="Enter the mock OTP sent to the registered mobile number.">
      <div className="space-y-6">
        <div className="grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <Input
              key={index}
              aria-label={`OTP digit ${index + 1}`}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              className="h-14 text-center text-lg"
              onChange={(event) => {
                const next = [...digits];
                next[index] = event.target.value.replace(/\D/g, "").slice(0, 1);
                setDigits(next);
              }}
            />
          ))}
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Use any six digits for the prototype. Resend available in 00:28.
        </div>
        <Button className="h-10 w-full" disabled={!complete} onClick={() => navigate({ to: "/onboarding", replace: true })}>
          <CheckCircle2 className="h-4 w-4" />
          Verify and continue
        </Button>
      </div>
    </AuthLayout>
  );
}
