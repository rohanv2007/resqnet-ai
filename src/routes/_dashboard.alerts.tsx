import { createFileRoute } from "@tanstack/react-router";

import { LockKeyhole, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { LastUpdated, StatusBadge } from "@/components/shared";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRiskData } from "@/lib/hooks/useRiskData";

const channels = ["SMS", "IVR", "WhatsApp", "Telegram", "Push"];

function Page_alerts() {
  const { user } = useAuth();
  const { alerts, selectedLocation } = useRiskData();
  const canCompose = user?.role === "authority" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Compose public warnings and audit delivery history."
      />
      <div className="grid gap-4 xl:grid-cols-[480px_1fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-brand" />
              Compose Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canCompose ? (
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  toast.success("Mock alert scheduled", {
                    description: "Delivery metrics will appear in history.",
                  });
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="area">Area</Label>
                    <Input id="area" defaultValue={selectedLocation.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select defaultValue="english">
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
                </div>
                <div className="space-y-2">
                  <Label>Risk Level</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {["low", "watch", "warning", "danger"].map((level) => (
                      <Button
                        key={level}
                        type="button"
                        variant={level === "danger" ? "default" : "outline"}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Channels</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {channels.map((channel) => (
                      <label
                        key={channel}
                        className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          className="accent-brand"
                        />
                        {channel}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    defaultValue="Heavy rainfall expected in next 24 hours. Evacuate low-lying areas immediately and follow control room instructions."
                    maxLength={320}
                  />
                </div>
                <div className="rounded-lg border bg-brand-light p-4 text-sm text-brand-dark dark:text-teal-100">
                  <p className="font-medium">Estimated reach</p>
                  <p className="mt-1">~28,000 recipients across selected channels.</p>
                </div>
                <Button type="submit" className="h-10 w-full">
                  <Send className="h-4 w-4" />
                  Send Alert
                </Button>
              </form>
            ) : (
              <div className="rounded-lg border bg-muted/40 p-6 text-center">
                <LockKeyhole className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium">Authority access required</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Citizens and NGO users can read alert history but cannot compose
                  public warnings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Alert History</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.title}</TableCell>
                    <TableCell>{alert.locationName}</TableCell>
                    <TableCell className="uppercase">{alert.language}</TableCell>
                    <TableCell>
                      {alert.recipientCount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={alert.status} />
                    </TableCell>
                    <TableCell>
                      <LastUpdated timestamp={alert.sentAt} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/alerts")({
  component: Page_alerts,
});
