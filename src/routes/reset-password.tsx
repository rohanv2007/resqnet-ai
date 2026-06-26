import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Choose new password"
      description="This is a local mock form; no password is stored."
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" />
          <Progress value={72} className="h-1.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input id="confirm-password" type="password" />
        </div>
        <Link to="/login" className={buttonVariants({ className: "h-10 w-full" })}>
          Update password
        </Link>
      </form>
    </AuthLayout>
  );
}
