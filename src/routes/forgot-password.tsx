import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset password"
      description="Prototype reset flow for control room users."
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Registered email</Label>
          <Input id="reset-email" type="email" placeholder="name@agency.gov.in" />
        </div>
        <Link
          to="/reset-password"
          className={buttonVariants({ className: "h-10 w-full" })}
        >
          Send reset link
        </Link>
      </form>
    </AuthLayout>
  );
}
