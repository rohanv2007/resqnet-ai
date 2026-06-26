import { Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_USERS } from "@/lib/auth/auth-service";
import { useAuth } from "@/lib/hooks/useAuth";
import type { User } from "@/types";

const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or mobile number"),
  password: z.string().min(4, "Use any demo password with 4+ characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { login, setDemoRole } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "collector.ernakulam@resqnet.in",
      password: "demo1234",
    },
  });

  async function onSubmit(values: LoginValues) {
    await login(values);
    toast.success("Session restored", {
      description: "Opening the ResQNet operations dashboard.",
    });
    navigate({ to: "/overview", replace: true });
  }

  function handleDemoUser(user: User) {
    setValue("identifier", user.email ?? user.mobile ?? "");
    setValue("password", "demo1234");
    setDemoRole(user.role);
    navigate({ to: "/overview", replace: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or mobile</Label>
        <Input id="identifier" {...register("identifier")} />
        {errors.identifier ? (
          <p className="text-xs text-destructive">{errors.identifier.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link to="/forgot-password" className="text-xs text-brand">
            Forgot password?
          </Link>
        </div>
        <Input id="password" type="password" {...register("password")} />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Opening dashboard..." : "Open dashboard"}
      </Button>
      <div className="grid gap-2 rounded-lg border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Demo access profiles
        </p>
        {DEMO_USERS.map((user) => (
          <Button
            key={user.id}
            type="button"
            variant="outline"
            className="justify-between"
            onClick={() => handleDemoUser(user)}
          >
            <span>{user.name}</span>
            <span className="text-xs capitalize text-muted-foreground">
              {user.role}
            </span>
          </Button>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        New control room?{" "}
        <Link className="font-medium text-brand" to="/register">
          Register access
        </Link>
      </p>
    </form>
  );
}
