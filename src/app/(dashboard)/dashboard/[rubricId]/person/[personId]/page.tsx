export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRubricById } from "@/lib/queries/rubrics";
import { getPersonById, getPersonScores } from "@/lib/queries/people";
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
import { ScoreTrendLine } from "@/components/charts/score-trend-line";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ rubricId: string; personId: string }>;
}) {
  const { rubricId, personId } = await params;

  const [rubric, person, scores] = await Promise.all([
    getRubricById(rubricId),
    getPersonById(personId),
    getPersonScores(personId, rubricId),
  ]);

  if (!rubric || !person) notFound();

  // Compute overall average from latest scores
  const latestScores = scores.map((s) => {
    const latest = s.values[s.values.length - 1];
    return latest?.value ?? 0;
  });
  const overallAvg =
    latestScores.length > 0
      ? latestScores.reduce((a, b) => a + b, 0) / latestScores.length
      : 0;

  // Get all unique dates
  const allDates = [...new Set(scores.flatMap((s) => s.values.map((v) => v.assessedAt)))].sort();

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
        <SkillRadarChart data={scores} />
        <ScoreTrendLine data={scores} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Details</CardTitle>
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
                {scores.map((score) => (
                  <TableRow key={score.subScoreId}>
                    <TableCell className="text-muted-foreground">
                      {score.skillName}
                    </TableCell>
                    <TableCell className="font-medium">
                      {score.subScoreName}
                    </TableCell>
                    {allDates.map((date) => {
                      const match = score.values.find(
                        (v) => v.assessedAt === date
                      );
                      return (
                        <TableCell key={date} className="text-center">
                          {match ? match.value : "—"}
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
