"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Loader2,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { SKILL_COLORS } from "@/lib/constants";
import type { SkillName } from "@/lib/constants";
import { SkillRadarPopulation } from "@/components/charts/skill-radar-population";
import type {
  DistributionBucket,
  RubricGoal,
  ScopedDistribution,
  SubScoreAverage,
  SkillPeriodRow,
  SubScorePeriodRow,
} from "@/lib/types";

// --- Helpers ---

function getBarColor(rangeStart: number) {
  if (rangeStart >= 80) return "hsl(152, 60%, 48%)";
  if (rangeStart >= 60) return "hsl(210, 70%, 55%)";
  if (rangeStart >= 40) return "hsl(45, 85%, 55%)";
  return "hsl(0, 70%, 55%)";
}

function getHeatColor(value: number): string {
  const hue = (value / 100) * 120;
  const sat = 60 + (Math.abs(value - 50) / 50) * 20;
  const light = 46 + (value / 100) * 10;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function getTextColor(value: number): string {
  return value < 35 || value > 75 ? "white" : "hsl(0, 0%, 15%)";
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const width = 64;
  const height = 22;
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const range = max - min || 1;
  const pad = 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const lastVal = values[values.length - 1];
  const cx = width - pad;
  const cy = pad + (1 - (lastVal - min) / range) * (height - pad * 2);

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={2} fill={color} />
    </svg>
  );
}

function TrendArrow({ change }: { change: number }) {
  if (Math.abs(change) < 0.3) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (change > 0) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  return <TrendingDown className="h-3 w-3 text-red-500" />;
}

// --- Sub-components ---

function SkillSubScoreRadar({
  subScores,
  color,
  size = 180,
}: {
  subScores: SubScoreAverage[];
  color: string;
  size?: number;
}) {
  if (subScores.length < 3) return null;

  const radarData = subScores.map((ss) => ({
    name: ss.subScoreName.length > 14 ? ss.subScoreName.slice(0, 12) + "…" : ss.subScoreName,
    fullName: ss.subScoreName,
    value: ss.average,
    fullMark: 100,
  }));

  const config = { value: { label: "Average", color } };

  return (
    <ChartContainer config={config} className="w-full" style={{ height: size }}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
        <defs>
          <linearGradient id={`radarFill-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="hsl(0, 0%, 80%)" strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(0, 0%, 45%)" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => <span>{item.payload.fullName}: {Number(value).toFixed(1)}</span>} />} />
        <Radar
          name="Average"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#radarFill-${color.replace(/[^a-z0-9]/gi, "")})`}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
      </RadarChart>
    </ChartContainer>
  );
}

function Histogram({ data, goalThreshold, height = 200 }: { data: DistributionBucket[]; goalThreshold: number; height?: number }) {
  const config = { count: { label: "Count", color: "hsl(210, 70%, 55%)" } };

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (<span>{Number(value)} ({item.payload.rangeStart}-{item.payload.rangeEnd})</span>)} />} />
        <ReferenceLine x={`${Math.floor(goalThreshold / 5) * 5}`} stroke="hsl(152, 60%, 48%)" strokeWidth={2} strokeDasharray="6 3" />
        <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={28}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.rangeStart)} fillOpacity={entry.rangeStart >= goalThreshold ? 0.9 : 0.35} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function SkillCards({
  skillAvgs,
  skillTrends,
  bySkill,
  goals,
  subScoreAvgs,
  onSelect,
}: {
  skillAvgs: { skillName: string; average: number }[];
  skillTrends: { skillName: string; change: number }[];
  bySkill: ScopedDistribution[];
  goals: RubricGoal;
  subScoreAvgs: SubScoreAverage[];
  onSelect: (skillName: string) => void;
}) {
  const trendMap = new Map(skillTrends.map((t) => [t.skillName, t.change]));
  const distMap = new Map(bySkill.map((d) => [d.key, d]));
  const subScoresBySkill: Record<string, SubScoreAverage[]> = {};
  for (const ss of subScoreAvgs) {
    if (!subScoresBySkill[ss.skillName]) subScoresBySkill[ss.skillName] = [];
    subScoresBySkill[ss.skillName].push(ss);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {skillAvgs.map((skill, i) => {
        const color = SKILL_COLORS[skill.skillName as SkillName] || "hsl(210, 60%, 55%)";
        const change = trendMap.get(skill.skillName) ?? 0;
        const dist = distMap.get(skill.skillName);
        const goalForSkill = goals.skillGoals[skill.skillName] ?? goals.rubricGoal;
        const pctMeeting = dist?.stats.pctMeetingGoal ?? 0;
        const skillSubScores = subScoresBySkill[skill.skillName] ?? [];

        return (
          <motion.div
            key={skill.skillName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg hover:ring-1 hover:ring-primary/30 transition-all"
              onClick={() => onSelect(skill.skillName)}
            >
              <CardHeader className="pb-0 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <CardTitle className="text-sm">{skill.skillName}</CardTitle>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                {/* Mini radar */}
                <SkillSubScoreRadar subScores={skillSubScores} color={color} size={200} />

                {/* Stats row */}
                <div className="flex items-center justify-between px-3 pb-2">
                  <div>
                    <p className="text-2xl font-bold tracking-tight">{skill.average.toFixed(1)}</p>
                    <div className="flex items-center gap-1.5">
                      <TrendArrow change={change} />
                      <span className={`text-xs font-medium ${Math.abs(change) < 0.3 ? "text-muted-foreground" : change > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {change > 0 ? "+" : ""}{change.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={pctMeeting >= 50 ? "default" : "outline"} className="text-xs">
                      {pctMeeting.toFixed(0)}% ≥{goalForSkill.toFixed(0)}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{skillSubScores.length} sub-scores</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function SubScoreHeatmap({
  rows,
  periods,
  skillName,
  goals,
}: {
  rows: SubScorePeriodRow[];
  periods: string[];
  skillName: string;
  goals: RubricGoal;
}) {
  const goalForSkill = goals.skillGoals[skillName] ?? goals.rubricGoal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sub-Score Trends</CardTitle>
        <CardDescription>Performance across assessment periods</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2.5 font-medium w-40 sticky left-0 bg-muted/50 z-10">Sub-Score</th>
                {periods.map((p) => (
                  <th key={p} className="text-center p-2.5 font-medium whitespace-nowrap">
                    {new Date(p).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                  </th>
                ))}
                <th className="text-center p-2.5 font-medium w-20">Trend</th>
                <th className="text-center p-2.5 font-medium w-12">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const change = row.periods.length >= 2
                  ? row.periods[row.periods.length - 1].average - row.periods[0].average
                  : 0;
                const color = SKILL_COLORS[row.skillName as SkillName] || "hsl(210, 60%, 55%)";

                return (
                  <motion.tr
                    key={row.subScoreName}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIdx * 0.03 }}
                    className="border-t hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-2.5 font-medium sticky left-0 bg-background z-10">
                      <span className="truncate">{row.subScoreName}</span>
                    </td>
                    {row.periods.map((p, i) => {
                      const bg = getHeatColor(p.average);
                      const textCol = getTextColor(p.average);
                      const belowGoal = p.average < goalForSkill;
                      return (
                        <td key={i} className="p-1 text-center">
                          <div
                            className="rounded-md px-2 py-1.5 text-xs font-mono font-medium transition-all duration-200 hover:scale-110 hover:shadow-md cursor-default"
                            style={{ backgroundColor: bg, color: textCol }}
                            title={`${row.subScoreName}: ${p.average.toFixed(1)} (${belowGoal ? "below" : "at/above"} goal of ${goalForSkill.toFixed(0)})`}
                          >
                            {p.average.toFixed(1)}
                            {belowGoal && <span className="ml-0.5 opacity-70">•</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2.5 text-center">
                      <Sparkline values={row.periods.map((p) => p.average)} color={color} />
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendArrow change={change} />
                        <span className={`text-xs font-medium ${Math.abs(change) < 0.3 ? "text-muted-foreground" : change > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {change > 0 ? "+" : ""}{change.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SubScoreBarChartInline({ data, color }: { data: SubScoreAverage[]; color: string }) {
  const overallAvg = data.length > 0 ? data.reduce((sum, d) => sum + d.average, 0) / data.length : 0;
  const config = { average: { label: "Average", color } };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sub-Score Averages</CardTitle>
        <CardDescription>
          {data.length} sub-scores (avg: {overallAvg.toFixed(1)})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="w-full" style={{ height: Math.max(200, data.length * 36) }}>
          <BarChart data={data} layout="vertical" margin={{ left: 130, right: 20 }} accessibilityLayer>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis type="category" dataKey="subScoreName" tickLine={false} axisLine={false} width={120} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => <span className="font-medium">{Number(value).toFixed(1)}</span>} />} />
            <ReferenceLine x={overallAvg} stroke="hsl(0, 0%, 60%)" strokeDasharray="4 4" label={{ value: "Avg", position: "top", fontSize: 10 }} />
            <Bar dataKey="average" radius={[0, 6, 6, 0]} maxBarSize={20}>
              {data.map((_, index) => (
                <Cell key={index} fill={color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function DrillDistributions({ data }: { data: ScopedDistribution[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((dist, i) => (
        <motion.div key={dist.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{dist.key}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">μ {dist.stats.mean.toFixed(1)}</Badge>
                  <Badge variant={dist.stats.pctMeetingGoal >= 50 ? "default" : "outline"} className="text-xs">
                    {dist.stats.pctMeetingGoal.toFixed(0)}% ≥{dist.stats.goalThreshold}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <Histogram data={dist.buckets} goalThreshold={dist.stats.goalThreshold} height={180} />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// --- Main Component ---

interface SkillsViewProps {
  rubricId: string;
  goals: RubricGoal;
  skillAvgs: { skillName: string; average: number }[];
  skillTrends: { skillName: string; change: number }[];
  subScoreAvgs: SubScoreAverage[];
  bySkill: ScopedDistribution[];
  skillMatrix: SkillPeriodRow[];
  subScoreMatrix: SubScorePeriodRow[];
}

export function SkillsView({
  rubricId,
  goals,
  skillAvgs,
  skillTrends,
  subScoreAvgs,
  bySkill,
  skillMatrix,
  subScoreMatrix,
}: SkillsViewProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [drillData, setDrillData] = useState<ScopedDistribution[] | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const searchParams = useSearchParams();

  const fetchDrill = useCallback(async (skillName: string) => {
    setDrillLoading(true);
    setDrillData(null);
    const qp = new URLSearchParams();
    qp.set("scope", "skill");
    qp.set("key", skillName);
    const group = searchParams.get("group");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (group) qp.set("group", group);
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);
    try {
      const res = await fetch(`/api/distribution/${rubricId}/drill?${qp.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: ScopedDistribution[] = await res.json();
      setDrillData(data);
    } catch {
      setDrillData([]);
    } finally {
      setDrillLoading(false);
    }
  }, [rubricId, searchParams]);

  const handleSelect = useCallback((skillName: string) => {
    setSelectedSkill(skillName);
    fetchDrill(skillName);
  }, [fetchDrill]);

  const handleBack = useCallback(() => {
    setSelectedSkill(null);
    setDrillData(null);
  }, []);

  // Data for the selected skill
  const selectedAvg = skillAvgs.find((s) => s.skillName === selectedSkill);
  const selectedTrend = skillTrends.find((t) => t.skillName === selectedSkill);
  const selectedSubScores = subScoreAvgs.filter((ss) => ss.skillName === selectedSkill);
  const selectedSubScoreMatrix = subScoreMatrix.filter((r) => r.skillName === selectedSkill);
  const selectedColor = selectedSkill ? (SKILL_COLORS[selectedSkill as SkillName] || "hsl(210, 60%, 55%)") : "";
  const goalForSkill = selectedSkill ? (goals.skillGoals[selectedSkill] ?? goals.rubricGoal) : goals.rubricGoal;
  const selectedDist = selectedSkill ? bySkill.find((d) => d.key === selectedSkill) : null;

  // Periods from skill matrix
  const allPeriods = skillMatrix.length > 0 ? skillMatrix[0].periods.map((p) => p.date) : [];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Breadcrumb */}
      {selectedSkill && (
        <div className="flex items-center gap-1 text-sm">
          <button onClick={handleBack} className="text-primary hover:underline font-medium">All Skills</button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedColor }} />
            {selectedSkill}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!selectedSkill ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Overall radar + Per-skill radar cards */}
            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
              <SkillRadarPopulation data={skillAvgs} trends={skillTrends} />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Per-Skill Profiles</h3>
                <SkillCards
                  skillAvgs={skillAvgs}
                  skillTrends={skillTrends}
                  bySkill={bySkill}
                  goals={goals}
                  subScoreAvgs={subScoreAvgs}
                  onSelect={handleSelect}
                />
              </div>
            </div>

            {/* All sub-scores bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Sub-Score Averages</CardTitle>
                <CardDescription>
                  {subScoreAvgs.length} sub-scores across {skillAvgs.length} skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ average: { label: "Average", color: "hsl(210, 70%, 55%)" } }}
                  className="w-full"
                  style={{ height: Math.max(300, subScoreAvgs.length * 28) }}
                >
                  <BarChart
                    data={[...subScoreAvgs].sort((a, b) => b.average - a.average)}
                    layout="vertical"
                    margin={{ left: 130, right: 20 }}
                    accessibilityLayer
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis type="category" dataKey="subScoreName" tickLine={false} axisLine={false} width={120} tick={{ fontSize: 11 }} />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value, _name, item) => (
                        <span className="font-medium">{item.payload.skillName}: {Number(value).toFixed(1)}</span>
                      )} />}
                    />
                    <ReferenceLine
                      x={goals.rubricGoal}
                      stroke="hsl(152, 60%, 48%)"
                      strokeDasharray="6 3"
                      label={{ value: `Standard (${goals.rubricGoal})`, position: "top", fontSize: 10, fill: "hsl(152, 60%, 38%)" }}
                    />
                    <Bar dataKey="average" radius={[0, 6, 6, 0]} maxBarSize={18}>
                      {[...subScoreAvgs].sort((a, b) => b.average - a.average).map((entry, index) => (
                        <Cell key={index} fill={SKILL_COLORS[entry.skillName as SkillName] || "hsl(210, 60%, 55%)"} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={`drill-${selectedSkill}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Skill header */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedColor }} />
                    <div>
                      <h3 className="text-lg font-semibold">{selectedSkill}</h3>
                      <p className="text-sm text-muted-foreground">{selectedSubScores.length} sub-scores</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedAvg?.average.toFixed(1) ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Average</p>
                    </div>
                    {selectedTrend && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendArrow change={selectedTrend.change} />
                          <span className={`text-lg font-bold ${Math.abs(selectedTrend.change) < 0.3 ? "text-muted-foreground" : selectedTrend.change > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {selectedTrend.change > 0 ? "+" : ""}{selectedTrend.change.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Change</p>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-4 w-4 text-emerald-500" />
                        <span className="text-lg font-bold">{goalForSkill.toFixed(0)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Standard</p>
                    </div>
                    {selectedDist && (
                      <div className="text-center">
                        <p className={`text-lg font-bold ${selectedDist.stats.pctMeetingGoal >= 50 ? "text-emerald-600" : "text-amber-600"}`}>
                          {selectedDist.stats.pctMeetingGoal.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Meeting</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Large radar for the selected skill */}
            {selectedSubScores.length >= 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sub-Score Profile</CardTitle>
                  <CardDescription>Radar view of {selectedSubScores.length} sub-scores within {selectedSkill}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SkillSubScoreRadar subScores={selectedSubScores} color={selectedColor} size={350} />
                </CardContent>
              </Card>
            )}

            {/* Sub-score distributions */}
            {drillLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading sub-score distributions...</span>
                </CardContent>
              </Card>
            ) : drillData && drillData.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sub-Score Distributions</h4>
                <DrillDistributions data={drillData} />
              </div>
            ) : null}

            {/* Sub-score heatmap over time */}
            {selectedSubScoreMatrix.length > 0 && allPeriods.length > 0 && (
              <SubScoreHeatmap
                rows={selectedSubScoreMatrix}
                periods={allPeriods}
                skillName={selectedSkill}
                goals={goals}
              />
            )}

            {/* Sub-score bar chart */}
            {selectedSubScores.length > 0 && (
              <SubScoreBarChartInline data={selectedSubScores} color={selectedColor} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
