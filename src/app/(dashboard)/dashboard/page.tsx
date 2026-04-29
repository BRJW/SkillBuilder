export const dynamic = "force-dynamic";

import Link from "next/link";
import { getRubrics } from "@/lib/queries/rubrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default async function DashboardIndexPage() {
  const rubrics = await getRubrics();

  if (rubrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No rubrics yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create a rubric first to view the dashboard.
        </p>
        <Button className="mt-4" render={<Link href="/rubrics/new" />}>
          Create Rubric
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Select a rubric to view analytics.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rubrics.map((rubric) => (
          <Link key={rubric.id} href={`/dashboard/${rubric.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{rubric.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {rubric.subScores.length} sub-scores
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
