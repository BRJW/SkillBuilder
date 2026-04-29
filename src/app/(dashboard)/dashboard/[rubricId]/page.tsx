export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRubricById } from "@/lib/queries/rubrics";
import { getGroups } from "@/lib/queries/groups";
import {
  getAggregateStats,
  getStepDistribution,
  getPercentileBands,
  getSubScoreAverages,
  getSkillAverages,
  getGroupTrends,
  getSkillTrends,
  getTopBottomPerformers,
  getDistributionTrend,
  getSkillPeriodMatrix,
  getSubScorePeriodMatrix,
  getGoalAttainment,
} from "@/lib/queries/steps";
import { getPeopleByRubric } from "@/lib/queries/people";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { StatsCards } from "@/components/charts/stats-cards";
import { StepDistributionChart } from "@/components/charts/step-distribution-chart";
import { SubScoreBarChart } from "@/components/charts/sub-score-bar-chart";
import { SkillRadarPopulation } from "@/components/charts/skill-radar-population";
import { GroupComparisonChart } from "@/components/charts/group-comparison-chart";
import { TopBottomChart } from "@/components/charts/top-bottom-chart";
import { PersonTable } from "@/components/people/person-table";
import { TrendsView } from "@/components/dashboard/trends-view";
import type { DashboardFilters } from "@/lib/types";

export default async function RubricDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ rubricId: string }>;
  searchParams: Promise<{ group?: string; from?: string; to?: string }>;
}) {
  const { rubricId } = await params;
  const sp = await searchParams;

  const rubric = await getRubricById(rubricId);
  if (!rubric) notFound();

  const filters: DashboardFilters = {
    groupIds: sp.group ? [sp.group] : undefined,
    dateFrom: sp.from,
    dateTo: sp.to,
  };

  const [
    groups,
    stats,
    distribution,
    percentiles,
    subScoreAvgs,
    skillAvgs,
    groupTrends,
    skillTrends,
    topBottom,
    people,
    distributionTrend,
    skillMatrix,
    subScoreMatrix,
    goalAttainment,
  ] = await Promise.all([
    getGroups(),
    getAggregateStats(rubricId, filters),
    getStepDistribution(rubricId, filters),
    getPercentileBands(rubricId, filters),
    getSubScoreAverages(rubricId, filters),
    getSkillAverages(rubricId, filters),
    getGroupTrends(rubricId, filters),
    getSkillTrends(rubricId, filters),
    getTopBottomPerformers(rubricId, filters),
    getPeopleByRubric(rubricId, filters),
    getDistributionTrend(rubricId, filters),
    getSkillPeriodMatrix(rubricId, filters),
    getSubScorePeriodMatrix(rubricId, filters),
    getGoalAttainment(rubricId, filters),
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

      <FilterBar groups={groups} />

      <StatsCards stats={stats} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="people">People ({people.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SkillRadarPopulation data={skillAvgs} trends={skillTrends} />
            <TopBottomChart top={topBottom.top} bottom={topBottom.bottom} />
          </div>
          <SubScoreBarChart data={subScoreAvgs} />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsView
            percentiles={percentiles}
            skillMatrix={skillMatrix}
            subScoreMatrix={subScoreMatrix}
            goalAttainment={goalAttainment}
          />
        </TabsContent>

        <TabsContent value="distribution">
          <StepDistributionChart data={distribution} distributionTrend={distributionTrend} />
        </TabsContent>

        <TabsContent value="groups">
          <GroupComparisonChart data={groupTrends} />
        </TabsContent>

        <TabsContent value="people">
          <PersonTable people={people} rubricId={rubricId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
