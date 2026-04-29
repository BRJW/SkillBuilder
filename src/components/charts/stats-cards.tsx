import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RubricStats } from "@/lib/types";
import { Users, TrendingUp, BarChart3, Target } from "lucide-react";

export function StatsCards({ stats }: { stats: RubricStats }) {
  const cards = [
    {
      title: "Completion Rate",
      value: `${Math.round(stats.completionRate)}%`,
      subtitle: `${stats.scoredPeople} of ${stats.totalPeople} people`,
      icon: Users,
    },
    {
      title: "Mean Score",
      value: stats.mean.toFixed(1),
      subtitle: `Median: ${stats.median.toFixed(1)}`,
      icon: BarChart3,
    },
    {
      title: "90th Percentile",
      value: stats.p90.toFixed(1),
      subtitle: `75th: ${stats.p75.toFixed(1)}`,
      icon: TrendingUp,
    },
    {
      title: "10th Percentile",
      value: stats.p10.toFixed(1),
      subtitle: `25th: ${stats.p25.toFixed(1)}`,
      icon: Target,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
