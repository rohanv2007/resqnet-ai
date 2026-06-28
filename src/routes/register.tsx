import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/useAuth";
import type { AlertLanguage, UserRole } from "@/types";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
  role: z.enum(["citizen", "authority", "ngo", "admin"]),
  language: z.enum([
    "english",
    "hindi",
    "malayalam",
    "tamil",
    "telugu",
    "kannada",
    "bengali",
    "odia",
  ]),
  district: z.string().min(2),
});

type RegisterValues = z.infer<typeof schema>;

function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      role: "authority",
      language: "english",
      district: "Ernakulam",
    },
  });
  const role = useWatch({ control: form.control, name: "role" });
  const language = useWatch({ control: form.control, name: "language" });

  async function onSubmit(values: RegisterValues) {
    await registerUser({
      id: crypto.randomUUID(),
      name: values.name,
      email: values.email,
      mobile: values.mobile,
      role: values.role as UserRole,
      language: values.language as AlertLanguage,
      state: values.district === "Puri" ? "Odisha" : "Kerala",
      district: values.district,
      isVerified: values.role !== "authority",
      department:
        values.role === "authority"
          ? "District Disaster Management Authority"
          : undefined,
      organization: values.role === "ngo" ? "Field Partner" : undefined,
    });
    navigate({ to: "/verify-otp", replace: true });
  }

  return (
    <AuthLayout
      title="Register field access"
      description="Create a mock profile with role-aware dashboard permissions."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input id="mobile" {...form.register("mobile")} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(value) => {
                if (value) {
                  form.setValue("role", value as RegisterValues["role"]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="authority">Control Room</SelectItem>
                <SelectItem value="citizen">Citizen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={language}
              onValueChange={(value) => {
                if (value) {
                  form.setValue("language", value as RegisterValues["language"]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="malayalam">Malayalam</SelectItem>
                <SelectItem value="tamil">Tamil</SelectItem>
                <SelectItem value="odia">Odia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="district">District</Label>
            <Input id="district" {...form.register("district")} />
          </div>
        </div>
        <Button type="submit" className="h-10 w-full">
          Continue to verification
        </Button>
      </form>
    </AuthLayout>
  );
}
