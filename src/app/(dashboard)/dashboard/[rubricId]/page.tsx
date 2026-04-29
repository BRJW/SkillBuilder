export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRubricById } from "@/lib/queries/rubrics";
import { getSchools } from "@/lib/queries/schools";
import {
  getAggregateStats,
  getScoreDistribution,
  getPercentileBands,
  getSubScoreAverages,
} from "@/lib/queries/scores";
import { getPeopleByRubric } from "@/lib/queries/people";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { StatsCards } from "@/components/charts/stats-cards";
import { ScoreDistributionChart } from "@/components/charts/score-distribution-chart";
import { PercentileBandsChart } from "@/components/charts/percentile-bands-chart";
import { SubScoreBarChart } from "@/components/charts/sub-score-bar-chart";
import { PersonTable } from "@/components/people/person-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardFilters } from "@/lib/types";

export default async function RubricDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ rubricId: string }>;
  searchParams: Promise<{ school?: string; from?: string; to?: string }>;
}) {
  const { rubricId } = await params;
  const sp = await searchParams;

  const rubric = await getRubricById(rubricId);
  if (!rubric) notFound();

  const filters: DashboardFilters = {
    schoolIds: sp.school ? [sp.school] : undefined,
    dateFrom: sp.from,
    dateTo: sp.to,
  };

  const [schools, stats, distribution, percentiles, subScoreAvgs, people] =
    await Promise.all([
      getSchools(),
      getAggregateStats(rubricId, filters),
      getScoreDistribution(rubricId, filters),
      getPercentileBands(rubricId, filters),
      getSubScoreAverages(rubricId, filters),
      getPeopleByRubric(rubricId, filters),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {rubric.name}
        </h1>
        {rubric.description && (
          <p className="text-muted-foreground">{rubric.description}</p>
        )}
      </div>

      <FilterBar schools={schools} />

      <StatsCards stats={stats} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="people">People ({people.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SubScoreBarChart data={subScoreAvgs} />
        </TabsContent>

        <TabsContent value="distribution">
          <ScoreDistributionChart data={distribution} />
        </TabsContent>

        <TabsContent value="trends">
          <PercentileBandsChart data={percentiles} />
        </TabsContent>

        <TabsContent value="people">
          <PersonTable people={people} rubricId={rubricId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
