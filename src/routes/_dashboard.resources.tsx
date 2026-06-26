import { createFileRoute } from "@tanstack/react-router";

import { Lightbulb, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { LastUpdated, StatusBadge } from "@/components/shared";
import { resourceIcons, resourceLabels } from "@/lib/labels";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRiskData } from "@/lib/hooks/useRiskData";
import type { ResourceType } from "@/types";

const tabs: Array<"all" | ResourceType> = [
  "all",
  "rescue_team",
  "shelter",
  "medical",
  "food_water",
  "vehicle",
];

function Page_resources() {
  const { resources } = useRiskData();
  const { user } = useAuth();
  const canDeploy = user?.role === "authority" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Track deployable teams, shelters, vehicles, medical units, and relief supplies."
        actions={
          <Button variant="outline">
            <Lightbulb className="h-4 w-4" />
            Allocation Recommendations
          </Button>
        }
      />
      <Tabs defaultValue="all">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab === "all" ? "All" : resourceLabels[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => {
          const filtered =
            tab === "all"
              ? resources
              : resources.filter((resource) => resource.type === tab);
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((resource) => {
                  const Icon = resourceIcons[resource.type];
                  const load =
                    resource.capacity && resource.currentLoad
                      ? Math.round((resource.currentLoad / resource.capacity) * 100)
                      : 0;
                  return (
                    <Card key={resource.id} className="rounded-lg shadow-sm">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
                              <Icon className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="text-sm font-medium">{resource.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {resource.location}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={resource.status} />
                        </div>
                        {resource.capacity ? (
                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Capacity</span>
                              <span>
                                {resource.currentLoad}/{resource.capacity}
                              </span>
                            </div>
                            <Progress value={load} className="h-1.5" />
                          </div>
                        ) : null}
                        <div className="text-sm">
                          <p className="text-muted-foreground">Contact</p>
                          <p className="font-medium">{resource.contact}</p>
                        </div>
                        <LastUpdated timestamp={resource.lastUpdated} />
                        <Button
                          variant={canDeploy ? "default" : "outline"}
                          className="w-full"
                          disabled={!canDeploy}
                        >
                          <PackageCheck className="h-4 w-4" />
                          {canDeploy ? "Deploy / Reassign" : "Read only"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/resources")({
  component: Page_resources,
});
