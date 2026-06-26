import { createFileRoute } from "@tanstack/react-router";

import { useTheme } from "next-themes";
import { Bell, Database, MapPin, Moon, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLocation } from "@/lib/hooks/useLocation";

function Page_settings() {
  const { user, setDemoRole } = useAuth();
  const { selectedLocation } = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage profile, language, jurisdiction, role, and appearance preferences."
      />
      <Tabs
        defaultValue="profile"
        orientation="vertical"
        className="grid gap-4 xl:grid-cols-[260px_1fr] xl:items-start"
      >
        <TabsList className="h-auto w-full flex-col items-stretch justify-start rounded-lg border bg-card p-2">
          <TabsTrigger value="profile" className="h-10 flex-none justify-start px-3">
            <UserRound className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="alerts" className="h-10 flex-none justify-start px-3">
            <Bell className="h-4 w-4" />
            Language & Alerts
          </TabsTrigger>
          <TabsTrigger value="location" className="h-10 flex-none justify-start px-3">
            <MapPin className="h-4 w-4" />
            Location
          </TabsTrigger>
          <TabsTrigger value="access" className="h-10 flex-none justify-start px-3">
            <ShieldCheck className="h-4 w-4" />
            Role & Access
          </TabsTrigger>
          <TabsTrigger value="appearance" className="h-10 flex-none justify-start px-3">
            <Moon className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="system" className="h-10 flex-none justify-start px-3">
            <Database className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>
        <div>
          <TabsContent value="profile" className="mt-0">
            <SettingsCard title="Profile">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" value={user?.name ?? ""} />
                <Field label="Email" value={user?.email ?? ""} />
                <Field label="Mobile" value={user?.mobile ?? ""} />
                <Field label="District" value={user?.district ?? ""} />
              </div>
            </SettingsCard>
          </TabsContent>
          <TabsContent value="alerts" className="mt-0">
            <SettingsCard title="Language & Alerts">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Preferred language</Label>
                  <Select defaultValue={user?.language ?? "english"}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="malayalam">Malayalam</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {["SMS", "WhatsApp", "IVR", "Push"].map((channel) => (
                  <label
                    key={channel}
                    className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm"
                  >
                    {channel}
                    <Switch defaultChecked />
                  </label>
                ))}
              </div>
            </SettingsCard>
          </TabsContent>
          <TabsContent value="location" className="mt-0">
            <SettingsCard title="Location">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Home location" value={selectedLocation.name} />
                <Field label="Jurisdiction" value={selectedLocation.district} />
                <Field label="State" value={selectedLocation.state} />
                <Field
                  label="Population"
                  value={selectedLocation.population.toLocaleString("en-IN")}
                />
              </div>
            </SettingsCard>
          </TabsContent>
          <TabsContent value="access" className="mt-0">
            <SettingsCard title="Role & Access">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-background p-4">
                  <div>
                    <p className="text-sm font-medium">Current role</p>
                    <p className="text-xs text-muted-foreground">
                      Switch demo role to inspect permission states.
                    </p>
                  </div>
                  <StatusBadge status={user?.role ?? "citizen"} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["authority", "ngo", "citizen", "admin"] as const).map((role) => (
                    <Button
                      key={role}
                      variant={user?.role === role ? "default" : "outline"}
                      onClick={() => setDemoRole(role)}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
            </SettingsCard>
          </TabsContent>
          <TabsContent value="appearance" className="mt-0">
            <SettingsCard title="Appearance">
              <div className="grid gap-3 sm:grid-cols-3">
                {["light", "dark", "system"].map((mode) => (
                  <Button
                    key={mode}
                    variant={theme === mode ? "default" : "outline"}
                    onClick={() => setTheme(mode)}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </SettingsCard>
          </TabsContent>
          <TabsContent value="system" className="mt-0">
            <SettingsCard title="System">
              <div className="grid gap-3">
                {["IMD", "CWC", "ISRO-NRSC", "MOSDAC", "Citizen Reports"].map(
                  (source) => (
                    <div
                      key={source}
                      className="flex items-center justify-between rounded-lg border bg-background p-3"
                    >
                      <span className="text-sm">{source}</span>
                      <StatusBadge status="active" />
                    </div>
                  ),
                )}
              </div>
            </SettingsCard>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} readOnly />
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/settings")({
  component: Page_settings,
});
