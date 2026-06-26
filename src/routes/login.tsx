import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout
      title="Sign in to ResQNet"
      description="Use a demo authority, NGO, or citizen profile to enter the offline operations cockpit."
    >
      <LoginForm />
    </AuthLayout>
  );
}
