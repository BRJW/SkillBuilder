export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRubricById } from "@/lib/queries/rubrics";
import { getPersonById, getPersonSteps } from "@/lib/queries/people";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkillRadarChart } from "@/components/charts/skill-radar-chart";
import { StepTrendLine } from "@/components/charts/step-trend-line";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ rubricId: string; personId: string }>;
}) {
  const { rubricId, personId } = await params;

  const [rubric, person, steps] = await Promise.all([
    getRubricById(rubricId),
    getPersonById(personId),
    getPersonSteps(personId, rubricId),
  ]);

  if (!rubric || !person) notFound();

  // Compute overall average from latest steps
  const latestSteps = steps.map((s) => {
    const latest = s.values[s.values.length - 1];
    return latest?.value ?? 0;
  });
  const overallAvg =
    latestSteps.length > 0
      ? latestSteps.reduce((a, b) => a + b, 0) / latestSteps.length
      : 0;

  // Get all unique dates
  const allDates = [...new Set(steps.flatMap((s) => s.values.map((v) => v.assessedAt)))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href={`/dashboard/${rubricId}`} />}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {person.firstName} {person.lastName}
          </h1>
          <p className="text-muted-foreground">
            {person.group.name} &middot; {rubric.name}
          </p>
        </div>
        <Badge variant={overallAvg >= 70 ? "default" : "secondary"} className="text-lg px-3 py-1">
          {overallAvg.toFixed(1)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillRadarChart data={steps} />
        <StepTrendLine data={steps} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Sub-Score</TableHead>
                  {allDates.map((date) => (
                    <TableHead key={date} className="text-center whitespace-nowrap">
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "2-digit",
                      })}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map((step) => (
                  <TableRow key={step.subScoreId}>
                    <TableCell className="text-muted-foreground">
                      {step.skillName}
                    </TableCell>
                    <TableCell className="font-medium">
                      {step.subScoreName}
                    </TableCell>
                    {allDates.map((date) => {
                      const match = step.values.find(
                        (v) => v.assessedAt === date
                      );
                      return (
                        <TableCell key={date} className="text-center">
                          {match ? match.value.toFixed(2) : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
