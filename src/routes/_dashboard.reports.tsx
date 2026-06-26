import { createFileRoute } from "@tanstack/react-router";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { LastUpdated, StatusBadge } from "@/components/shared";
import { reportIcons, reportLabels } from "@/lib/labels";
import { useRiskData } from "@/lib/hooks/useRiskData";
import type { ReportStatus, ReportType } from "@/types";

const reportTypes = [
  "rising_water",
  "blocked_road",
  "fire",
  "damaged_bridge",
  "shelter_overcrowding",
  "power_failure",
] as const satisfies readonly ReportType[];

const severityLevels = ["watch", "warning", "danger"] as const;

const schema = z.object({
  type: z.enum(reportTypes),
  locationName: z.string().min(3),
  severity: z.enum(severityLevels),
  description: z.string().min(12).max(500),
});

type ReportFormValues = z.infer<typeof schema>;

function Page_reports() {
  const { reports, selectedLocation } = useRiskData();
  const [tab, setTab] = useState<"all" | ReportStatus>("all");
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "rising_water",
      locationName: selectedLocation.name,
      severity: "warning",
      description: "",
    },
  });
  const reportType = useWatch({ control: form.control, name: "type" });
  const severity = useWatch({ control: form.control, name: "severity" });
  const description = useWatch({ control: form.control, name: "description" });

  const filteredReports =
    tab === "all" ? reports : reports.filter((report) => report.status === tab);

  function onSubmit() {
    toast.success("Field report queued", {
      description: "The mock control room feed has accepted this report.",
    });
    form.reset({ ...form.getValues(), description: "" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citizen Reports"
        description="Capture field evidence and review verification status."
      />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Submit a Field Report</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-2">
                {reportTypes.map((type) => {
                  const Icon = reportIcons[type];
                  const active = reportType === type;
                  return (
                    <button
                      type="button"
                      key={type}
                      onClick={() => form.setValue("type", type)}
                      className={`rounded-lg border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        active ? "border-brand bg-brand-light text-brand" : "bg-card"
                      }`}
                    >
                      <Icon className="mb-2 h-4 w-4" />
                      {reportLabels[type]}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationName">Location</Label>
                <div className="flex gap-2">
                  <Input id="locationName" {...form.register("locationName")} />
                  <Button type="button" variant="outline" size="icon">
                    <MapPin className="h-4 w-4" />
                    <span className="sr-only">Use current location</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <div className="grid grid-cols-3 gap-2">
                  {severityLevels.map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={severity === level ? "default" : "outline"}
                      onClick={() => form.setValue("severity", level)}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  maxLength={500}
                  {...form.register("description")}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {description.length}/500
                </p>
              </div>
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                <ImagePlus className="mx-auto mb-2 h-5 w-5" />
                Image upload placeholder
              </div>
              <Button type="submit" className="h-10 w-full">
                Submit Report
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Reports Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="new">New</TabsTrigger>
                <TabsTrigger value="verified">Verified</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-4 grid gap-3">
                {filteredReports.map((report) => {
                  const Icon = reportIcons[report.type];
                  return (
                    <div key={report.id} className="rounded-lg border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <Icon className="mt-1 h-4 w-4 text-brand" />
                          <div>
                            <p className="text-sm font-medium">
                              {reportLabels[report.type]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {report.locationName}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={report.severity} />
                          <StatusBadge status={report.status} />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {report.description}
                      </p>
                      <LastUpdated timestamp={report.reportedAt} />
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/reports")({
  component: Page_reports,
});
