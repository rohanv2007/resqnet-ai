import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
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
import { useAuth } from "@/lib/hooks/useAuth";
import { submitCitizenReport, updateReportStatus, deleteReport } from "@/lib/reports.functions";
import type { ReportStatus, ReportType } from "@/types";
import { CheckCircle2, Trash2 } from "lucide-react";

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
  locationName: z.string().min(3).max(160),
  severity: z.enum(severityLevels),
  description: z.string().min(12).max(500),
});

type ReportFormValues = z.infer<typeof schema>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function SubmitForm() {
  const { selectedLocation } = useRiskData();
  const { user } = useAuth();
  const submit = useServerFn(submitCitizenReport);
  const qc = useQueryClient();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5 MB)");
      return;
    }
    setImage(f);
    setImagePreview(URL.createObjectURL(f));
  }

  function clearImage() {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(values: ReportFormValues) {
    setSubmitting(true);
    try {
      let image_base64: string | undefined;
      let image_mime: string | undefined;
      if (image) {
        image_base64 = await fileToBase64(image);
        image_mime = image.type || "image/jpeg";
      }
      await submit({
        data: {
          type: values.type,
          description: values.description,
          severity: values.severity,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          location_name: values.locationName,
          reported_by_name: user?.name ?? "Citizen",
          image_base64,
          image_mime,
        },
      });
      toast.success("Report submitted", { description: "Authorities have been notified." });
      form.reset({ ...form.getValues(), description: "" });
      clearImage();
      qc.invalidateQueries({ queryKey: ["live-bundle"] });
    } catch (e) {
      toast.error("Submission failed", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
            <Textarea id="description" maxLength={500} {...form.register("description")} />
            <p className="text-right text-xs text-muted-foreground">{description.length}/500</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPickImage}
          />
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-lg border">
              <img src={imagePreview} alt="Selected" className="h-48 w-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed p-5 text-sm text-muted-foreground transition hover:bg-muted/40"
            >
              <ImagePlus className="h-5 w-5" />
              Tap to add a photo (optional)
            </button>
          )}

          <Button type="submit" className="h-10 w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Page_reports() {
  const { reports } = useRiskData();
  const { user } = useAuth();
  const [tab, setTab] = useState<"all" | ReportStatus>("all");
  const isCitizen = user?.role === "citizen";
  const isResponder = user?.role === "authority" || user?.role === "ngo" || user?.role === "admin";
  const verifyFn = useServerFn(updateReportStatus);
  const deleteFn = useServerFn(deleteReport);
  const qc = useQueryClient();

  // Citizens see only verified/resolved reports; responders see everything.
  const visibleReports = isResponder
    ? reports
    : reports.filter((r) => r.status === "verified" || r.status === "resolved");

  const filteredReports =
    tab === "all" ? visibleReports : visibleReports.filter((report) => report.status === tab);

  async function handleVerify(id: string, status: "verified" | "resolved") {
    try {
      await verifyFn({ data: { id, status } });
      toast.success(status === "verified" ? "Report verified" : "Report marked resolved");
      qc.invalidateQueries({ queryKey: ["live-bundle"] });
    } catch (e) {
      toast.error("Action failed", { description: (e as Error).message });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Report deleted");
      qc.invalidateQueries({ queryKey: ["live-bundle"] });
    } catch (e) {
      toast.error("Delete failed", { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isCitizen ? "Report an Incident" : "Citizen Reports"}
        description={
          isCitizen
            ? "Send field evidence to authorities. Verified updates from your community appear below."
            : "Live feed of citizen reports from the web app and Telegram subscribers. Verify or remove as needed."
        }
      />
      <div className={`grid gap-4 ${isCitizen ? "xl:grid-cols-[420px_1fr]" : "grid-cols-1"}`}>
        {isCitizen && <SubmitForm />}
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
                {filteredReports.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No reports yet.
                  </p>
                ) : (
                  filteredReports.map((report) => {
                    const Icon = reportIcons[report.type];
                    return (
                      <div key={report.id} className="rounded-lg border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <Icon className="mt-1 h-4 w-4 text-brand" />
                            <div>
                              <p className="text-sm font-medium">{reportLabels[report.type]}</p>
                              <p className="text-xs text-muted-foreground">{report.locationName}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge status={report.severity} />
                            <StatusBadge status={report.status} />
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{report.description}</p>
                        {report.imageUrl && (
                          <a href={report.imageUrl} target="_blank" rel="noreferrer">
                            <img
                              src={report.imageUrl}
                              alt="Report evidence"
                              className="mt-3 h-44 w-full rounded-md border object-cover"
                              loading="lazy"
                            />
                          </a>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>by {report.reportedBy}</span>
                          <LastUpdated timestamp={report.reportedAt} />
                        </div>
                      </div>
                    );
                  })
                )}
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
